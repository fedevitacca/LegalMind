const express = require("express");

const {
  buildLawyerBriefWithLocalAI,
  getLocalAIConfig,
  searchLegalTextWithLocalAI,
  runLegalToolWithLocalAI,
  embedTextsWithLocalAI,
} = require("../../IA/analizadorLocal");
const { getTool, listTools } = require("../../IA/motorHerramientas");
const { createAIQuery, deleteAIQuery, getAIQuery, listAIQueries } = require("../modelos/repositorioConsultasIA");
const {
  triageLegalDocumentWithRandomForest,
} = require("../../IA/randomForestJuridico");
const {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromSupportedFile,
  extractTextFromTxtFile,
  isPdfFile,
  isSupportedDocument,
  isTxtFile,
} = require("../../IA/textFile");
const {
  buildExtractiveAnswer,
  extractSimpleCaseData,
  retrieveRelevantChunks,
} = require("../../IA/ragLocal");
const {
  listDocumentsForCase,
} = require("../modelos/repositorioIA");

const router = express.Router();

router.get("/health", (req, res) => {
  const localAIConfig = getLocalAIConfig();

  res.json({
    status: "ok",
    module: "LegalMind IA",
    local_ai_base_url: localAIConfig.baseUrl,
    local_ai_configured: true,
    local_ai_model: localAIConfig.model,
    local_ai_required: true,
    capabilities: [
      "extraccion_juridica_estructurada",
      "entidades_para_base_juridica",
      "grafo_conocimiento",
      "rag_juridico_local",
      "rag_local_documentos_persistidos",
      "analizador_estrategico",
      "alertas_inteligentes",
      "scoring_confianza",
    ],
  });
});

router.get("/tools", (req, res) => res.json({ tools: listTools() }));

router.post("/extract-file", (req, res) => {
  parseTextFileUpload(req, async (uploadError) => {
    if (uploadError) return res.status(400).json({ error: getUploadErrorMessage(uploadError) });
    try {
      const text = await extractTextFromSupportedFile(req.file);
      return res.json({ document: { name: req.file.originalname, mime_type: req.file.mimetype,
        size_bytes: req.file.size, characters: text.length, text } });
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }, { allowAllDocuments: true });
});

router.get("/cases/:caseId/queries", async (req, res, next) => {
  try { return res.json({ queries: await listAIQueries(parseRequiredNumericId(req.params.caseId)) }); }
  catch (error) { return next(error); }
});
router.get("/cases/:caseId/queries/:queryId", async (req, res, next) => {
  try { const item = await getAIQuery(parseRequiredNumericId(req.params.caseId), parseRequiredNumericId(req.params.queryId));
    return item ? res.json({ query: item }) : res.status(404).json({ error: "Consulta no encontrada." }); }
  catch (error) { return next(error); }
});
router.delete("/cases/:caseId/queries/:queryId", async (req, res, next) => {
  try { const deleted = await deleteAIQuery(parseRequiredNumericId(req.params.caseId), parseRequiredNumericId(req.params.queryId));
    return deleted ? res.status(204).send() : res.status(404).json({ error: "Consulta no encontrada." }); }
  catch (error) { return next(error); }
});

router.post("/tools/:toolId/run", async (req, res) => {
  const tool = getTool(req.params.toolId);
  if (!tool) return res.status(404).json({ error: "Herramienta de IA inexistente." });
  const primaryText = String(req.body?.primary_text || req.body?.text || "").trim();
  const secondaryText = String(req.body?.secondary_text || "").trim();
  const query = String(req.body?.query || "").trim();
  if (!primaryText) return res.status(400).json({ error: "La fuente principal es obligatoria." });
  if (tool.inputs === 2 && !secondaryText) return res.status(400).json({ error: "Esta herramienta requiere dos fuentes." });

  try {
    const documents = [
      { id: "fuente-a", nombre_archivo: "Fuente A", texto_extraido: primaryText },
      ...(secondaryText ? [{ id: "fuente-b", nombre_archivo: "Fuente B", texto_extraido: secondaryText }] : []),
    ];
    const retrievalQuery = query || `${tool.label} ${primaryText.slice(0, 400)}`;
    let chunks = retrieveRelevantChunks(documents, retrievalQuery, 12);
    let semanticRetrieval = "lexical_fallback";
    try {
      const embeddings = await embedTextsWithLocalAI([retrievalQuery, ...chunks.map((chunk) => chunk.text)]);
      const queryEmbedding = embeddings[0];
      chunks = chunks.map((chunk, index) => ({ ...chunk, embedding_score: vectorCosine(queryEmbedding, embeddings[index + 1]) }))
        .map((chunk) => ({ ...chunk, score: 0.45 * chunk.score + 0.55 * Math.max(0, chunk.embedding_score) }))
        .sort((a, b) => b.score - a.score).slice(0, 8);
      semanticRetrieval = "ollama_embeddings";
    } catch { chunks = chunks.slice(0, 8); }
    const result = await runLegalToolWithLocalAI({
      toolId: req.params.toolId, primaryText, secondaryText, query,
      parameters: req.body?.parameters || {},
      context: chunks.map((chunk) => `[${chunk.document_id}:${chunk.chunk_index}] ${chunk.text}`),
    });
    const metadata = {
      engine: "ollama_local_hybrid_rag", model: getLocalAIConfig().model,
      tool_id: req.params.toolId, retrieval: "bm25_trigram_mmr_embeddings", semantic_retrieval: semanticRetrieval, generated_at: new Date().toISOString(),
    };
    let savedQuery = null;
    const caseId = parseOptionalNumericId(req.body?.case_id);
    if (caseId) savedQuery = await createAIQuery({ caseId, toolId: req.params.toolId,
      title: result.titulo || tool.label, query, input: { primary_text: primaryText, secondary_text: secondaryText, parameters: req.body?.parameters || {} },
      result, citations: chunks, metadata });
    return res.json({ result, citations: chunks, saved_query: savedQuery, _metadata: metadata });
  } catch (error) {
    return res.status(getLocalAIErrorStatus(error)).json({ error: "No se pudo ejecutar la herramienta.", details: error.message });
  }
});

router.post("/analyze", async (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "El campo 'text' es obligatorio y debe ser un string no vacio.",
    });
  }

  const modeError = validateLocalOnlyMode(req.body.mode);

  if (modeError) {
    return res.status(400).json({ error: modeError });
  }

  return sendAnalysisResponse(res, text, {
    causaId: parseOptionalNumericId(req.body.causa_id || req.body.case_id),
    documentoId: parseOptionalNumericId(req.body.documento_id),
    persist: parseBoolean(req.body.persist),
  });
});

