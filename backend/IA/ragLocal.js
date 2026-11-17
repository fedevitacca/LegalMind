const PALABRAS_IGNORADAS = new Set([
  "a",
  "al",
  "ante",
  "con",
  "de",
  "del",
  "e",
  "el",
  "en",
  "es",
  "la",
  "las",
  "lo",
  "los",
  "para",
  "por",
  "que",
  "se",
  "sin",
  "su",
  "un",
  "una",
  "y",
]);

const { ampliarConsultaJuridica } = require("./terminologiaRag");

function buscarFragmentosRelevantes(documentos, pregunta, maximoFragmentos = 5) {
  const fragmentos = documentos.flatMap((documento) => crearFragmentos(documento));
  if (!fragmentos.length) return [];
  const preguntaAmpliada = ampliarConsultaJuridica(pregunta);
  const terminosConsulta = separarTerminos(preguntaAmpliada);
  const terminosDocumento = fragmentos.map((fragmento) => separarTerminos(fragmento.text));
  const longitudPromedio = terminosDocumento.reduce((suma, terminos) => suma + terminos.length, 0) / fragmentos.length;
  const fragmentosPuntuados = fragmentos.map((fragmento, indice) => {
    const lexico = bm25(terminosConsulta, terminosDocumento[indice], terminosDocumento, longitudPromedio);
    const semantico = similitudDeTrigramas(pregunta, fragmento.text);
    return { ...fragmento, lexical_score: lexico, semantic_score: semantico, score: lexico * 0.65 + semantico * 0.35 };
  }).filter((fragmento) => fragmento.score > 0).sort((primero, segundo) => segundo.score - primero.score);

  // Maximal Marginal Relevance evita devolver fragmentos casi duplicados.
  const seleccionados = [];
  while (seleccionados.length < Math.max(1, maximoFragmentos) && fragmentosPuntuados.length) {
    let mejorIndice = 0;
    let mejorPuntaje = -Infinity;
    fragmentosPuntuados.forEach((candidato, indice) => {
      const redundancia = seleccionados.length ? Math.max(...seleccionados.map((elemento) => similitudDeTrigramas(candidato.text, elemento.text))) : 0;
      const mmr = 0.78 * candidato.score - 0.22 * redundancia;
      if (mmr > mejorPuntaje) { mejorPuntaje = mmr; mejorIndice = indice; }
    });
    seleccionados.push({ ...fragmentosPuntuados.splice(mejorIndice, 1)[0], mmr_score: Math.max(0, mejorPuntaje) });
  }
  const maximo = Math.max(...seleccionados.map((elemento) => elemento.score), 1);
  return seleccionados.map((elemento) => ({ ...elemento, score: Math.min(1, elemento.score / maximo) }));
}

function bm25(consulta, documento, corpus, longitudPromedio, k1 = 1.5, segundo = 0.75) {
  if (!consulta.length || !documento.length) return 0;
  return [...new Set(consulta)].reduce((puntaje, termino) => {
    const frecuencia = documento.filter((token) => token === termino).length;
    if (!frecuencia) return puntaje;
    const coincidenciaContenida = corpus.filter((terminos) => terminos.includes(termino)).length;
    const idf = Math.log(1 + (corpus.length - coincidenciaContenida + 0.5) / (coincidenciaContenida + 0.5));
    return puntaje + idf * (frecuencia * (k1 + 1)) / (frecuencia + k1 * (1 - segundo + segundo * documento.length / Math.max(longitudPromedio, 1)));
  }, 0);
}

function similitudDeTrigramas(izquierda, derecha) {
  const construir = (valor) => new Set(`  ${normalizarEspacios(valor).toLowerCase()}  `.match(/.{1,3}/g) || []);
  const primero = construir(izquierda); const segundo = construir(derecha);
  if (!primero.size || !segundo.size) return 0;
  const interseccion = [...primero].filter((elemento) => segundo.has(elemento)).length;
  return (2 * interseccion) / (primero.size + segundo.size);
}

