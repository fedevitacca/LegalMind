const express = require("express");

const {
  generarInformeJuridicoConIA,
  obtenerConfiguracionDeIA,
  comprobarConexionConOllama,
  buscarEnTextoJuridicoConIA,
  ejecutarHerramientaJuridicaConIA,
  generarEmbeddingsDeTextos,
} = require("../../IA/analizadorLocal");
const { obtenerHerramienta, listarHerramientas } = require("../../IA/motorHerramientas");
const { crearDocumentosDelContexto } = require("../../IA/contextoExpediente");
const { ampliarConsultaJuridica } = require("../../IA/terminologiaRag");
const { guardarConsultaDeIA, eliminarConsultaDeIA, obtenerConsultaDeIA, listarConsultasDeIA } = require("../modelos/repositorioConsultasIA");
const {
  MAXIMO_BYTES_ARCHIVO_TEXTO,
  extraerTextoDeArchivo,
  extraerTextoPlano,
  esArchivoPdf,
  esDocumentoCompatible,
  esArchivoDeTexto,
} = require("../../IA/textFile");
const {
  extraerDatosBasicosDelExpediente,
  buscarFragmentosRelevantes,
} = require("../../IA/ragLocal");
const { construirResultadoRapido } = require("../../IA/respuestaRapida");
const { construirRespuestaConEvidencia } = require("../../IA/respuestaJuridicaExtractiva");
const {
  listarDocumentosDelExpediente,
  guardarAnalisisJuridico,
} = require("../modelos/repositorioIA");
const { buscarNormativaOficial } = require("../modelos/repositorioBibliotecaJuridica");
const { buscarFragmentosBiblioteca } = require("../modelos/repositorioBibliotecaEstudio");
const { buscarFragmentosDeFormaHibrida } = require("../modelos/repositorioRagVectorial");
const { listDatesByCase: listarFechasDelExpediente, listDefendantsByCase: listarImputadosDelExpediente } = require("../modelos/repositorioCasos");
const { listCaseRecords: listarRegistrosDelExpediente, listTasks: listarTareas } = require("../modelos/repositorioTrabajoJuridico");
const { evaluarEvidencia, construirCitasJuridicas, verificarAfirmacionesDelResultado } = require("../servicios/citasJuridicas");
const { guardarIntercambio, crearConversacion, eliminarConversacion, obtenerConversacion, listarConversaciones } = require("../modelos/repositorioChatIA");
const { responderChatExpediente, IDS_HERRAMIENTAS_CHAT } = require("../servicios/servicioChatExpediente");

const enrutador = express.Router();
const { requireSession: exigirSesion } = require("../autenticacion/sesion");
const { attachSecurityContext: adjuntarContextoDeSeguridad, recordAudit: registrarAuditoria, requireCaseAccess: exigirAccesoAlExpediente, requireOptionalCaseAccess: exigirAccesoSiHayExpediente, requireRole: exigirRol } = require("../autenticacion/autorizacion");

enrutador.get("/health", (solicitud, respuesta) => {
  const configuracionLocalIA = obtenerConfiguracionDeIA();

  respuesta.json({
    status: "ok",
    module: "LegalMind IA",
    local_ai_base_url: configuracionLocalIA.baseUrl,
    local_ai_configured: true,
    local_ai_model: configuracionLocalIA.model,
    local_ai_required: true,
    capabilities: [
      "extraccion_juridica_estructurada",
      "entidades_para_base_juridica",
      "grafo_conocimiento",
      "rag_juridico_local",
      "expansion_terminologica_juridica",
      "contexto_estructurado_del_expediente",
      "rag_local_documentos_persistidos",
      "analizador_estrategico",
      "alertas_inteligentes",
      "scoring_confianza",
      "chat_conversacional_por_expediente",
      "memoria_y_herramientas_en_chat",
    ],
  });
});

enrutador.get("/health/live", async (solicitud, respuesta) => {
  try { return respuesta.json({ status: "ok", ...(await comprobarConexionConOllama()), config: obtenerConfiguracionDeIA() }); }
  catch (error) { return respuesta.status(503).json({ status: "degraded", available: false, error: error.message }); }
});

enrutador.get("/tools", (solicitud, respuesta) => respuesta.json({ tools: listarHerramientas() }));

enrutador.post("/extract-file", exigirSesion, adjuntarContextoDeSeguridad, (solicitud, respuesta) => {
  procesarCargaDeArchivo(solicitud, async (errorDeCarga) => {
    if (errorDeCarga) return respuesta.status(400).json({ error: obtenerMensajeDeErrorDeCarga(errorDeCarga) });
    try {
      const texto = await extraerTextoDeArchivo(solicitud.file);
      return respuesta.json({ document: { name: solicitud.file.originalname, mime_type: solicitud.file.mimetype,
        size_bytes: solicitud.file.size, characters: texto.length, text: texto } });
    } catch (error) { return respuesta.status(400).json({ error: error.message }); }
  }, { allowAllDocuments: true });
});

enrutador.use(exigirSesion, adjuntarContextoDeSeguridad);

enrutador.get("/cases/:caseId/chats", exigirAccesoAlExpediente, async (solicitud, respuesta, siguiente) => {
  try {
    const conversaciones = await listarConversaciones({ organizationId: solicitud.security.organizationId,
      caseId: leerIdNumericoObligatorio(solicitud.params.caseId), userId: solicitud.user.id });
    return respuesta.json({ conversations: conversaciones });
  } catch (error) { return siguiente(error); }
});

enrutador.post("/cases/:caseId/chats", exigirAccesoAlExpediente, exigirRol("asistente"), async (solicitud, respuesta, siguiente) => {
  try {
    const conversacion = await crearConversacion({ organizationId: solicitud.security.organizationId,
      caseId: leerIdNumericoObligatorio(solicitud.params.caseId), userId: solicitud.user.id, title: solicitud.body?.title });
    await registrarAuditoria(solicitud, { action: "ia.chat_creado", resourceType: "conversacion_ia", resourceId: conversacion.id,
      metadata: { causa_id: conversacion.case_id } });
    return respuesta.status(201).json({ conversation: conversacion });
  } catch (error) { return siguiente(error); }
});