router.post("/analyze-file", (req, res) => {
  parseTextFileUpload(req, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        error: getUploadErrorMessage(uploadError),
      });
    }

    try {
      const text = extractTextFromTxtFile(req.file);
      const sourceFile = {
        name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
      };
      const modeError = validateLocalOnlyMode(req.body.mode);

      if (modeError) {
        return res.status(400).json({ error: modeError });
      }

      return sendAnalysisResponse(res, text, {
        causaId: parseOptionalNumericId(req.body.causa_id || req.body.case_id),
        documentoId: parseOptionalNumericId(req.body.documento_id),
        persist: parseBoolean(req.body.persist),
        sourceFile,
      });
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  });
});

router.get("/cases/:caseId/documents", async (req, res, next) => {
  try {
    const caseId = parseRequiredNumericId(req.params.caseId);
    const documents = await listDocumentsForCase(caseId);

    return res.json({
      documents: documents.map((document) => ({
        id: document.id,
        name: document.nombre_archivo,
        type: document.tipo_archivo,
        mime_type: document.mime_type,
        size_bytes: document.tamano_bytes,
        status: document.estado_procesamiento,
        created_at: document.created_at,
        extracted_text: req.query.include_text === "true" ? document.texto_extraido : undefined,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/rag/query", async (req, res, next) => {
  try {
    const caseId = parseRequiredNumericId(req.body.causa_id || req.body.case_id);
    const question = String(req.body.question || "").trim();

    if (!question) {
      return res.status(400).json({
        error: "El campo 'question' es obligatorio.",
      });
    }

    const documents = await listDocumentsForCase(caseId);
    const chunks = retrieveRelevantChunks(documents, question, Number(req.body.top_k) || 5);
    const contextText = chunks
      .map((chunk) => [
        `Documento: ${chunk.document_name}`,
        `Fragmento ${chunk.chunk_index + 1}:`,
        chunk.text,
      ].join("\n"))
      .join("\n\n---\n\n");

    if (!contextText.trim()) {
      const answer = buildExtractiveAnswer(question, chunks);

      return res.json({
        ...answer,
        case_id: caseId,
        retrieved_chunks: chunks,
        engine: "ollama_rag",
        model: getLocalAIConfig().model,
      });
    }

    const ragResult = await searchLegalTextWithLocalAI({
      limit: Number(req.body.top_k) || 5,
      query: question,
      text: contextText,
    });

    return res.json({
      answer: ragResult.answer?.respuesta || "No se pudo generar una respuesta con respaldo.",
      case_id: caseId,
      confidence: ragResult.answer?.requiere_revision ? "medio" : "alto",
      retrieved_chunks: chunks,
      engine: "ollama_rag",
      model: getLocalAIConfig().model,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/rag/search", async (req, res) => {
  const { limit = 5, query, text } = req.body || {};

  if (typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({
      error: "El campo 'query' es obligatorio y debe ser un string no vacio.",
    });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "El campo 'text' es obligatorio y debe ser un string no vacio.",
    });
  }

  try {
    const ragResult = await searchLegalTextWithLocalAI({ text, query, limit });

    return res.json({
      ...ragResult,
      _metadata: {
        engine: "local",
        model: getLocalAIConfig().model,
      },
    });
  } catch (error) {
    return res.status(getLocalAIErrorStatus(error)).json({
      error: "No se pudo ejecutar la busqueda RAG con la API local.",
      details: error.message,
    });
  }
});

router.post("/rag/extract", (req, res) => {
  if (isMultipartRequest(req)) {
    parseTextFileUpload(req, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          error: getUploadErrorMessage(uploadError),
        });
      }

      try {
        const text = await extractTextFromSupportedFile(req.file);

        return res.json(buildSimpleCaseDataPayload(text, {
          name: req.file.originalname,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
        }));
      } catch (error) {
        return res.status(400).json({
          error: error.message,
        });
      }
    }, { allowPdf: true });
    return;
  }

  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({
      error: "El campo 'text' es obligatorio o se debe enviar un archivo .txt/.pdf.",
    });
  }

  return res.json(buildSimpleCaseDataPayload(text));
});

router.post("/random-forest/triage", (req, res) => {
  if (isMultipartRequest(req)) {
    parseTextFileUpload(req, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          error: getUploadErrorMessage(uploadError),
        });
      }

      try {
        const text = await extractTextFromSupportedFile(req.file);

        return res.json(buildRandomForestTriagePayload(text, {
          name: req.file.originalname,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
        }));
      } catch (error) {
        return res.status(400).json({
          error: error.message,
        });
      }
    }, { allowPdf: true });
    return;
  }

  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({
      error: "El campo 'text' es obligatorio o se debe enviar un archivo .txt/.pdf.",
    });
  }

  return res.json(buildRandomForestTriagePayload(text));
});

