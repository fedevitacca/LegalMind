const { generarRespuestaEstructuradaDelChat, generarRespuestaLibreDelChat,
  generarEmbeddingsDeTextos, obtenerConfiguracionDeIA } = require("../../IA/analizadorLocal");
const { crearDocumentosDelContexto } = require("../../IA/contextoExpediente");
const { buscarFragmentosRelevantes } = require("../../IA/ragLocal");
const { ampliarConsultaJuridica } = require("../../IA/terminologiaRag");
const { construirRespuestaConEvidencia } = require("../../IA/respuestaJuridicaExtractiva");
const { obtenerHerramienta } = require("../../IA/motorHerramientas");
const { listarDocumentosDelExpediente } = require("../modelos/repositorioIA");
const { listDatesByCase: listarFechasDelExpediente, listDefendantsByCase: listarImputadosDelExpediente, listJurisprudenceByCase: listarJurisprudenciaDelExpediente } = require("../modelos/repositorioCasos");
const { listCaseRecords: listarRegistrosDelExpediente, listTasks: listarTareas } = require("../modelos/repositorioTrabajoJuridico");
const { buscarNormativaOficial } = require("../modelos/repositorioBibliotecaJuridica");
const { buscarFragmentosDeFormaHibrida } = require("../modelos/repositorioRagVectorial");
const { evaluarEvidencia, construirCitasJuridicas } = require("./citasJuridicas");
const { construirTablaDeEvidencia, obtenerColumnasDeTabla, leerTablaChat } = require("./tablaChat");

const IDS_HERRAMIENTAS_CHAT = new Set([
  "resumen_expediente",
  "comparar_documentos",
  "comparar_imputados",
  "comparar_jurisprudencia",
  "cronologia",
  "teoria_del_caso",
]);