enrutador.get("/cases/:caseId/chats/:chatId", exigirAccesoAlExpediente, async (solicitud, respuesta, siguiente) => {
  try {
    const conversacion = await obtenerConversacion({ organizationId: solicitud.security.organizationId,
      caseId: leerIdNumericoObligatorio(solicitud.params.caseId), userId: solicitud.user.id,
      conversationId: leerIdNumericoObligatorio(solicitud.params.chatId) });
    return conversacion ? respuesta.json({ conversation: conversacion }) : respuesta.status(404).json({ error: "Conversacion no encontrada." });
  } catch (error) { return siguiente(error); }
});

enrutador.delete("/cases/:caseId/chats/:chatId", exigirAccesoAlExpediente, exigirRol("abogado"), async (solicitud, respuesta, siguiente) => {
  try {
    const eliminado = await eliminarConversacion({ organizationId: solicitud.security.organizationId,
      caseId: leerIdNumericoObligatorio(solicitud.params.caseId), userId: solicitud.user.id,
      conversationId: leerIdNumericoObligatorio(solicitud.params.chatId) });
    return eliminado ? respuesta.status(204).send() : respuesta.status(404).json({ error: "Conversacion no encontrada." });
  } catch (error) { return siguiente(error); }
});

enrutador.post("/cases/:caseId/chats/:chatId/messages", exigirAccesoAlExpediente, exigirRol("asistente"), async (solicitud, respuesta, siguiente) => {
  const contenido = typeof solicitud.body?.content === "string" ? solicitud.body.content.replace(/\s+/g, " ").trim() : "";
  const idHerramienta = solicitud.body?.tool_id == null ? null : String(solicitud.body.tool_id);
  const formatoRespuesta = solicitud.body?.response_format ?? "text";
  if (!contenido || contenido.length > 4000) return respuesta.status(400).json({ error: "Escribi un mensaje de hasta 4000 caracteres." });
  if (idHerramienta && !IDS_HERRAMIENTAS_CHAT.has(idHerramienta)) return respuesta.status(400).json({ error: "La herramienta no esta habilitada en el chat." });
  if (formatoRespuesta !== "text" && formatoRespuesta !== "table") return respuesta.status(400).json({ error: "Elegí texto o tabla como formato de respuesta." });
  let etapa = "load_conversation";
  try {
    const identificadores = { organizationId: solicitud.security.organizationId, caseId: leerIdNumericoObligatorio(solicitud.params.caseId),
      userId: solicitud.user.id, conversationId: leerIdNumericoObligatorio(solicitud.params.chatId) };
    const conversacion = await obtenerConversacion(identificadores);
    if (!conversacion) return respuesta.status(404).json({ error: "Conversacion no encontrada." });
    etapa = "generate_answer";
    const respuestaGenerada = await responderChatExpediente({ idOrganizacion: identificadores.organizationId, idExpediente: identificadores.caseId,
      pregunta: contenido, historial: conversacion.messages, idHerramienta, formatoRespuesta,
      parametrosHerramienta: solicitud.body?.tool_parameters && typeof solicitud.body.tool_parameters === "object"
        ? solicitud.body.tool_parameters : {} });
    etapa = "save_exchange";
    const intercambioGuardado = await guardarIntercambio({ ...identificadores, userContent: contenido, assistantContent: respuestaGenerada.respuesta,
      retrievalQuery: respuestaGenerada.consultaDeBusqueda, toolId: idHerramienta, citations: respuestaGenerada.citas, metadata: respuestaGenerada.metadatos });
    etapa = "record_audit";
    await registrarAuditoria(solicitud, { action: "ia.chat_mensaje", resourceType: "conversacion_ia", resourceId: identificadores.conversationId,
      metadata: { causa_id: identificadores.caseId, herramienta: idHerramienta, citas: respuestaGenerada.citas.length } });
    return respuesta.status(201).json({ title: intercambioGuardado.title, user_message: intercambioGuardado.userMessage,
      assistant_message: intercambioGuardado.assistantMessage });
  } catch (error) {
    console.error("ia.chat_mensaje_failed", { request_id: solicitud.requestId, stage: etapa,
      case_id: solicitud.params.caseId, chat_id: solicitud.params.chatId,
      code: error.code, message: error.message });
    return siguiente(error);
  }
});

enrutador.get("/cases/:caseId/queries", exigirAccesoAlExpediente, async (solicitud, respuesta, siguiente) => {
  try { return respuesta.json({ queries: await listarConsultasDeIA(leerIdNumericoObligatorio(solicitud.params.caseId), solicitud.user.id) }); }
  catch (error) { return siguiente(error); }
});
enrutador.get("/cases/:caseId/queries/:queryId", exigirAccesoAlExpediente, async (solicitud, respuesta, siguiente) => {
  try { const elemento = await obtenerConsultaDeIA(leerIdNumericoObligatorio(solicitud.params.caseId), leerIdNumericoObligatorio(solicitud.params.queryId), solicitud.user.id);
    return elemento ? respuesta.json({ query: elemento }) : respuesta.status(404).json({ error: "Consulta no encontrada." }); }
  catch (error) { return siguiente(error); }
});
enrutador.delete("/cases/:caseId/queries/:queryId", exigirAccesoAlExpediente, exigirRol("abogado"), async (solicitud, respuesta, siguiente) => {
  try { const eliminado = await eliminarConsultaDeIA(leerIdNumericoObligatorio(solicitud.params.caseId), leerIdNumericoObligatorio(solicitud.params.queryId), solicitud.user.id);
    return eliminado ? respuesta.status(204).send() : respuesta.status(404).json({ error: "Consulta no encontrada." }); }
  catch (error) { return siguiente(error); }
});