async function sendAnalysisResponse(res, text, options = {}) {
  try {
    const lawyerBrief = await buildLawyerBriefWithLocalAI(text);
    const metadata = {
      engine: "local",
      model: getLocalAIConfig().model,
      ...buildSourceFileMetadata(options.sourceFile),
    };

    return res.json(buildLawyerAnalysisPayload(lawyerBrief, metadata, text, options));
  } catch (error) {
    return res.status(getLocalAIErrorStatus(error)).json({
      error: "No se pudo analizar el texto con la API local.",
      details: error.message,
    });
  }
}

function buildLawyerAnalysisPayload(lawyerBrief, metadata, text, options = {}) {
  const localData = extractSimpleCaseData(text);
  const triage = triageLegalDocumentWithRandomForest(text);
  const payload = {
    informe_abogado: lawyerBrief,
    datos_locales: localData,
    triage,
    ...buildFrontendCompatibilityFields(lawyerBrief, localData, triage),
    _metadata: metadata,
  };

  if (options.persist) {
    payload._metadata.persistence = {
      persisted: false,
      reason:
        "El analisis con Ollama ahora genera informes explicativos. La persistencia estructurada debe usar datos locales extraidos por RAG/Random Forest.",
    };
  }

  return payload;
}

function buildFrontendCompatibilityFields(lawyerBrief, localData, triage) {
  return {
    resumen: lawyerBrief.resumen_causa,
    tipo_documento: "informe_abogado",
    causa: {
      datos_generales: [
        localData.numero_causa ? `Numero de causa: ${localData.numero_causa}` : null,
        localData.caratula ? `Caratula: ${localData.caratula}` : null,
        localData.tribunal ? `Tribunal: ${localData.tribunal}` : null,
      ].filter(Boolean),
      hechos_relevantes: lawyerBrief.lectura_juridica.map((item) => `${item.tema}: ${item.explicacion}`),
    },
    imputados: localData.imputados.map((name) => ({
      datos_asociados: [],
      documentos_mencionados: localData.documentos_mencionados,
      hechos_vinculados: [],
      imputaciones: [],
      nombre: name,
    })),
    fechas_relevantes: localData.fechas_relevantes.map((date) => ({
      evento: "Fecha detectada localmente",
      fecha: date,
      fecha_normalizada: null,
      requiere_alerta: ["alta", "urgente"].includes(triage.prioridad),
      tipo: "fecha_detectada",
    })),
    categorias: triage.senales_detectadas.map((signal) => signal.descripcion),
    actuaciones_pendientes: localData.vencimientos_o_plazos,
    observaciones: [
      "Ollama genera el informe explicativo; los datos concretos se extraen localmente.",
      ...lawyerBrief.limitaciones,
    ],
    nivel_confianza: lawyerBrief.nivel_confianza,
    entidades_juridicas: {
      actuaciones: localData.audiencias_o_actos.map((description, index) => ({
        descripcion: description,
        id: `actuacion-${index + 1}`,
      })),
      causas: localData.numero_causa
        ? [{ id: "causa-local", identificador: localData.numero_causa, nombre: localData.caratula || "" }]
        : [],
      delitos: localData.delitos.map((name, index) => ({ id: `delito-${index + 1}`, nombre: name })),
      documentos: localData.documentos_mencionados.map((name, index) => ({ id: `documento-${index + 1}`, nombre: name })),
      fechas: localData.fechas_relevantes.map((date, index) => ({ fecha: date, id: `fecha-${index + 1}` })),
      imputados: localData.imputados.map((name, index) => ({ id: `imputado-${index + 1}`, nombre: name })),
      organismos: localData.tribunal ? [{ id: "tribunal-local", nombre: localData.tribunal }] : [],
      victimas: localData.victimas.map((name, index) => ({ id: `victima-${index + 1}`, nombre: name })),
    },
    grafo_conocimiento: {
      nodos: [],
      relaciones: [],
    },
    rag_juridico: {
      consultas_sugeridas: lawyerBrief.preguntas_utiles,
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
      omisiones_posibles: lawyerBrief.limitaciones,
      puntos_revision: lawyerBrief.puntos_de_atencion.map((point) => ({
        descripcion: `${point.descripcion} ${point.motivo}`.trim(),
        prioridad: point.prioridad,
        tipo: "revision_abogado",
      })),
    },
    alertas: triage.prioridad === "urgente" || triage.prioridad === "alta"
      ? [{
          descripcion: triage.recomendacion,
          fecha: null,
          prioridad: triage.prioridad,
          tipo: "triage_random_forest",
          titulo: `Revision ${triage.prioridad}`,
        }]
      : [],
    scoring_confianza: {
      factores: triage.senales_detectadas.map((signal) => signal.descripcion),
      nivel: lawyerBrief.nivel_confianza,
      puntaje: Math.round(triage.confianza * 100),
      requiere_revision: triage.prioridad !== "baja",
    },
  };
}

