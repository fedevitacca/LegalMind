const { runCaseChatWithLocalAI, runCaseChatPlainWithLocalAI, runLegalToolWithLocalAI,
  embedTextsWithLocalAI, getLocalAIConfig } = require("../../IA/analizadorLocal");
const { buildStructuredCaseDocuments } = require("../../IA/contextoExpediente");
const { retrieveRelevantChunks } = require("../../IA/ragLocal");
const { expandLegalQuery } = require("../../IA/terminologiaRag");
const { buildGroundedLegalAnswer } = require("../../IA/respuestaJuridicaExtractiva");
const { getTool } = require("../../IA/motorHerramientas");
const { listDocumentsForCase } = require("../modelos/repositorioIA");
const { listDatesByCase, listDefendantsByCase, listJurisprudenceByCase } = require("../modelos/repositorioCasos");
const { listCaseRecords, listTasks } = require("../modelos/repositorioTrabajoJuridico");
const { searchLegalLibrary } = require("../modelos/repositorioBibliotecaJuridica");
const { hybridSearch } = require("../modelos/repositorioRagVectorial");
const { assessEvidence, buildLegalCitations } = require("./citasJuridicas");

const CHAT_TOOL_IDS = new Set([
  "resumen_expediente",
  "comparar_documentos",
  "comparar_imputados",
  "comparar_jurisprudencia",
  "cronologia",
  "teoria_del_caso",
]);