enrutador.post("/tools/:toolId/run", exigirAccesoSiHayExpediente, exigirRol("asistente"), async (solicitud, respuesta) => {
  const inicioMs = Date.now();
  const tiempoLimite = inicioMs + obtenerPresupuestoDeRespuestaMs();
  const herramienta = obtenerHerramienta(solicitud.params.toolId);
  if (!herramienta) return respuesta.status(404).json({ error: "Herramienta de IA inexistente." });
  let textoPrincipal = String(solicitud.body?.primary_text || solicitud.body?.text || "").trim();
  let textoSecundario = String(solicitud.body?.secondary_text || "").trim();
  const consulta = String(solicitud.body?.query || solicitud.body?.parameters?.pregunta || "").trim();
  const idExpediente = leerIdNumericoOpcional(solicitud.body?.case_id);
  const alcance = normalizarAlcanceHerramienta(solicitud.body?.scope);
  const usarContextoDelExpediente = Boolean(idExpediente)
    && herramienta.inputs === 1
    && (leerBooleano(solicitud.body?.use_case_context) || leerBooleano(solicitud.body?.use_case_documents));
  const idImputado = leerIdNumericoOpcional(solicitud.body?.defendant_id);
  const comparandoImputados = solicitud.params.toolId === "comparar_imputados";
  const par = solicitud.body?.defendant_ids;
  if (comparandoImputados && (!idExpediente || !Array.isArray(par) || par.length !== 2
    || !par.every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0) || Number(par[0]) === Number(par[1]))) {
    return respuesta.status(400).json({ error: "Seleccioná un expediente y dos imputados distintos para comparar." });
  }

  if (solicitud.params.toolId === "consulta_rag" && !consulta) {
    return respuesta.status(400).json({ error: "Escriba una pregunta para realizar la consulta." });
  }
  if (alcance === "defendant" && usarContextoDelExpediente && !idImputado) {
    return respuesta.status(400).json({ error: "Seleccione el imputado sobre el que quiere consultar." });
  }
  if (!textoPrincipal && !usarContextoDelExpediente && !comparandoImputados) return respuesta.status(400).json({ error: "La fuente principal es obligatoria." });
  if (herramienta.inputs === 2 && !textoSecundario && !comparandoImputados) return respuesta.status(400).json({ error: "Esta herramienta requiere dos fuentes." });

  try {
    let imputadoElegido = null;
    let documentos;
    let cantidadDocumentosFuente = textoSecundario ? 2 : 1;
    let cantidadDocumentosDeContexto = 0;
    let avisoContextoEstructurado = null;
    let etiquetaAlcance = obtenerEtiquetaDeAlcance(alcance, usarContextoDelExpediente);
    let imputadosComparados = [];

    if (comparandoImputados) {
      const imputados = await ejecutarConLimiteDeTiempo(listarImputadosDelExpediente(idExpediente), tiempoDisponibleMs(tiempoLimite, 1100), "No se pudieron leer las fichas a tiempo.");
      imputadosComparados = par.map((id) => imputados.find((elemento) => Number(elemento.id) === Number(id)));
      if (imputadosComparados.some((elemento) => !elemento)) {
        return respuesta.status(400).json({ error: "Los dos imputados deben pertenecer al expediente seleccionado." });
      }
      documentos = imputadosComparados.map(crearDocumentoDeImputado);
      textoPrincipal = documentos[0].texto_extraido;
      textoSecundario = documentos[1].texto_extraido;
      cantidadDocumentosFuente = 2;
      etiquetaAlcance = `las fichas de ${imputadosComparados.map((elemento) => elemento.nombre).join(" y ")}`;
    } else if (usarContextoDelExpediente) {
      documentos = await ejecutarConLimiteDeTiempo(
        listarDocumentosDelExpediente(idExpediente),
        tiempoDisponibleMs(tiempoLimite, 1100),
        "La lectura de los documentos excedió el tiempo disponible."
      );
      cantidadDocumentosFuente = documentos.length;

      if (alcance === "case" || alcance === "defendant") {
        const imputados = await ejecutarConLimiteDeTiempo(
          listarImputadosDelExpediente(idExpediente),
          tiempoDisponibleMs(tiempoLimite, 800),
          "La lectura de los imputados excedió el tiempo disponible."
        );
        let documentosDelContexto = [];
        try {
          documentosDelContexto = await ejecutarConLimiteDeTiempo(
            cargarContextoEstructuradoDelExpediente(solicitud.security.organizationId, idExpediente),
            tiempoDisponibleMs(tiempoLimite, 700),
            "La lectura de la gestión del expediente excedió el tiempo disponible."
          );
        } catch (error) {
          console.warn("No se pudo incorporar la gestión del expediente al RAG:", error.message);
          avisoContextoEstructurado = "No se pudo incorporar la gestión del expediente.";
        }
        cantidadDocumentosDeContexto = documentosDelContexto.length;
        if (alcance === "defendant") {
          imputadoElegido = imputados.find((elemento) => Number(elemento.id) === idImputado);
          if (!imputadoElegido) {
            return respuesta.status(400).json({ error: "El imputado seleccionado no pertenece al expediente." });
          }
          documentos = [crearDocumentoDeImputado(imputadoElegido), ...documentosDelContexto, ...documentos];
        } else {
          documentos = [crearDocumentoDelExpediente(idExpediente, imputados), ...documentosDelContexto, ...documentos];
        }
      }

      cantidadDocumentosFuente = documentos.length;

      if (!documentos.length) {
        return respuesta.status(409).json({
          error: "El expediente no tiene información procesada para consultar.",
          details: "Cargue un documento o registre datos de gestión en el expediente.",
        });
      }
    } else {
      documentos = [
        { id: "fuente-a", nombre_archivo: "Fuente A", texto_extraido: textoPrincipal },
        ...(textoSecundario ? [{ id: "fuente-b", nombre_archivo: "Fuente B", texto_extraido: textoSecundario }] : []),
      ];
    }

    const consultaDeBusqueda = [consulta, imputadoElegido?.nombre, herramienta.label, textoPrincipal.slice(0, 300)]
      .filter(Boolean)
      .join(" ");
    let fragmentos;
    let recuperacion = "bm25_legal_expansion_trigram_mmr";
    let recuperacionSemantica = "lexical_fallback";
    const maximoFragmentos = herramienta.maxContextChunks || 6;
    if (herramienta.inputs === 2) {
      // Las dos fuentes deben estar representadas, incluso si una tiene más texto.
      fragmentos = documentos.flatMap((documento) => buscarFragmentosRelevantes([documento], `${consultaDeBusqueda} ${documento.texto_extraido.slice(0, 160)}`, Math.ceil(maximoFragmentos / 2)));
      recuperacionSemantica = "balanced_lexical_sources";
    } else {
      fragmentos = buscarFragmentosRelevantes(documentos, consultaDeBusqueda, maximoFragmentos * 2);
      ({ chunks: fragmentos, semanticRetrieval: recuperacionSemantica } = await reordenarFragmentosPorEmbeddings(
      fragmentos,
      consultaDeBusqueda,
      maximoFragmentos,
      Math.min(700, tiempoDisponibleMs(tiempoLimite, 1000))
      ));
    }
    recuperacion = usarContextoDelExpediente
      ? "case_documents_and_management_bm25_legal_expansion_mmr"
      : "bm25_legal_expansion_trigram_mmr";

    if (!fragmentos.length) {
      return respuesta.status(422).json({
        error: "No se encontraron fragmentos relevantes en el material seleccionado.",
        details: "Pruebe reformulando la pregunta o verifique que los documentos tengan texto extraído.",
      });
    }

    const textoPrincipalDelModelo = usarContextoDelExpediente
      ? `Consulta sobre ${etiquetaAlcance}. Use únicamente los pasajes seleccionados por pertinencia.`
      : textoPrincipal.slice(0, 18000);
    let resultado;
    let motor = "ollama_local_timeboxed_rag";
    let motivoRespaldo = null;
    try {
      resultado = await ejecutarHerramientaJuridicaConIA({
        toolId: solicitud.params.toolId,
        primaryText: textoPrincipalDelModelo,
        secondaryText: textoSecundario.slice(0, 18000),
        query: consulta,
        parameters: { ...(solicitud.body?.parameters || {}), scope: alcance, defendant: imputadoElegido?.nombre || null,
          compared_defendants: imputadosComparados.map((elemento) => ({ id: elemento.id, nombre: elemento.nombre })) },
        context: fragmentos.map((fragmento) => `[${fragmento.document_id}:${fragmento.chunk_index ?? fragmento.orden}] ${fragmento.text}`),
        timeoutMs: Math.min(5000, tiempoDisponibleMs(tiempoLimite, 900)),
        maxOutputTokens: 360,
      });
    } catch (error) {
      motivoRespaldo = error.message;
      motor = "fast_extractive_rag";
      resultado = construirResultadoRapido({ toolId: solicitud.params.toolId, chunks: fragmentos, query: consulta, scopeLabel: etiquetaAlcance });
    }

    const citas = construirCitasJuridicas(fragmentos, { caseId: idExpediente });
    const evidencia = evaluarEvidencia(citas);
    const respaldoDeAfirmaciones = verificarAfirmacionesDelResultado(resultado, citas);
    const metadatos = {
      engine: motor, model: obtenerConfiguracionDeIA().model,
      embedding_model: obtenerConfiguracionDeIA().embeddingModel, tool_id: solicitud.params.toolId,
      retrieval: recuperacion, semantic_retrieval: recuperacionSemantica,
      source: comparandoImputados ? "case_defendant_comparison" : usarContextoDelExpediente ? `case_${alcance}` : "ad_hoc_text",
      scope: alcance,
      defendant_id: imputadoElegido?.id || null,
      defendant_name: imputadoElegido?.nombre || null,
      compared_defendants: imputadosComparados.map((elemento) => ({ id: elemento.id, nombre: elemento.nombre })),
      comparison_scope: comparandoImputados ? "fichas_registradas" : null,
      source_document_count: cantidadDocumentosFuente,
      structured_context_count: cantidadDocumentosDeContexto,
      structured_context_warning: avisoContextoEstructurado,
      context_chunk_count: fragmentos.length,
      max_output_tokens: 360,
      response_budget_ms: obtenerPresupuestoDeRespuestaMs(),
      fallback_reason: motivoRespaldo,
      duration_ms: Date.now() - inicioMs, evidence: evidencia, grounding: respaldoDeAfirmaciones, generated_at: new Date().toISOString(),
    };
    let consultaGuardada = null;
    if (idExpediente && tiempoDisponibleMs(tiempoLimite, 150) >= 250) {
      try {
        consultaGuardada = await ejecutarConLimiteDeTiempo(guardarConsultaDeIA({ caseId: idExpediente, userId: solicitud.user.id, toolId: solicitud.params.toolId,
          title: resultado.titulo || herramienta.label, query: consulta, input: { scope: alcance, defendant_id: idImputado,
            defendant_ids: imputadosComparados.map((elemento) => elemento.id), parameters: solicitud.body?.parameters || {} },
          result: resultado, citations: citas, metadata: metadatos }), Math.min(550, tiempoDisponibleMs(tiempoLimite, 150)), "No se alcanzó a guardar la consulta dentro del límite de respuesta.");
      } catch (error) {
        metadatos.persistence_warning = error.message;
      }
    }
    if (consultaGuardada && tiempoDisponibleMs(tiempoLimite, 80) >= 100) {
      try {
        await ejecutarConLimiteDeTiempo(registrarAuditoria(solicitud, { action: "ia.consulta_creada", resourceType: "consulta_ia", resourceId: consultaGuardada.id,
          metadata: { herramienta: solicitud.params.toolId, causa_id: idExpediente, scope: alcance, defendant_id: idImputado } }),
        Math.min(250, tiempoDisponibleMs(tiempoLimite, 80)), "No se alcanzó a registrar la auditoría dentro del límite de respuesta.");
      } catch (error) {
        metadatos.audit_warning = error.message;
      }
    }
    metadatos.duration_ms = Date.now() - inicioMs;
    return respuesta.json({ result: resultado, citations: citas, evidence: evidencia, grounding: respaldoDeAfirmaciones, saved_query: consultaGuardada, _metadata: metadatos });
  } catch (error) {
    return respuesta.status(obtenerEstadoHttpDelErrorDeIA(error)).json({ error: "No se pudo ejecutar la herramienta.", details: error.message });
  }
});