function buildRandomForestTriagePayload(text, sourceFile) {
  return {
    triage: triageLegalDocumentWithRandomForest(text),
    _metadata: {
      engine: "legalmind_random_forest_triage",
      source_file: sourceFile || null,
    },
  };
}

function buildSimpleCaseDataPayload(text, sourceFile) {
  return {
    datos_causa: extractSimpleCaseData(text),
    _metadata: {
      engine: "local_rag_simple_extractor",
      source_file: sourceFile || null,
    },
  };
}

function buildSourceFileMetadata(sourceFile) {
  return sourceFile ? { source_file: sourceFile } : {};
}

function getUploadErrorMessage(error) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return "El archivo supera el limite de 15 MB.";
  }

  return error.message;
}

function validateLocalOnlyMode(mode) {
  if (!mode || mode === "local") {
    return null;
  }

  return "Solo esta habilitada la API local. El unico modo disponible es 'local'.";
}

function getLocalAIErrorStatus(error) {
  return /API local|Ollama|ECONNREFUSED|ENOTFOUND|tiempo de espera/i.test(error.message)
    ? 503
    : 500;
}

function isMultipartRequest(req) {
  return String(req.headers["content-type"] || "").toLowerCase().includes("multipart/form-data");
}

function parseTextFileUpload(req, callback, options = {}) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    callback(new Error("La solicitud debe usar multipart/form-data."));
    return;
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const chunks = [];
  let totalBytes = 0;
  let finished = false;

  req.on("data", (chunk) => {
    totalBytes += chunk.length;

    if (totalBytes > MAX_TEXT_FILE_SIZE_BYTES + 1024 * 256) {
      finished = true;
      const error = new Error("El archivo supera el limite de 15 MB.");
      error.code = "LIMIT_FILE_SIZE";
      callback(error);
      req.destroy();
      return;
    }

    chunks.push(chunk);
  });

  req.on("error", (error) => {
    if (!finished) {
      finished = true;
      callback(error);
    }
  });

  req.on("end", () => {
    if (finished) {
      return;
    }

    try {
      const parsed = parseMultipartBuffer(Buffer.concat(chunks), boundary);

      if (!parsed.file) {
        throw new Error("No se recibio un archivo TXT para analizar.");
      }

      if (parsed.file.size > MAX_TEXT_FILE_SIZE_BYTES) {
        const error = new Error("El archivo supera el limite de 15 MB.");
        error.code = "LIMIT_FILE_SIZE";
        throw error;
      }

      if (options.allowAllDocuments ? !isSupportedDocument(parsed.file) : !isTxtFile(parsed.file) && !(options.allowPdf && isPdfFile(parsed.file))) {
        throw new Error(options.allowPdf
          ? "Por ahora solo se admiten archivos .txt o .pdf."
          : options.allowAllDocuments ? "Se admiten archivos .pdf, .docx, .txt, .md o .csv." : "Por ahora solo se admiten archivos .txt.");
      }

      req.file = parsed.file;
      req.body = parsed.fields;
      finished = true;
      callback(null);
    } catch (error) {
      finished = true;
      callback(error);
    }
  });
}