async function answerCaseChat({ organizationId, caseId, question, history = [], toolId = null, toolParameters = {} }) {
  const startedAt = Date.now();
  const conversational = handleConversationalIntent(question);
  if (conversational) return { answer: conversational.answer, retrievalQuery: question, citations: [],
    metadata: { engine: "deterministic_conversation", tool_id: null, model: null,
      evidence: { status: "no_requerido", requires_human_review: false, citations_count: 0 },
      suggested_questions: conversational.suggestions, limitations: [], case_chunks: 0, legal_chunks: 0,
      conversation_messages_used: Math.min(history.length, 8), duration_ms: Date.now() - startedAt, fallback_reason: null } };
  const retrievalQuery = buildConversationAwareQuery(question, history);
  const [documents, defendants, structuredDocuments, jurisprudence] = await Promise.all([
    listDocumentsForCase(caseId),
    listDefendantsByCase(caseId),
    loadStructuredContext(organizationId, caseId),
    listJurisprudenceByCase(caseId),
  ]);
  const selectedTool = CHAT_TOOL_IDS.has(toolId) ? getTool(toolId) : null;
  const toolInput = selectedTool
    ? prepareToolInput({ toolId, toolParameters, documents, defendants, jurisprudence, question })
    : null;
  const corpus = [buildCaseOverview(caseId, defendants), ...structuredDocuments, ...documents];
  const lexicalChunks = retrieveRelevantChunks(corpus, retrievalQuery, 12)
    .map((chunk) => ({ ...chunk, source_type: chunk.metadata?.source_type || "expediente" }));

  let queryEmbedding = null;
  try { [queryEmbedding] = await embedTextsWithLocalAI([expandLegalQuery(retrievalQuery)], { timeoutMs: 1800 }); }
  catch (error) { console.warn("Chat sin embeddings de consulta:", error.message); }

  let semanticChunks = [];
  if (queryEmbedding) {
    try {
      const stored = await hybridSearch({ organizationId, caseId, query: retrievalQuery, queryEmbedding, limit: 12 });
      semanticChunks = stored.map((item) => ({ id: item.id, document_id: item.documento_id,
        document_name: item.nombre_archivo, chunk_index: item.orden, page: item.pagina,
        text: item.texto, score: Number(item.score), lexical_score: Number(item.lexical_score),
        semantic_score: Number(item.semantic_score), metadata: item.metadata_json, source_type: "expediente" }));
    } catch (error) { console.warn("Chat sin indice vectorial persistido:", error.message); }
  }
  const caseChunks = fuseRankings(lexicalChunks, semanticChunks, 7);
  let legalChunks = [];
  try { legalChunks = await searchLegalLibrary({ query: retrievalQuery, queryEmbedding, limit: 3 }); }
  catch (error) { console.warn("Chat sin biblioteca juridica:", error.message); }

  const chunks = toolInput?.chunks?.length
    ? mergeToolChunks(toolInput.chunks, [...caseChunks, ...legalChunks], 9)
    : [...caseChunks, ...legalChunks];
  const citations = buildLegalCitations(chunks, { caseId });
  const evidence = assessEvidence(citations);
  let answer;
  let suggestedQuestions = [];
  let limitations = [];
  let engine = "ollama_case_chat";
  let fallbackReason = null;
  const generationTimeoutMs = Math.max(15000, Math.min(getLocalAIConfig().timeoutMs, 60000));
  const generationTokens = Math.max(650, getLocalAIConfig().maxOutputTokens);

  if (!chunks.length) {
    answer = "No encontre informacion suficiente en el expediente para responder. Carga documentos o registra datos del caso y volve a intentarlo.";
    limitations = ["El expediente no contiene fragmentos recuperables para esta consulta."];
    engine = "no_evidence";
  } else {
    try {
      if (selectedTool) {
        const result = await runLegalToolWithLocalAI({ toolId,
          primaryText: toolInput?.primaryText || "Analiza exclusivamente los pasajes recuperados del expediente.",
          secondaryText: toolInput?.secondaryText || "",
          query: question, parameters: { scope: "case", conversation: true },
          context: chunks.map((chunk, index) => `[FUENTE ${index + 1}] ${chunk.document_name}: ${chunk.text}`),
          timeoutMs: generationTimeoutMs, maxOutputTokens: generationTokens });
        answer = formatToolResult(result);
        limitations = result.limitaciones || [];
        suggestedQuestions = result.acciones_sugeridas || [];
        engine = `ollama_tool_${toolId}`;
      } else {
        const result = await runCaseChatWithLocalAI({ question, history, timeoutMs: generationTimeoutMs,
          maxOutputTokens: generationTokens, context: chunks.map((chunk, index) => ({
          documentName: chunk.document_name, location: citations[index]?.location_label, text: chunk.text,
        })) });
        if (!result.answer) throw new Error("El modelo no devolvio una respuesta conversacional.");
        answer = normalizeSourceMarkers(result.answer, chunks.length);
        suggestedQuestions = result.suggestedQuestions;
        limitations = result.limitations;
      }
    } catch (error) {
      try {
        const retryQuestion = selectedTool
          ? `${selectedTool.instruction}\n\nSolicitud del abogado: ${question}` : question;
        const retry = await runCaseChatPlainWithLocalAI({ question: retryQuestion, history,
          timeoutMs: generationTimeoutMs, maxOutputTokens: generationTokens,
          context: chunks.map((chunk, index) => ({ documentName: chunk.document_name,
            location: citations[index]?.location_label, text: chunk.text })) });
        answer = normalizeSourceMarkers(retry.answer, chunks.length);
        limitations = ["La salida estructurada no estuvo disponible; Ollama redacto la respuesta en formato libre."];
        engine = selectedTool ? `ollama_plain_retry_${toolId}` : "ollama_case_chat_plain_retry";
        fallbackReason = error.message;
      } catch (retryError) {
        const fallback = buildGroundedLegalAnswer({ question: retrievalQuery,
          caseChunks: toolInput?.chunks?.length ? toolInput.chunks : caseChunks, legalChunks });
        answer = fallback.answer;
        limitations = ["Ollama no estuvo disponible; se muestran extractos recuperados como ultimo recurso."];
        engine = "extractive_chat_fallback";
        fallbackReason = `${error.message} | Reintento: ${retryError.message}`;
      }
    }
  }

  return { answer, retrievalQuery, citations, metadata: { engine, tool_id: selectedTool ? toolId : null,
    tool_parameters: selectedTool ? compactToolParameters(toolParameters) : null,
    model: engine.startsWith("ollama") ? getLocalAIConfig().model : null,
    evidence, suggested_questions: suggestedQuestions.slice(0, 3), limitations: limitations.slice(0, 3),
    case_chunks: caseChunks.length, legal_chunks: legalChunks.length,
    conversation_messages_used: Math.min(history.length, 8), duration_ms: Date.now() - startedAt,
    fallback_reason: fallbackReason } };
}