async function reordenarFragmentosPorEmbeddings(fragmentos, consultaDeBusqueda, limite = 6, limiteTiempoMs = 700) {
  try {
    if (!fragmentos.length) return { chunks: [], semanticRetrieval: "lexical_fallback" };
    const embeddings = await generarEmbeddingsDeTextos([
      ampliarConsultaJuridica(consultaDeBusqueda),
      ...fragmentos.map((fragmento) => fragmento.text),
    ], { timeoutMs: limiteTiempoMs });
    const embeddingConsulta = embeddings[0];
    return {
      chunks: fragmentos.map((fragmento, indice) => ({
        ...fragmento,
        embedding_score: calcularSimilitudCoseno(embeddingConsulta, embeddings[indice + 1]),
      }))
        .map((fragmento) => ({ ...fragmento, score: 0.45 * fragmento.score + 0.55 * Math.max(0, fragmento.embedding_score) }))
        .sort((primero, segundo) => segundo.score - primero.score)
        .slice(0, limite),
      semanticRetrieval: "ollama_embeddings",
    };
  } catch {
    return { chunks: fragmentos.slice(0, limite), semanticRetrieval: "lexical_fallback" };
  }
}

function normalizarAlcanceHerramienta(valor) {
  return ["documents", "case", "defendant"].includes(valor) ? valor : "documents";
}

