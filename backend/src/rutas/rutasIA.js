const express = require("express");

const {
  analyzeLegalTextWithLocalAI,
  getLocalAIConfig,
  searchLegalTextWithLocalAI,
} = require("../../IA/analizadorLocal");
const {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromSupportedFile,
  extractTextFromTxtFile,
  isPdfFile,
  isTxtFile,
} = require("../../IA/textFile");
const {
  buildExtractiveAnswer,
  extractSimpleCaseData,
  retrieveRelevantChunks,
} = require("../../IA/ragLocal");
const {
  listDocumentsForCase,
  saveLegalAnalysis,
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

async function sendAnalysisResponse(res, text, options = {}) {
  try {
    const analysis = await analyzeLegalTextWithLocalAI(text);
    const metadata = {
      engine: "local",
      model: getLocalAIConfig().model,
      ...buildSourceFileMetadata(options.sourceFile),
    };

    return res.json(await buildAnalysisPayload(analysis, metadata, text, options));
  } catch (error) {
    return res.status(getLocalAIErrorStatus(error)).json({
      error: "No se pudo analizar el texto con la API local.",
      details: error.message,
    });
  }
}

async function buildAnalysisPayload(analysis, metadata, text, options) {
  const payload = {
    ...analysis,
    _metadata: metadata,
  };

  if (!options.persist) {
    return payload;
  }

  try {
    payload._metadata.persistence = await saveLegalAnalysis({
      analysis,
      causaId: options.causaId,
      documentoId: options.documentoId,
      metadata,
      sourceFile: options.sourceFile,
      text,
    });
  } catch (error) {
    payload._metadata.persistence = {
      persisted: false,
      error: error.message,
    };
  }

  return payload;
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
    return "El archivo supera el limite de 5 MB.";
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
      const error = new Error("El archivo supera el limite de 5 MB.");
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
        const error = new Error("El archivo supera el limite de 5 MB.");
        error.code = "LIMIT_FILE_SIZE";
        throw error;
      }

      if (!isTxtFile(parsed.file) && !(options.allowPdf && isPdfFile(parsed.file))) {
        throw new Error(options.allowPdf
          ? "Por ahora solo se admiten archivos .txt o .pdf."
          : "Por ahora solo se admiten archivos .txt.");
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