function prepareToolInput({ toolId, toolParameters, documents, defendants, jurisprudence, question }) {
  if (toolId === "comparar_documentos") {
    const selected = selectPair(documents, toolParameters.document_ids, "documentos");
    return {
      primaryText: sourceText(selected[0]),
      secondaryText: sourceText(selected[1]),
      chunks: selected.flatMap((item) => selectedSourceChunks(item, question, "expediente")),
    };
  }
  if (toolId === "comparar_imputados") {
    const selected = selectPair(defendants, toolParameters.defendant_ids, "imputados");
    const defendantDocuments = selected.map(buildDefendantSource);
    const evidenceChunks = selected.flatMap((item) => retrieveRelevantChunks(
      documents,
      `${question} ${item.nombre}`,
      2
    ).map((chunk) => ({ ...chunk, source_type: "expediente" })));
    return {
      primaryText: sourceText(defendantDocuments[0]),
      secondaryText: sourceText(defendantDocuments[1]),
      chunks: [...defendantDocuments.flatMap((item) => selectedSourceChunks(item, question, "imputado")), ...evidenceChunks],
    };
  }
  if (toolId === "comparar_jurisprudencia") {
    const selected = selectPair(jurisprudence, toolParameters.jurisprudence_ids, "fallos");
    const precedentDocuments = selected.map(buildJurisprudenceSource);
    return {
      primaryText: sourceText(precedentDocuments[0]),
      secondaryText: sourceText(precedentDocuments[1]),
      chunks: precedentDocuments.flatMap((item) => selectedSourceChunks(item, question, "jurisprudencia")),
    };
  }
  return null;
}

function selectPair(items, rawIds, label) {
  const ids = Array.isArray(rawIds) ? rawIds.map(Number) : [];
  if (ids.length !== 2 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || ids[0] === ids[1]) {
    throw badToolRequest(`Selecciona dos ${label} distintos para ejecutar la comparacion.`);
  }
  const selected = ids.map((id) => items.find((item) => Number(item.id) === id));
  if (selected.some((item) => !item)) {
    throw badToolRequest(`Los ${label} seleccionados deben pertenecer al expediente.`);
  }
  return selected;
}

function buildDefendantSource(item) {
  return {
    id: `imputado-${item.id}`,
    nombre_archivo: `Ficha de ${item.nombre}`,
    texto_extraido: [
      `Nombre: ${item.nombre}`,
      item.documento_identidad ? `Documento: ${item.documento_identidad}` : "",
      item.rol ? `Rol: ${item.rol}` : "",
      item.notas ? `Notas: ${item.notas}` : "",
      item.datos_contexto ? `Contexto registrado: ${JSON.stringify(item.datos_contexto)}` : "",
    ].filter(Boolean).join("\n"),
    metadata: { source_type: "imputado", section: "Ficha del imputado" },
  };
}

function buildJurisprudenceSource(item) {
  return {
    id: `jurisprudencia-${item.id}`,
    nombre_archivo: `Fallo: ${item.titulo}`,
    texto_extraido: [
      `Titulo: ${item.titulo}`,
      item.tribunal ? `Tribunal: ${item.tribunal}` : "",
      item.anio ? `Anio: ${item.anio}` : "",
      item.referencia ? `Referencia: ${item.referencia}` : "",
      item.resumen ? `Resumen: ${item.resumen}` : "",
      item.cita ? `Cita: ${item.cita}` : "",
    ].filter(Boolean).join("\n"),
    metadata: { source_type: "jurisprudencia", section: "Jurisprudencia del expediente" },
  };
}

function selectedSourceChunks(document, question, sourceType) {
  const chunks = retrieveRelevantChunks([document], `${question} ${document.nombre_archivo}`, 3);
  if (chunks.length) return chunks.map((chunk) => ({ ...chunk, source_type: sourceType }));
  return [{ document_id: document.id, document_name: document.nombre_archivo, chunk_index: 0,
    text: sourceText(document).slice(0, 3500), score: 1, source_type: sourceType,
    metadata: document.metadata || null }];
}

function sourceText(item) {
  return String(item?.texto_extraido || "").trim().slice(0, 12000);
}