function obtenerEtiquetaDeAlcance(alcance, usarContextoDelExpediente) {
  if (!usarContextoDelExpediente) return "las fuentes seleccionadas";
  if (alcance === "case") return "el expediente completo";
  if (alcance === "defendant") return "el imputado seleccionado y los documentos del expediente";
  return "los documentos del expediente";
}

function crearDocumentoDeImputado(imputado) {
  const contexto = typeof imputado.datos_contexto === "string"
    ? imputado.datos_contexto
    : JSON.stringify(imputado.datos_contexto || {});
  return {
    id: `imputado-${imputado.id}`,
    nombre_archivo: `Ficha de ${imputado.nombre}`,
    texto_extraido: [
      `Imputado: ${imputado.nombre}.`,
      imputado.documento_identidad ? `Documento de identidad: ${imputado.documento_identidad}.` : "",
      imputado.rol ? `Rol en el expediente: ${imputado.rol}.` : "",
      imputado.notas ? `Notas: ${imputado.notas}.` : "",
      contexto && contexto !== "{}" ? `Contexto registrado: ${contexto}.` : "",
    ].filter(Boolean).join(" "),
  };
}

function crearDocumentoDelExpediente(idExpediente, imputados) {
  return {
    id: `expediente-${idExpediente}`,
    nombre_archivo: "Datos generales del expediente",
    texto_extraido: [
      `Expediente interno ${idExpediente}.`,
      imputados.length
        ? `Imputados registrados: ${imputados.map((elemento) => `${elemento.nombre}${elemento.rol ? ` (${elemento.rol})` : ""}`).join(", ")}.`
        : "No hay imputados registrados en el expediente.",
    ].join(" "),
  };
}

async function cargarContextoEstructuradoDelExpediente(idOrganizacion, idExpediente) {
  const [tareas, audiencias, fechas, comunicaciones] = await Promise.all([
    listarTareas(idOrganizacion, { caseId: idExpediente }),
    listarRegistrosDelExpediente("audiencias", idOrganizacion, idExpediente),
    listarFechasDelExpediente(idExpediente),
    listarRegistrosDelExpediente("comunicaciones", idOrganizacion, idExpediente),
  ]);
  return crearDocumentosDelContexto({ tasks: tareas, hearings: audiencias, dates: fechas, communications: comunicaciones });
}

function obtenerPresupuestoDeRespuestaMs() {
  return Math.min(9000, Math.max(3000, Number(process.env.AI_RESPONSE_BUDGET_MS) || 8500));
}

function tiempoDisponibleMs(tiempoLimite, reserva = 0) {
  return Math.max(100, tiempoLimite - Date.now() - reserva);
}

function ejecutarConLimiteDeTiempo(promesa, limiteTiempoMs, mensaje) {
  let temporizador;
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => {
      temporizador = setTimeout(() => rechazar(new Error(mensaje)), Math.max(100, limiteTiempoMs));
    }),
  ]).finally(() => clearTimeout(temporizador));
}

enrutador.post("/analyze", exigirAccesoSiHayExpediente, async (solicitud, respuesta) => {
  const { text: texto } = solicitud.body;

  if (typeof texto !== "string" || texto.trim().length === 0) {
    return respuesta.status(400).json({
      error: "El campo 'text' es obligatorio y debe ser un string no vacio.",
    });
  }

  const errorDeModo = validarModoSoloLocal(solicitud.body.mode);

  if (errorDeModo) {
    return respuesta.status(400).json({ error: errorDeModo });
  }

  return enviarRespuestaDeAnalisis(respuesta, texto, {
    causaId: leerIdNumericoOpcional(solicitud.body.causa_id || solicitud.body.case_id),
    documentoId: leerIdNumericoOpcional(solicitud.body.documento_id),
    persist: leerBooleano(solicitud.body.persist),
  });
});

enrutador.post("/analyze-file", exigirAccesoSiHayExpediente, (solicitud, respuesta) => {
  procesarCargaDeArchivo(solicitud, async (errorDeCarga) => {
    if (errorDeCarga) {
      return respuesta.status(400).json({
        error: obtenerMensajeDeErrorDeCarga(errorDeCarga),
      });
    }

    try {
      const texto = extraerTextoPlano(solicitud.file);
      const archivoFuente = {
        name: solicitud.file.originalname,
        mime_type: solicitud.file.mimetype,
        size_bytes: solicitud.file.size,
      };
      const errorDeModo = validarModoSoloLocal(solicitud.body.mode);

      if (errorDeModo) {
        return respuesta.status(400).json({ error: errorDeModo });
      }

      return enviarRespuestaDeAnalisis(respuesta, texto, {
        causaId: leerIdNumericoOpcional(solicitud.body.causa_id || solicitud.body.case_id),
        documentoId: leerIdNumericoOpcional(solicitud.body.documento_id),
        persist: leerBooleano(solicitud.body.persist),
        sourceFile: archivoFuente,
      });
    } catch (error) {
      return respuesta.status(400).json({
        error: error.message,
      });
    }
  });
});

enrutador.get("/cases/:caseId/documents", exigirAccesoAlExpediente, async (solicitud, respuesta, siguiente) => {
  try {
    const idExpediente = leerIdNumericoObligatorio(solicitud.params.caseId);
    const documentos = await listarDocumentosDelExpediente(idExpediente, { includeUnprocessed: true });

    return respuesta.json({
      documents: documentos.map((documento) => ({
        id: documento.id,
        name: documento.nombre_archivo,
        type: documento.tipo_archivo,
        mime_type: documento.mime_type,
        size_bytes: documento.tamano_bytes,
        status: documento.estado_procesamiento,
        created_at: documento.created_at,
        extracted_text: solicitud.query.include_text === "true" ? documento.texto_extraido : undefined,
      })),
    });
  } catch (error) {
    return siguiente(error);
  }
});