function construirRespuestaExtractiva(pregunta, fragmentos) {
  if (!fragmentos.length) {
    return {
      answer:
        "No se encontraron fragmentos suficientes en los documentos de la causa para responder con respaldo.",
      confidence: "bajo",
    };
  }

  const oracionesSeleccionadas = fragmentos
    .flatMap((fragmento) => separarOraciones(fragmento.text).slice(0, 2))
    .slice(0, 4);

  return {
    answer: oracionesSeleccionadas.join(" "),
    confidence: fragmentos[0].score >= 0.35 ? "medio" : "bajo",
    question: pregunta,
  };
}

function extraerDatosBasicosDelExpediente(texto) {
  const textoNormalizado = normalizarEspacios(texto);
  const imputados = extraerPersonasPorRol(textoNormalizado, [
    "imputado",
    "imputada",
    "procesado",
    "procesada",
    "acusado",
    "acusada",
  ]);
  const victimas = extraerPersonasPorRol(textoNormalizado, [
    "victima",
    "damnificado",
    "damnificada",
  ]);
  const fechas = extraerFechas(textoNormalizado);
  const audiencias = buscarOracionesPorPalabrasClave(textoNormalizado, ["audiencia", "indagatoria", "debate"]);
  const vencimientos = buscarOracionesPorPalabrasClave(textoNormalizado, ["vencimiento", "plazo", "debera presentar", "hasta el"]);

  return {
    numero_causa: buscarPrimeraCoincidencia(textoNormalizado, [
      /\b(?:causa|expediente|legajo)\s*(?:n(?:ro|o|um|\.|º)?\.?|numero)?\s*[:#-]?\s*([A-Z]?\s*\d{1,8}(?:[/-]\d{2,4})?)/i,
      /\b(?:n(?:ro|o|um|\.|º)?\.?|numero)\s*[:#-]?\s*([A-Z]?\s*\d{1,8}(?:[/-]\d{2,4})?)/i,
    ]),
    caratula: buscarPrimeraCoincidencia(textoNormalizado, [
      /\bcaratula\s*[:#-]\s*([^.\n;]+)/i,
      /\bautos\s*[:#-]\s*([^.\n;]+)/i,
    ]),
    tribunal: buscarPrimeraCoincidencia(textoNormalizado, [
      /\b((?:juzgado|tribunal|camara|fiscalia|unidad fiscal|secretaria)\s+[^.\n;]+)/i,
    ]),
    cantidad_imputados: imputados.length,
    imputados: imputados,
    victimas: victimas,
    delitos: extraerDelitos(textoNormalizado),
    fechas_relevantes: fechas,
    audiencias_o_actos: audiencias,
    vencimientos_o_plazos: vencimientos,
    documentos_mencionados: extraerDocumentosMencionados(textoNormalizado),
    confianza: medirConfianzaDeExtraccion({
      dates: fechas,
      defendants: imputados,
      normalizedText: textoNormalizado,
    }),
  };
}

function crearFragmentos(documento) {
  const oraciones = separarOraciones(documento.texto_extraido || "");
  const fragmentos = [];

  for (let indice = 0; indice < oraciones.length; indice += 4) {
    const texto = oraciones.slice(indice, indice + 4).join(" ");

    if (texto.trim()) {
      fragmentos.push({
        document_id: documento.id,
        document_name: documento.nombre_archivo,
        chunk_index: fragmentos.length,
        text: texto,
        metadata: documento.metadata || null,
      });
    }
  }

  return fragmentos;
}

function normalizarEspacios(texto) {
  return String(texto || "").replace(/\s+/g, " ").trim();
}

function buscarPrimeraCoincidencia(texto, patrones) {
  for (const patron of patrones) {
    const coincidencia = texto.match(patron);

    if (coincidencia?.[1]) {
      return limpiarValor(coincidencia[1]);
    }
  }

  return null;
}

function extraerPersonasPorRol(texto, roles) {
  const patronDeRol = roles.join("|");
  const patrones = [
    new RegExp(`\\b(?:${patronDeRol})\\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,3})`, "gi"),
    new RegExp(`\\b([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){1,3})\\s*,?\\s*(?:${patronDeRol})\\b`, "gi"),
  ];

  return obtenerValoresUnicos(patrones.flatMap((patron) => reunirCoincidencias(texto, patron)))
    .map(limpiarNombreDePersona)
    .filter(Boolean);
}

function extraerFechas(texto) {
  const fechasNumericas = reunirCoincidencias(texto, /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g);
  const fechasEnTexto = reunirCoincidencias(
    texto,
    /\b(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})\b/gi
  );

  return obtenerValoresUnicos([...fechasNumericas, ...fechasEnTexto]);
}

function extraerDelitos(texto) {
  return obtenerValoresUnicos(reunirCoincidencias(
    texto,
    /\b(?:delito de|por|por el delito de|se le atribuye el delito de)\s+([a-záéíóúñ ]{4,60}?)(?:\.|,|;|\s+y\s+|\s+en\s+)/gi
  )).map(limpiarValor);
}

function extraerDocumentosMencionados(texto) {
  return obtenerValoresUnicos(reunirCoincidencias(
    texto,
    /\b((?:informe|acta|pericia|oficio|declaracion|resolucion|sentencia|requerimiento|dictamen)[^.;]{0,80})/gi
  )).map(limpiarValor);
}

function buscarOracionesPorPalabrasClave(texto, palabrasClave) {
  return separarOraciones(texto).filter((oracion) =>
    palabrasClave.some((palabraClave) => oracion.toLowerCase().includes(palabraClave))
  );
}

function reunirCoincidencias(texto, patron) {
  return [...texto.matchAll(patron)].map((coincidencia) => coincidencia[1]).filter(Boolean);
}

function obtenerValoresUnicos(valores) {
  return [...new Set(valores.map(limpiarValor).filter(Boolean))];
}

function limpiarValor(valor) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\s-]+|[,;:\s-]+$/g, "")
    .trim();
}