async function responderChatExpediente({
  idOrganizacion,
  idExpediente,
  pregunta,
  historial = [],
  idHerramienta = null,
  parametrosHerramienta = {},
  formatoRespuesta = "text",
}) {
  const inicioMs = Date.now();
  const respuestaDirecta = responderIntencionConversacional(pregunta);
  if (respuestaDirecta) return { respuesta: respuestaDirecta.respuesta, consultaDeBusqueda: pregunta, citas: [],
    metadatos: { engine: "deterministic_conversation", tool_id: null, model: null,
      evidence: { status: "no_requerido", requires_human_review: false, citations_count: 0 },
      suggested_questions: respuestaDirecta.preguntasSugeridas, limitations: [], case_chunks: 0, legal_chunks: 0,
      conversation_messages_used: Math.min(historial.length, 8), duration_ms: Date.now() - inicioMs, fallback_reason: null } };
  const consultaDeBusqueda = construirConsultaConHistorial(pregunta, historial);
  const [documentos, imputados, documentosDelContexto, jurisprudencia] = await Promise.all([
    listarDocumentosDelExpediente(idExpediente),
    listarImputadosDelExpediente(idExpediente),
    cargarContextoEstructurado(idOrganizacion, idExpediente),
    listarJurisprudenciaDelExpediente(idExpediente),
  ]);
  const herramientaElegida = IDS_HERRAMIENTAS_CHAT.has(idHerramienta) ? obtenerHerramienta(idHerramienta) : null;
  const entradaHerramienta = herramientaElegida
    ? prepararEntradaHerramienta({ idHerramienta, parametrosHerramienta, documentos, imputados, jurisprudencia, pregunta })
    : null;
  const corpus = [crearFichaDelExpediente(idExpediente, imputados), ...documentosDelContexto, ...documentos];
  const consultaLexica = idHerramienta === "resumen_expediente"
    ? `${consultaDeBusqueda} hechos principales denuncia origen investigación hallazgo situación actual próxima audiencia`
    : consultaDeBusqueda;
  const fragmentosLexicos = buscarFragmentosRelevantes(corpus, consultaLexica, 12)
    .map((fragmento) => ({ ...fragmento, source_type: fragmento.metadata?.source_type || "expediente" }));

  let embeddingConsulta = null;
  try { [embeddingConsulta] = await generarEmbeddingsDeTextos([ampliarConsultaJuridica(consultaDeBusqueda)], { timeoutMs: 1800 }); }
  catch (error) { console.warn("Chat sin embeddings de consulta:", error.message); }

  let fragmentosSemanticos = [];
  if (embeddingConsulta) {
    try {
      const fragmentosGuardados = await buscarFragmentosDeFormaHibrida({ organizationId: idOrganizacion, caseId: idExpediente, query: consultaDeBusqueda, queryEmbedding: embeddingConsulta, limit: 12 });
      fragmentosSemanticos = fragmentosGuardados.map((elemento) => ({ id: elemento.id, document_id: elemento.documento_id,
        document_name: elemento.nombre_archivo, chunk_index: elemento.orden, page: elemento.pagina,
        text: elemento.texto, score: Number(elemento.score), lexical_score: Number(elemento.lexical_score),
        semantic_score: Number(elemento.semantic_score), metadata: elemento.metadata_json, source_type: "expediente" }));
    } catch (error) { console.warn("Chat sin indice vectorial persistido:", error.message); }
  }
  const fragmentosOrdenadosDelExpediente = fusionarResultados(fragmentosLexicos, fragmentosSemanticos, 7);
  const fragmentosExpediente = idHerramienta === "resumen_expediente"
    ? combinarFragmentosHerramienta(
      buscarFragmentosRelevantes(documentos, "denuncia inicial inventario faltante hechos que originaron la investigación", 2),
      fragmentosOrdenadosDelExpediente,
      7,
    )
    : fragmentosOrdenadosDelExpediente;
  let fragmentosNormativa = [];
  try { fragmentosNormativa = await buscarNormativaOficial({ query: consultaDeBusqueda, queryEmbedding: embeddingConsulta, limit: 3 }); }
  catch (error) { console.warn("Chat sin biblioteca juridica:", error.message); }

  const fragmentos = entradaHerramienta?.fragmentos?.length
    ? combinarFragmentosHerramienta(entradaHerramienta.fragmentos, [...fragmentosExpediente, ...fragmentosNormativa], 9)
    : [...fragmentosExpediente, ...fragmentosNormativa];
  const citas = construirCitasJuridicas(fragmentos, { caseId: idExpediente });
  const evidencia = evaluarEvidencia(citas);
  let respuestaRedactada;
  let tablaRespuesta = null;
  let preguntasSugeridas = [];
  let limitaciones = [];
  let motor = herramientaElegida ? `ollama_tool_${idHerramienta}` : "ollama_case_chat";
  let motivoRespaldo = null;
  const { baseUrl: urlOllama, model: modelo, timeoutMs: limiteConfigurado, maxOutputTokens: maximoTokens } = obtenerConfiguracionDeIA();
  const limiteGeneracionMs = Math.max(15000, Math.min(limiteConfigurado, 60000));
  const tokensDeGeneracion = Math.max(650, maximoTokens);

  if (!fragmentos.length) {
    respuestaRedactada = "No encontre informacion suficiente en el expediente para responder. Carga documentos o registra datos del caso y volve a intentarlo.";
    limitaciones = ["El expediente no contiene fragmentos recuperables para esta consulta."];
    motor = "no_evidence";
  } else {
    const solicitud = {
      pregunta, historial,
      instruccionHerramienta: herramientaElegida?.chatInstruction,
      entradaComparacion: entradaHerramienta,
      columnasTabla: formatoRespuesta === "table" ? obtenerColumnasDeTabla(herramientaElegida && idHerramienta) : null,
      limiteTiempoMs: limiteGeneracionMs,
      maximoTokens: herramientaElegida ? Math.min(tokensDeGeneracion, herramientaElegida.maxOutputTokens) : tokensDeGeneracion,
      contexto: fragmentos.map((fragmento, indice) => ({
        nombreDocumento: fragmento.document_name, ubicacion: citas[indice]?.location_label, texto: fragmento.text,
      })),
    };
    try {
      let resultado;
      if (urlOllama === "https://ollama.com") {
        resultado = await generarRespuestaLibreDelChat(solicitud);
      } else {
        try {
          resultado = await generarRespuestaEstructuradaDelChat(solicitud);
          if (!resultado.respuesta) throw new Error("El modelo no devolvio una respuesta conversacional.");
        } catch (error) {
          motivoRespaldo = error.message;
          resultado = await generarRespuestaLibreDelChat(solicitud);
          motor = herramientaElegida ? `ollama_plain_retry_${idHerramienta}` : "ollama_case_chat_plain_retry";
        }
      }
      respuestaRedactada = limpiarRespuestaChat(resultado.respuesta, fragmentos.length);
      if (formatoRespuesta === "table") {
        tablaRespuesta = leerTablaChat(respuestaRedactada);
        if (!tablaRespuesta) throw new Error("Ollama no devolvió una tabla válida.");
      }
      preguntasSugeridas = resultado.preguntasSugeridas;
      limitaciones = resultado.limitaciones;
    } catch (error) {
      const respaldo = construirRespuestaConEvidencia({ question: consultaDeBusqueda,
        caseChunks: entradaHerramienta?.fragmentos?.length ? entradaHerramienta.fragmentos : fragmentosExpediente, legalChunks: fragmentosNormativa });
      respuestaRedactada = respaldo.answer;
      limitaciones = ["Se muestran extractos recuperados como respaldo."];
      motor = "extractive_chat_fallback";
      motivoRespaldo = [motivoRespaldo, error.message].filter(Boolean).join(" | Reintento: ");
      if (formatoRespuesta === "table") tablaRespuesta = construirTablaDeEvidencia(consultaDeBusqueda, fragmentos, citas);
    }
  }

  return { respuesta: respuestaRedactada, consultaDeBusqueda, citas, metadatos: { engine: motor, tool_id: herramientaElegida ? idHerramienta : null,
    tool_parameters: herramientaElegida ? resumirParametrosHerramienta(parametrosHerramienta) : null,
    ...(tablaRespuesta && { response_table: tablaRespuesta }),
    model: motor.startsWith("ollama") ? modelo : null,
    evidence: evidencia, suggested_questions: preguntasSugeridas.slice(0, 3), limitations: limitaciones.slice(0, 3),
    case_chunks: fragmentosExpediente.length, legal_chunks: fragmentosNormativa.length,
    conversation_messages_used: Math.min(historial.length, 8), duration_ms: Date.now() - inicioMs,
    fallback_reason: motivoRespaldo } };
}