enrutador.post("/rag/query", exigirAccesoAlExpediente, async (solicitud, respuesta, siguiente) => {
  try {
    const idExpediente = leerIdNumericoObligatorio(solicitud.body.causa_id || solicitud.body.case_id);
    const pregunta = String(solicitud.body.question || "").trim();

    if (!pregunta) {
      return respuesta.status(400).json({
        error: "El campo 'question' es obligatorio.",
      });
    }

    let documentos = await listarDocumentosDelExpediente(idExpediente);
    let documentosDelContexto = [];
    try {
      documentosDelContexto = await cargarContextoEstructuradoDelExpediente(solicitud.security.organizationId, idExpediente);
      documentos = [...documentosDelContexto, ...documentos];
    } catch (error) {
      console.warn("Contexto estructurado no disponible para RAG:", error.message);
    }
    const maximoFragmentos = Math.min(20, Math.max(1, Number(solicitud.body.top_k) || 8));
    const fragmentosLexicosExpediente = buscarFragmentosRelevantes(documentos, pregunta, Math.max(3, maximoFragmentos))
      .map((fragmento) => ({ ...fragmento, source_type: "expediente" }));
    let embeddingConsulta = null;
    try {
      [embeddingConsulta] = await generarEmbeddingsDeTextos([ampliarConsultaJuridica(pregunta)]);
    } catch (error) {
      console.warn("Embeddings no disponibles; se usa recuperación léxica:", error.message);
    }
    let fragmentosSemanticosExpediente = [];
    if (embeddingConsulta) {
      try {
        const fragmentosGuardados = await buscarFragmentosDeFormaHibrida({ organizationId: solicitud.security.organizationId, caseId: idExpediente, query: pregunta,
          queryEmbedding: embeddingConsulta, limit: maximoFragmentos });
        fragmentosSemanticosExpediente = fragmentosGuardados.map((elemento) => ({ id: elemento.id, document_id: elemento.documento_id,
          document_name: elemento.nombre_archivo, chunk_index: elemento.orden, page: elemento.pagina,
          text: elemento.texto, score: Number(elemento.score), lexical_score: Number(elemento.lexical_score),
          semantic_score: Number(elemento.semantic_score), metadata: elemento.metadata_json, source_type: "expediente" }));
      } catch (error) {
        console.warn("Índice vectorial del expediente no disponible:", error.message);
      }
    }
    const fragmentosExpediente = fusionarResultadosDelExpediente(fragmentosLexicosExpediente, fragmentosSemanticosExpediente, Math.max(3, Math.ceil(maximoFragmentos / 2)));
    let fragmentosNormativa = [];
    try {
      fragmentosNormativa = await buscarNormativaOficial({ query: pregunta, queryEmbedding: embeddingConsulta, limit: Math.max(5, maximoFragmentos) });
    } catch (error) {
      console.warn("Biblioteca jurídica no disponible:", error.message);
    }
    let fragmentosBiblioteca = [];
    try {
      fragmentosBiblioteca = await buscarFragmentosBiblioteca({ organizationId: solicitud.security.organizationId,
        query: pregunta, queryEmbedding: embeddingConsulta, embeddingModel: obtenerConfiguracionDeIA().embeddingModel,
        limit: Math.min(5, maximoFragmentos) });
    } catch (error) {
      console.warn("Archivos de la biblioteca del estudio no disponibles:", error.message);
    }
    const fragmentos = [...fragmentosExpediente, ...fragmentosNormativa, ...fragmentosBiblioteca];
    const citas = construirCitasJuridicas(fragmentos, { caseId: idExpediente });
    const evidencia = evaluarEvidencia(citas);
    const resultado = construirRespuestaConEvidencia({ question: pregunta, caseChunks: fragmentosExpediente,
      legalChunks: fragmentosNormativa, libraryChunks: fragmentosBiblioteca });

    return respuesta.json({
      answer: resultado.answer,
      case_id: idExpediente,
      confidence: resultado.confidence,
      retrieved_chunks: citas,
      evidence: evidencia,
      engine: "extractive_legal_retrieval",
      retrieval: embeddingConsulta ? "hybrid_lexical_semantic_with_official_law" : "lexical_with_official_law",
      model: null,
      ollama_used: false,
      embedding_model: embeddingConsulta ? obtenerConfiguracionDeIA().embeddingModel : null,
      sources: {
        case_chunks: fragmentosExpediente.length,
        legal_chunks: fragmentosNormativa.length,
        library_chunks: fragmentosBiblioteca.length,
        jurisdiction: "nacional_federal",
      },
    });
  } catch (error) {
    return siguiente(error);
  }
});

enrutador.post("/rag/search", async (solicitud, respuesta) => {
  const { limit: limite = 5, query: consulta, text: texto } = solicitud.body || {};

  if (typeof consulta !== "string" || consulta.trim().length === 0) {
    return respuesta.status(400).json({
      error: "El campo 'query' es obligatorio y debe ser un string no vacio.",
    });
  }

  if (typeof texto !== "string" || texto.trim().length === 0) {
    return respuesta.status(400).json({
      error: "El campo 'text' es obligatorio y debe ser un string no vacio.",
    });
  }

  try {
    const resultadoRag = await buscarEnTextoJuridicoConIA({ text: texto, query: consulta, limit: limite });

    return respuesta.json({
      ...resultadoRag,
      _metadata: {
        engine: "local",
        model: obtenerConfiguracionDeIA().model,
      },
    });
  } catch (error) {
    return respuesta.status(obtenerEstadoHttpDelErrorDeIA(error)).json({
      error: "No se pudo ejecutar la busqueda RAG con la API local.",
      details: error.message,
    });
  }
});

enrutador.post("/rag/extract", (solicitud, respuesta) => {
  if (esSolicitudMultipart(solicitud)) {
    procesarCargaDeArchivo(solicitud, async (errorDeCarga) => {
      if (errorDeCarga) {
        return respuesta.status(400).json({
          error: obtenerMensajeDeErrorDeCarga(errorDeCarga),
        });
      }

      try {
        const texto = await extraerTextoDeArchivo(solicitud.file);

        return respuesta.json(prepararDatosBasicosDelExpediente(texto, {
          name: solicitud.file.originalname,
          mime_type: solicitud.file.mimetype,
          size_bytes: solicitud.file.size,
        }));
      } catch (error) {
        return respuesta.status(400).json({
          error: error.message,
        });
      }
    }, { allowPdf: true });
    return;
  }

  const texto = String(solicitud.body?.text || "").trim();

  if (!texto) {
    return respuesta.status(400).json({
      error: "El campo 'text' es obligatorio o se debe enviar un archivo .txt/.pdf.",
    });
  }

  return respuesta.json(prepararDatosBasicosDelExpediente(texto));
});