function mergeToolChunks(preferred, additional, limit) {
  const seen = new Set();
  return [...preferred, ...additional].filter((chunk) => {
    const key = `${chunk.document_id}:${chunk.chunk_index}:${chunk.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function badToolRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function compactToolParameters(value) {
  return ["document_ids", "defendant_ids", "jurisprudence_ids"].reduce((result, key) => {
    if (Array.isArray(value?.[key])) result[key] = value[key].slice(0, 2).map(Number);
    return result;
  }, {});
}

async function loadStructuredContext(organizationId, caseId) {
  try {
    const [tasks, hearings, dates, communications] = await Promise.all([
      listTasks(organizationId, { caseId }), listCaseRecords("audiencias", organizationId, caseId),
      listDatesByCase(caseId), listCaseRecords("comunicaciones", organizationId, caseId),
    ]);
    return buildStructuredCaseDocuments({ tasks, hearings, dates, communications });
  } catch (error) { console.warn("Contexto de gestion no disponible para chat:", error.message); return []; }
}

function buildConversationAwareQuery(question, history) {
  const clean = String(question || "").replace(/\s+/g, " ").trim();
  const dependsOnHistory = clean.length < 90 || /\b(eso|esa|ese|anterior|tambien|mencionad[oa]|dicho|ella|ellos|entonces)\b/i.test(clean);
  if (!dependsOnHistory) return clean.slice(0, 700);
  const previous = history.filter((item) => item.role === "usuario" || item.role === "user")
    .slice(-2).map((item) => item.content).join(" ");
  return `${previous} ${clean}`.replace(/\s+/g, " ").trim().slice(0, 700);
}

function buildCaseOverview(caseId, defendants) {
  return { id: `expediente-${caseId}`, nombre_archivo: "Datos generales del expediente",
    texto_extraido: defendants.length
      ? `Expediente interno ${caseId}. Imputados registrados: ${defendants.map((item) => `${item.nombre}${item.rol ? ` (${item.rol})` : ""}`).join(", ")}.`
      : `Expediente interno ${caseId}. No hay imputados registrados.`,
    metadata: { source_type: "case_overview", section: "Expediente" } };
}

function fuseRankings(lexicalChunks, semanticChunks, limit) {
  const fused = new Map();
  const add = (chunk, rank, weight) => {
    const key = `${chunk.document_id}:${chunk.chunk_index}`;
    const current = fused.get(key) || { ...chunk, score: 0 };
    current.score += weight / (60 + rank + 1);
    if (chunk.semantic_score != null) current.semantic_score = chunk.semantic_score;
    if (chunk.lexical_score != null) current.lexical_score = chunk.lexical_score;
    fused.set(key, current);
  };
  lexicalChunks.forEach((chunk, rank) => add(chunk, rank, 0.45));
  semanticChunks.forEach((chunk, rank) => add(chunk, rank, 0.55));
  const maximum = 1 / 61;
  return [...fused.values()].map((chunk) => ({ ...chunk, score: Math.min(1, chunk.score / maximum) }))
    .sort((left, right) => right.score - left.score).slice(0, limit);
}

function formatToolResult(result) {
  return [result.conclusion,
    ...(result.puntos_clave || []).map((point) => `- ${point}`),
    ...(result.desarrollo || []).map((section) => `${section.titulo}\n${section.contenido}`),
  ].filter(Boolean).join("\n\n");
}

function handleConversationalIntent(question) {
  const normalized = String(question || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[!?.,]/g, "").trim();
  if (/^(hola|buenas|buen dia|buenas tardes|buenas noches)$/.test(normalized)) {
    return { answer: "Hola. Puedo revisar los documentos y datos de este expediente, responder preguntas con fuentes o ejecutar una herramienta.",
      suggestions: ["¿Cuál es el estado actual del expediente?", "¿Qué fechas requieren atención?", "Resumí los hechos principales"] };
  }
  if (/^(que podes hacer|como me podes ayudar|ayuda)$/.test(normalized)) {
    return { answer: "Puedo buscar hechos en los documentos, relacionar información del expediente, ordenar fechas, resumir el caso y preparar una teoría provisional. Cada respuesta documental muestra las fuentes utilizadas.",
      suggestions: ["Resumí el expediente", "Ordená las fechas relevantes", "¿Qué información falta verificar?"] };
  }
  return null;
}

function normalizeSourceMarkers(value, sourceCount) {
  return String(value || "").replace(/\[FUENTE\s+(\d+)\]/gi, (match, number) => {
    const index = Number(number);
    return index >= 1 && index <= sourceCount ? `[${index}]` : "[fuente no verificada]";
  });
}

module.exports = { CHAT_TOOL_IDS, answerCaseChat, buildConversationAwareQuery, fuseRankings,
  handleConversationalIntent, normalizeSourceMarkers, prepareToolInput };