function parseMultipartBuffer(buffer, boundary) {
  const raw = buffer.toString("binary");
  const boundaryToken = `--${boundary}`;
  const sections = raw.split(boundaryToken).slice(1, -1);
  const fields = {};
  let file = null;

  for (const section of sections) {
    const normalizedSection = section.replace(/^\r\n/, "");
    const separatorIndex = normalizedSection.indexOf("\r\n\r\n");

    if (separatorIndex < 0) {
      continue;
    }

    const rawHeaders = normalizedSection.slice(0, separatorIndex);
    const rawBody = normalizedSection
      .slice(separatorIndex + 4)
      .replace(/\r\n$/, "");
    const headers = parseMultipartHeaders(rawHeaders);
    const disposition = headers["content-disposition"] || "";
    const name = getHeaderParameter(disposition, "name");
    const filename = getHeaderParameter(disposition, "filename");

    if (!name) {
      continue;
    }

    if (filename) {
      const fileBuffer = Buffer.from(rawBody, "binary");
      file = {
        originalname: filename,
        mimetype: headers["content-type"] || "text/plain",
        size: fileBuffer.length,
        buffer: fileBuffer,
      };
    } else {
      fields[name] = Buffer.from(rawBody, "binary").toString("utf8");
    }
  }

  return {
    fields,
    file,
  };
}

function parseMultipartHeaders(rawHeaders) {
  return rawHeaders.split("\r\n").reduce((headers, line) => {
    const index = line.indexOf(":");

    if (index < 0) {
      return headers;
    }

    headers[line.slice(0, index).trim().toLowerCase()] = line
      .slice(index + 1)
      .trim();
    return headers;
  }, {});
}

function getHeaderParameter(header, parameter) {
  const match = header.match(new RegExp(`${parameter}="([^"]*)"`, "i"));

  return match?.[1] || "";
}

function parseBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function vectorCosine(left = [], right = []) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) { dot += left[index] * right[index]; leftNorm += left[index] ** 2; rightNorm += right[index] ** 2; }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm) || 1);
}

function parseOptionalNumericId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function parseRequiredNumericId(value) {
  const id = parseOptionalNumericId(value);

  if (!id) {
    const error = new Error("El id de causa debe ser numerico.");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

module.exports = router;