async function enviarRespuestaDeAnalisis(respuesta, texto, opciones = {}) {
  try {
    const informeJuridico = await generarInformeJuridicoConIA(texto);
    const metadatos = {
      engine: "local",
      model: obtenerConfiguracionDeIA().model,
      ...extraerMetadatosDelArchivo(opciones.sourceFile),
    };
    const datosDeEnvio = prepararInformeParaFrontend(informeJuridico, metadatos, texto);

    if (opciones.persist) {
      datosDeEnvio._metadata.persistence = await persistirInformeDeAnalisis(datosDeEnvio, texto, {
        causaId: opciones.causaId,
        documentoId: opciones.documentoId,
        metadata: metadatos,
        sourceFile: opciones.sourceFile,
      });
    }

    return respuesta.json(datosDeEnvio);
  } catch (error) {
    return respuesta.status(obtenerEstadoHttpDelErrorDeIA(error)).json({
      error: "No se pudo analizar el texto con la API local.",
      details: error.message,
    });
  }
}

function prepararInformeParaFrontend(informeJuridico, metadatos, texto) {
  const datosLocales = extraerDatosBasicosDelExpediente(texto);
  return {
    informe_abogado: informeJuridico,
    datos_locales: datosLocales,
    ...prepararCamposCompatiblesConFrontend(informeJuridico, datosLocales),
    _metadata: metadatos,
  };
}

async function persistirInformeDeAnalisis(datosDeEnvio, texto, opciones) {
  if (!opciones.causaId) {
    return {
      persisted: false,
      reason: "Para persistir el analisis se debe enviar causa_id o case_id.",
    };
  }

  return guardarAnalisisJuridico({
    analysis: datosDeEnvio,
    causaId: opciones.causaId,
    documentoId: opciones.documentoId,
    metadata: opciones.metadata,
    sourceFile: opciones.sourceFile,
    text: texto,
  });
}

function prepararCamposCompatiblesConFrontend(informeJuridico, datosLocales) {
  return {
    resumen: informeJuridico.resumen_causa,
    tipo_documento: "informe_abogado",
    causa: {
      datos_generales: [
        datosLocales.numero_causa ? `Numero de causa: ${datosLocales.numero_causa}` : null,
        datosLocales.caratula ? `Caratula: ${datosLocales.caratula}` : null,
        datosLocales.tribunal ? `Tribunal: ${datosLocales.tribunal}` : null,
      ].filter(Boolean),
      hechos_relevantes: informeJuridico.lectura_juridica.map((elemento) => `${elemento.tema}: ${elemento.explicacion}`),
    },
    imputados: datosLocales.imputados.map((nombre) => ({
      datos_asociados: [],
      documentos_mencionados: datosLocales.documentos_mencionados,
      hechos_vinculados: [],
      imputaciones: [],
      nombre: nombre,
    })),
    fechas_relevantes: datosLocales.fechas_relevantes.map((fecha) => ({
      evento: "Fecha detectada localmente",
      fecha: fecha,
      fecha_normalizada: null,
      requiere_alerta: false,
      tipo: "fecha_detectada",
    })),
    categorias: [],
    actuaciones_pendientes: datosLocales.vencimientos_o_plazos,
    observaciones: [
      "Ollama genera el informe explicativo; los datos concretos se extraen localmente.",
      ...informeJuridico.limitaciones,
    ],
    nivel_confianza: informeJuridico.nivel_confianza,
    entidades_juridicas: {
      actuaciones: datosLocales.audiencias_o_actos.map((descripcion, indice) => ({
        descripcion: descripcion,
        id: `actuacion-${indice + 1}`,
      })),
      causas: datosLocales.numero_causa
        ? [{ id: "causa-local", identificador: datosLocales.numero_causa, nombre: datosLocales.caratula || "" }]
        : [],
      delitos: datosLocales.delitos.map((nombre, indice) => ({ id: `delito-${indice + 1}`, nombre: nombre })),
      documentos: datosLocales.documentos_mencionados.map((nombre, indice) => ({ id: `documento-${indice + 1}`, nombre: nombre })),
      fechas: datosLocales.fechas_relevantes.map((fecha, indice) => ({ fecha: fecha, id: `fecha-${indice + 1}` })),
      imputados: datosLocales.imputados.map((nombre, indice) => ({ id: `imputado-${indice + 1}`, nombre: nombre })),
      organismos: datosLocales.tribunal ? [{ id: "tribunal-local", nombre: datosLocales.tribunal }] : [],
      victimas: datosLocales.victimas.map((nombre, indice) => ({ id: `victima-${indice + 1}`, nombre: nombre })),
    },
    grafo_conocimiento: {
      nodos: [],
      relaciones: [],
    },
    rag_juridico: {
      consultas_sugeridas: informeJuridico.preguntas_utiles,
      fragmentos: [],
      indice_vectorial: {
        dimensiones: 0,
        fragmentos_indexados: 0,
        persistencia: "datos_locales_no_vectoriales",
        proveedor: "rag_local_reglas",
      },
    },
    analisis_estrategico: {
      cronologia: [],
      inconsistencias: [],
      omisiones_posibles: informeJuridico.limitaciones,
      puntos_revision: informeJuridico.puntos_de_atencion.map((punto) => ({
        descripcion: `${punto.descripcion} ${punto.motivo}`.trim(),
        prioridad: punto.prioridad,
        tipo: "revision_abogado",
      })),
    },
    alertas: [],
    scoring_confianza: {
      factores: [],
      nivel: informeJuridico.nivel_confianza,
      puntaje: calcularPuntajeDeConfianza(informeJuridico.nivel_confianza),
      requiere_revision: informeJuridico.nivel_confianza !== "alto",
    },
  };
}

function calcularPuntajeDeConfianza(nivel) {
  return { alto: 80, medio: 60, bajo: 35 }[nivel] || 35;
}

function prepararDatosBasicosDelExpediente(texto, archivoFuente) {
  return {
    datos_causa: extraerDatosBasicosDelExpediente(texto),
    _metadata: {
      engine: "local_rag_simple_extractor",
      source_file: archivoFuente || null,
    },
  };
}

function extraerMetadatosDelArchivo(archivoFuente) {
  return archivoFuente ? { source_file: archivoFuente } : {};
}