function prepararEntradaHerramienta({ idHerramienta, parametrosHerramienta, documentos, imputados, jurisprudencia, pregunta }) {
  if (idHerramienta === "comparar_documentos") {
    const seleccionados = seleccionarPar(documentos, parametrosHerramienta.document_ids, "documentos");
    return {
      textoPrincipal: obtenerTextoDeFuente(seleccionados[0]),
      textoSecundario: obtenerTextoDeFuente(seleccionados[1]),
      fragmentos: seleccionados.flatMap((elemento) => buscarFragmentosDeFuente(elemento, pregunta, "expediente")),
    };
  }
  if (idHerramienta === "comparar_imputados") {
    const seleccionados = seleccionarPar(imputados, parametrosHerramienta.defendant_ids, "imputados");
    const documentosDeImputados = seleccionados.map(crearFuenteImputado);
    const fragmentosDeEvidencia = seleccionados.flatMap((elemento) => buscarFragmentosRelevantes(
      documentos,
      `${pregunta} ${elemento.nombre}`,
      2
    ).map((fragmento) => ({ ...fragmento, source_type: "expediente" })));
    return {
      textoPrincipal: obtenerTextoDeFuente(documentosDeImputados[0]),
      textoSecundario: obtenerTextoDeFuente(documentosDeImputados[1]),
      fragmentos: [...documentosDeImputados.flatMap((elemento) => buscarFragmentosDeFuente(elemento, pregunta, "imputado")), ...fragmentosDeEvidencia],
    };
  }
  if (idHerramienta === "comparar_jurisprudencia") {
    const seleccionados = seleccionarPar(jurisprudencia, parametrosHerramienta.jurisprudence_ids, "fallos");
    const documentosDeFallos = seleccionados.map(crearFuenteJurisprudencia);
    return {
      textoPrincipal: obtenerTextoDeFuente(documentosDeFallos[0]),
      textoSecundario: obtenerTextoDeFuente(documentosDeFallos[1]),
      fragmentos: documentosDeFallos.flatMap((elemento) => buscarFragmentosDeFuente(elemento, pregunta, "jurisprudencia")),
    };
  }
  return null;
}