function limpiarNombreDePersona(valor) {
  const prefijoNombre = limpiarValor(valor).split(/\b(?:declaro|declaró|fue|debera|deberá|debe|comparecio|compareció|cito|citó)\b/i)[0];
  const palabrasIgnoradas = new Set([
    "citada",
    "citado",
    "debe",
    "debera",
    "fue",
    "imputada",
    "imputado",
    "la",
    "le",
    "el",
    "se",
  ]);
  const palabras = prefijoNombre
    .split(" ")
    .filter((palabra) => !palabrasIgnoradas.has(palabra.toLowerCase()));

  return limpiarValor(palabras.join(" "));
}

function medirConfianzaDeExtraccion({ dates: fechas, defendants: imputados, normalizedText: textoNormalizado }) {
  const indicios = [
    /\b(?:causa|expediente|legajo)\b/i.test(textoNormalizado),
    /\b(?:juzgado|tribunal|camara|fiscalia)\b/i.test(textoNormalizado),
    imputados.length > 0,
    fechas.length > 0,
  ].filter(Boolean).length;

  if (indicios >= 3) {
    return "medio";
  }

  if (indicios >= 1) {
    return "bajo";
  }

  return "muy_bajo";
}

function separarOraciones(texto) {
  return String(texto || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;:])\s+/)
    .map((oracion) => oracion.trim())
    .filter(Boolean);
}

function vectorizar(texto) {
  return separarTerminos(texto).reduce((vector, token) => {
    vector[token] = (vector[token] || 0) + 1;
    return vector;
  }, {});
}

function separarTerminos(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]{3,}/g)
    ?.map(reducirTerminoARaiz)
    .filter((token) => !PALABRAS_IGNORADAS.has(token)) || [];
}

function reducirTerminoARaiz(token) {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function similitudCoseno(izquierda, derecha) {
  const clavesIzquierda = Object.keys(izquierda);
  const clavesDerecha = Object.keys(derecha);

  if (!clavesIzquierda.length || !clavesDerecha.length) {
    return 0;
  }

  const productoEscalar = clavesIzquierda.reduce((puntaje, clave) => puntaje + (izquierda[clave] || 0) * (derecha[clave] || 0), 0);
  const normaIzquierda = Math.sqrt(clavesIzquierda.reduce((suma, clave) => suma + izquierda[clave] ** 2, 0));
  const normaDerecha = Math.sqrt(clavesDerecha.reduce((suma, clave) => suma + derecha[clave] ** 2, 0));

  return productoEscalar / (normaIzquierda * normaDerecha);
}

module.exports = {
  construirRespuestaExtractiva,
  extraerDatosBasicosDelExpediente,
  buscarFragmentosRelevantes,
};
