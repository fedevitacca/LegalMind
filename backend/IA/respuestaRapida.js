const TITULOS = {
  resumen_expediente: "Resumen rápido del expediente",
  comparar_documentos: "Comparación documental",
  comparar_imputados: "Pasajes de las fichas de imputados",
  comparar_jurisprudencia: "Comparación de fallos",
  cronologia: "Cronología y fechas relevantes",
  consulta_rag: "Respuesta basada en el expediente",
  teoria_del_caso: "Teoría del caso provisional",
};

function construirResultadoRapido({ toolId: idHerramienta, chunks: fragmentos = [], query: consulta = "", scopeLabel: etiquetaAlcance = "las fuentes seleccionadas" }) {
  const pasajes = idHerramienta.startsWith("comparar_")
    ? [...new Set(fragmentos.map((fragmento) => fragmento.document_id))].flatMap((id) => seleccionarPasajes(fragmentos.filter((fragmento) => fragmento.document_id === id), consulta, 2))
    : seleccionarPasajes(fragmentos, consulta, idHerramienta === "cronologia" ? 6 : 5);
  const puntos = pasajes.map((elemento) => `${elemento.documentName}: ${elemento.text}`);
  const mensajeVacio = `No se encontró información suficiente en ${etiquetaAlcance} para responder con respaldo.`;

  if (!puntos.length) {
    return {
      titulo: TITULOS[idHerramienta] || "Análisis documental",
      conclusion: mensajeVacio,
      puntos_clave: [mensajeVacio],
      desarrollo: [
        { titulo: "Resultado de la búsqueda", contenido: mensajeVacio },
        { titulo: "Alcance", contenido: "No se agregaron datos externos ni se completaron vacíos por inferencia." },
      ],
      acciones_sugeridas: ["Reformular la consulta o incorporar documentación con texto extraíble."],
      limitaciones: ["La respuesta se limita al material disponible."],
    };
  }

  const conclusion = construirConclusion(idHerramienta, pasajes, etiquetaAlcance);
  return {
    titulo: TITULOS[idHerramienta] || "Análisis documental",
    conclusion,
    puntos_clave: puntos.slice(0, 5),
    desarrollo: construirSecciones(idHerramienta, pasajes, consulta),
    acciones_sugeridas: construirAcciones(idHerramienta),
    limitaciones: [
      "Respuesta extractiva rápida: verifique los pasajes citados antes de incorporarla a una presentación.",
    ],
  };
}

function seleccionarPasajes(fragmentos, consulta, limite) {
  const terminosConsulta = separarTerminos(consulta);
  const candidatos = [];

  for (const fragmento of fragmentos) {
    for (const oracion of separarOraciones(fragmento.text)) {
      if (oracion.length < 18) continue;
      const terminosOracion = separarTerminos(oracion);
      const calcularCoincidencia = terminosConsulta.filter((termino) => terminosOracion.includes(termino)).length;
      const bonificacionFecha = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}\b/i.test(oracion) ? 0.25 : 0;
      candidatos.push({
        documentName: fragmento.document_name || "Fuente",
        text: limitarTexto(oracion, 52),
        score: Number(fragmento.score || 0) + calcularCoincidencia * 0.35 + bonificacionFecha,
      });
    }
  }

  return candidatos
    .sort((izquierda, derecha) => derecha.score - izquierda.score)
    .filter((elemento, indice, elementos) => elementos.findIndex((otro) => normalizar(otro.text) === normalizar(elemento.text)) === indice)
    .slice(0, limite);
}