function seleccionarPar(elementos, idsOriginales, etiqueta) {
  const identificadores = Array.isArray(idsOriginales) ? idsOriginales.map(Number) : [];
  if (identificadores.length !== 2 || identificadores.some((id) => !Number.isSafeInteger(id) || id <= 0) || identificadores[0] === identificadores[1]) {
    throw crearErrorDeHerramienta(`Selecciona dos ${etiqueta} distintos para ejecutar la comparacion.`);
  }
  const seleccionados = identificadores.map((id) => elementos.find((elemento) => Number(elemento.id) === id));
  if (seleccionados.some((elemento) => !elemento)) {
    throw crearErrorDeHerramienta(`Los ${etiqueta} seleccionados deben pertenecer al expediente.`);
  }
  return seleccionados;
}

function crearFuenteImputado(elemento) {
  return {
    id: `imputado-${elemento.id}`,
    nombre_archivo: `Ficha de ${elemento.nombre}`,
    texto_extraido: [
      `Nombre: ${elemento.nombre}`,
      elemento.documento_identidad ? `Documento: ${elemento.documento_identidad}` : "",
      elemento.rol ? `Rol: ${elemento.rol}` : "",
      elemento.notas ? `Notas: ${elemento.notas}` : "",
      elemento.datos_contexto ? `Contexto registrado: ${JSON.stringify(elemento.datos_contexto)}` : "",
    ].filter(Boolean).join("\n"),
    metadata: { source_type: "imputado", section: "Ficha del imputado" },
  };
}

function crearFuenteJurisprudencia(elemento) {
  return {
    id: `jurisprudencia-${elemento.id}`,
    nombre_archivo: `Fallo: ${elemento.titulo}`,
    texto_extraido: [
      `Titulo: ${elemento.titulo}`,
      elemento.tribunal ? `Tribunal: ${elemento.tribunal}` : "",
      elemento.anio ? `Anio: ${elemento.anio}` : "",
      elemento.referencia ? `Referencia: ${elemento.referencia}` : "",
      elemento.resumen ? `Resumen: ${elemento.resumen}` : "",
      elemento.cita ? `Cita: ${elemento.cita}` : "",
    ].filter(Boolean).join("\n"),
    metadata: { source_type: "jurisprudencia", section: "Jurisprudencia del expediente" },
  };
}

function buscarFragmentosDeFuente(documento, pregunta, tipoFuente) {
  const fragmentos = buscarFragmentosRelevantes([documento], `${pregunta} ${documento.nombre_archivo}`, 3);
  if (fragmentos.length) return fragmentos.map((fragmento) => ({ ...fragmento, source_type: tipoFuente }));
  return [{ document_id: documento.id, document_name: documento.nombre_archivo, chunk_index: 0,
    text: obtenerTextoDeFuente(documento).slice(0, 3500), score: 1, source_type: tipoFuente,
    metadata: documento.metadata || null }];
}

function obtenerTextoDeFuente(elemento) {
  return String(elemento?.texto_extraido || "").trim().slice(0, 12000);
}