function obtenerMensajeDeErrorDeCarga(error) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return "El archivo supera el limite de 15 MB.";
  }

  return error.message;
}

function validarModoSoloLocal(modo) {
  if (!modo || modo === "local") {
    return null;
  }

  return "Solo esta habilitada la API local. El unico modo disponible es 'local'.";
}

function obtenerEstadoHttpDelErrorDeIA(error) {
  return /API local|Ollama|ECONNREFUSED|ENOTFOUND|tiempo de espera/i.test(error.message)
    ? 503
    : 500;
}

function esSolicitudMultipart(solicitud) {
  return String(solicitud.headers["content-type"] || "").toLowerCase().includes("multipart/form-data");
}

function procesarCargaDeArchivo(solicitud, alCompletar, opciones = {}) {
  const tipoDeContenido = solicitud.headers["content-type"] || "";
  const coincidenciaDelimitador = tipoDeContenido.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!coincidenciaDelimitador) {
    alCompletar(new Error("La solicitud debe usar multipart/form-data."));
    return;
  }

  const delimitador = coincidenciaDelimitador[1] || coincidenciaDelimitador[2];
  const fragmentos = [];
  let totalBytes = 0;
  let finalizado = false;

  solicitud.on("data", (fragmento) => {
    totalBytes += fragmento.length;

    if (totalBytes > MAXIMO_BYTES_ARCHIVO_TEXTO + 1024 * 256) {
      finalizado = true;
      const error = new Error("El archivo supera el limite de 15 MB.");
      error.code = "LIMIT_FILE_SIZE";
      alCompletar(error);
      solicitud.destroy();
      return;
    }

    fragmentos.push(fragmento);
  });

  solicitud.on("error", (error) => {
    if (!finalizado) {
      finalizado = true;
      alCompletar(error);
    }
  });

  solicitud.on("end", () => {
    if (finalizado) {
      return;
    }

    try {
      const interpretado = leerBufferMultipart(Buffer.concat(fragmentos), delimitador);

      if (!interpretado.file) {
        throw new Error("No se recibio un archivo TXT para analizar.");
      }

      if (interpretado.file.size > MAXIMO_BYTES_ARCHIVO_TEXTO) {
        const error = new Error("El archivo supera el limite de 15 MB.");
        error.code = "LIMIT_FILE_SIZE";
        throw error;
      }

      if (opciones.allowAllDocuments ? !esDocumentoCompatible(interpretado.file) : !esArchivoDeTexto(interpretado.file) && !(opciones.allowPdf && esArchivoPdf(interpretado.file))) {
        throw new Error(opciones.allowPdf
          ? "Por ahora solo se admiten archivos .txt o .pdf."
          : opciones.allowAllDocuments ? "Se admiten archivos .pdf, .docx, .txt, .md o .csv." : "Por ahora solo se admiten archivos .txt.");
      }

      solicitud.file = interpretado.file;
      solicitud.body = interpretado.fields;
      finalizado = true;
      alCompletar(null);
    } catch (error) {
      finalizado = true;
      alCompletar(error);
    }
  });
}

function leerBufferMultipart(contenidoBinario, delimitador) {
  const textoSinProcesar = contenidoBinario.toString("binary");
  const tokenDelimitador = `--${delimitador}`;
  const secciones = textoSinProcesar.split(tokenDelimitador).slice(1, -1);
  const campos = {};
  let archivo = null;

  for (const seccion of secciones) {
    const seccionNormalizada = seccion.replace(/^\r\n/, "");
    const indiceSeparador = seccionNormalizada.indexOf("\r\n\r\n");

    if (indiceSeparador < 0) {
      continue;
    }

    const encabezadosSinProcesar = seccionNormalizada.slice(0, indiceSeparador);
    const cuerpoSinProcesar = seccionNormalizada
      .slice(indiceSeparador + 4)
      .replace(/\r\n$/, "");
    const encabezados = leerEncabezadosMultipart(encabezadosSinProcesar);
    const disposicion = encabezados["content-disposition"] || "";
    const nombre = obtenerParametroDeEncabezado(disposicion, "name");
    const nombreArchivo = obtenerParametroDeEncabezado(disposicion, "filename");

    if (!nombre) {
      continue;
    }

    if (nombreArchivo) {
      const bufferArchivo = Buffer.from(cuerpoSinProcesar, "binary");
      archivo = {
        originalname: nombreArchivo,
        mimetype: encabezados["content-type"] || "text/plain",
        size: bufferArchivo.length,
        buffer: bufferArchivo,
      };
    } else {
      campos[nombre] = Buffer.from(cuerpoSinProcesar, "binary").toString("utf8");
    }
  }

  return {
    fields: campos,
    file: archivo,
  };
}

function leerEncabezadosMultipart(encabezadosSinProcesar) {
  return encabezadosSinProcesar.split("\r\n").reduce((encabezados, linea) => {
    const indice = linea.indexOf(":");

    if (indice < 0) {
      return encabezados;
    }

    encabezados[linea.slice(0, indice).trim().toLowerCase()] = linea
      .slice(indice + 1)
      .trim();
    return encabezados;
  }, {});
}

function obtenerParametroDeEncabezado(encabezado, parametro) {
  const coincidencia = encabezado.match(new RegExp(`${parametro}="([^"]*)"`, "i"));

  return coincidencia?.[1] || "";
}

function leerBooleano(valor) {
  return valor === true || valor === "true" || valor === "1";
}

function calcularSimilitudCoseno(izquierda = [], derecha = []) {
  if (!izquierda.length || izquierda.length !== derecha.length) return 0;
  let productoEscalar = 0; let normaIzquierda = 0; let normaDerecha = 0;
  for (let indice = 0; indice < izquierda.length; indice += 1) { productoEscalar += izquierda[indice] * derecha[indice]; normaIzquierda += izquierda[indice] ** 2; normaDerecha += derecha[indice] ** 2; }
  return productoEscalar / (Math.sqrt(normaIzquierda) * Math.sqrt(normaDerecha) || 1);
}

function fusionarResultadosDelExpediente(fragmentosLexicos, fragmentosSemanticos, limite) {
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

function leerIdNumericoOpcional(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }

  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function leerIdNumericoObligatorio(valor) {
  const id = leerIdNumericoOpcional(valor);

  if (!id) {
    const error = new Error("El id de causa debe ser numerico.");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

module.exports = enrutador;