function construirConclusion(idHerramienta, pasajes, etiquetaAlcance) {
  const primero = pasajes[0];
  const segundo = pasajes.find((elemento) => elemento.documentName !== primero.documentName) || pasajes[1];
  const textoUnido = [primero, segundo]
    .filter(Boolean)
    .map((elemento) => `${elemento.documentName} indica que ${iniciarEnMinuscula(elemento.text)}`)
    .join(" ");

  if (idHerramienta === "consulta_rag") return `Según ${etiquetaAlcance}, ${iniciarEnMinuscula(textoUnido)}`;
  if (idHerramienta === "cronologia") return `Se localizaron ${pasajes.length} referencias temporales o procesales relevantes. ${textoUnido}`;
  if (idHerramienta.startsWith("comparar_")) {
    return `La comparación rápida identificó los siguientes pasajes centrales. ${textoUnido}`;
  }
  if (idHerramienta === "teoria_del_caso") return `Como base provisional de trabajo, ${iniciarEnMinuscula(textoUnido)}`;
  return `La síntesis de ${etiquetaAlcance} muestra que ${iniciarEnMinuscula(textoUnido)}`;
}

function construirSecciones(idHerramienta, pasajes, consulta) {
  if (idHerramienta.startsWith("comparar_")) {
    return [
      ...[...new Set(pasajes.map((elemento) => elemento.documentName))].map((nombre) => ({
        titulo: nombre,
        contenido: pasajes.filter((elemento) => elemento.documentName === nombre).map((elemento) => elemento.text).join("\n"),
      })),
      { titulo: "Alcance de la extracción", contenido: "Estos son pasajes de ambas fuentes. La extracción no determina por sí sola coincidencias, contradicciones ni conclusiones jurídicas." },
    ];
  }
  const puntoMedio = Math.max(1, Math.ceil(pasajes.length / 2));
  const primero = pasajes.slice(0, puntoMedio).map(formatearPasaje).join("\n");
  const segundo = pasajes.slice(puntoMedio).map(formatearPasaje).join("\n") || "No surgieron otros pasajes distintos con igual nivel de pertinencia.";
  const etiquetas = idHerramienta === "cronologia"
    ? ["Hitos localizados", "Controles temporales"]
    : idHerramienta.startsWith("comparar_")
      ? ["Fuente y coincidencias", "Diferencias para revisar"]
      : idHerramienta === "teoria_del_caso"
        ? ["Base fáctica", "Aspectos por contrastar"]
      : idHerramienta === "consulta_rag"
          ? ["Respuesta documental", "Contexto relacionado"]
          : ["Información central", "Contexto complementario"];

  return [
    { titulo: etiquetas[0], contenido: primero },
    { titulo: etiquetas[1], contenido: segundo + (consulta ? `\nConsulta aplicada: ${limitarTexto(consulta, 35)}` : "") },
  ];
}

function construirAcciones(idHerramienta) {
  if (idHerramienta === "cronologia") return ["Confirmar cada fecha contra la actuación original y controlar el punto de inicio de los plazos."];
  if (idHerramienta.startsWith("comparar_")) return ["Revisar ambas fuentes completas antes de calificar una diferencia como contradicción material."];
  if (idHerramienta === "teoria_del_caso") return ["Separar hechos acreditados, inferencias e hipótesis al definir la estrategia."];
  return ["Abrir las fuentes citadas y comprobar el contexto completo de los pasajes relevantes."];
}

function formatearPasaje(elemento) {
  return `${elemento.documentName}: ${elemento.text}`;
}

function separarOraciones(valor) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((elemento) => elemento.trim()).filter(Boolean) || [];
}

function separarTerminos(valor) {
  return normalizar(valor).split(/[^a-z0-9áéíóúñ]+/).filter((termino) => termino.length > 2);
}

function normalizar(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function limitarTexto(valor, maximoPalabras) {
  const palabras = String(valor || "").trim().split(/\s+/);
  return palabras.length <= maximoPalabras ? palabras.join(" ") : `${palabras.slice(0, maximoPalabras).join(" ")}…`;
}

function iniciarEnMinuscula(valor) {
  return valor ? valor[0].toLowerCase() + valor.slice(1) : valor;
}

module.exports = { construirResultadoRapido, seleccionarPasajes };