function combinarFragmentosHerramienta(preferidos, adicionales, limite) {
  const vistos = new Set();
  return [...preferidos, ...adicionales].filter((fragmento) => {
    const clave = `${fragmento.document_id}:${fragmento.chunk_index}:${fragmento.text}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  }).slice(0, limite);
}

function crearErrorDeHerramienta(mensaje) {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
}

function resumirParametrosHerramienta(valor) {
  return ["document_ids", "defendant_ids", "jurisprudence_ids"].reduce((resultado, clave) => {
    if (Array.isArray(valor?.[clave])) resultado[clave] = valor[clave].slice(0, 2).map(Number);
    return resultado;
  }, {});
}

async function cargarContextoEstructurado(idOrganizacion, idExpediente) {
  try {
    const [tareas, audiencias, fechas, comunicaciones] = await Promise.all([
      listarTareas(idOrganizacion, { caseId: idExpediente }), listarRegistrosDelExpediente("audiencias", idOrganizacion, idExpediente),
      listarFechasDelExpediente(idExpediente), listarRegistrosDelExpediente("comunicaciones", idOrganizacion, idExpediente),
    ]);
    return crearDocumentosDelContexto({ tasks: tareas, hearings: audiencias, dates: fechas, communications: comunicaciones });
  } catch (error) { console.warn("Contexto de gestion no disponible para chat:", error.message); return []; }
}

function construirConsultaConHistorial(pregunta, historial) {
  const limpio = String(pregunta || "").replace(/\s+/g, " ").trim();
  const necesitaHistorial = limpio.length < 90 || /\b(eso|esa|ese|anterior|tambien|mencionad[oa]|dicho|ella|ellos|entonces)\b/i.test(limpio);
  if (!necesitaHistorial) return limpio.slice(0, 700);
  const preguntasAnteriores = historial.filter((elemento) => elemento.role === "usuario" || elemento.role === "user")
    .slice(-2).map((elemento) => elemento.content).join(" ");
  return `${preguntasAnteriores} ${limpio}`.replace(/\s+/g, " ").trim().slice(0, 700);
}

function crearFichaDelExpediente(idExpediente, imputados) {
  return { id: `expediente-${idExpediente}`, nombre_archivo: "Datos generales del expediente",
    texto_extraido: imputados.length
      ? `Expediente interno ${idExpediente}. Imputados registrados: ${imputados.map((elemento) => `${elemento.nombre}${elemento.rol ? ` (${elemento.rol})` : ""}`).join(", ")}.`
      : `Expediente interno ${idExpediente}. No hay imputados registrados.`,
    metadata: { source_type: "case_overview", section: "Expediente" } };
}

function fusionarResultados(fragmentosLexicos, fragmentosSemanticos, limite) {
  const resultadosFusionados = new Map();
  const agregarResultado = (fragmento, posicion, peso) => {
    const clave = `${fragmento.document_id}:${fragmento.chunk_index}`;
    const actual = resultadosFusionados.get(clave) || { ...fragmento, score: 0 };
    actual.score += peso / (60 + posicion + 1);
    if (fragmento.semantic_score != null) actual.semantic_score = fragmento.semantic_score;
    if (fragmento.lexical_score != null) actual.lexical_score = fragmento.lexical_score;
    resultadosFusionados.set(clave, actual);
  };
  fragmentosLexicos.forEach((fragmento, posicion) => agregarResultado(fragmento, posicion, 0.45));
  fragmentosSemanticos.forEach((fragmento, posicion) => agregarResultado(fragmento, posicion, 0.55));
  const maximo = 1 / 61;
  return [...resultadosFusionados.values()].map((fragmento) => ({ ...fragmento, score: Math.min(1, fragmento.score / maximo) }))
    .sort((izquierda, derecha) => derecha.score - izquierda.score).slice(0, limite);
}

function responderIntencionConversacional(pregunta) {
  const normalizado = String(pregunta || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[!?.,]/g, "").trim();
  if (/^(hola|buenas|buen dia|buenas tardes|buenas noches)$/.test(normalizado)) {
    return { respuesta: "Hola. Puedo revisar los documentos y datos de este expediente, responder preguntas con fuentes o ejecutar una herramienta.",
      preguntasSugeridas: ["¿Cuál es el estado actual del expediente?", "¿Qué fechas requieren atención?", "Resumí los hechos principales"] };
  }
  if (/^(que podes hacer|como me podes ayudar|ayuda)$/.test(normalizado)) {
    return { respuesta: "Puedo buscar hechos en los documentos, relacionar información del expediente, ordenar fechas, resumir el caso y preparar una teoría provisional. Cada respuesta documental muestra las fuentes utilizadas.",
      preguntasSugeridas: ["Resumí el expediente", "Ordená las fechas relevantes", "¿Qué información falta verificar?"] };
  }
  return null;
}

function normalizarReferencias(valor, cantidadFuentes) {
  return String(valor || "").replace(/\[((?:FUENTE\s+)?\d+(?:\s*[,;]\s*(?:FUENTE\s+)?\d+)*)\]/gi,
    (_, marcadores) => marcadores.match(/\d+/g).map(Number).map((indice) =>
      indice >= 1 && indice <= cantidadFuentes ? `[${indice}]` : "[fuente no verificada]").join(" "));
}

function limpiarRespuestaChat(valor, cantidadFuentes) {
  return normalizarReferencias(valor, cantidadFuentes)
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/^[ \t]*\*[ \t]+/gm, "- ")
    .trim();
}

module.exports = { IDS_HERRAMIENTAS_CHAT, responderChatExpediente, construirConsultaConHistorial, fusionarResultados,
  responderIntencionConversacional, normalizarReferencias, prepararEntradaHerramienta };
