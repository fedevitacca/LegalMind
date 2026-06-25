const express = require("express");
const multer = require("multer");

const { analyzeLegalText } = require("../../IA/analizador");
const { analyzeLegalTextWithOpenAI } = require("../../IA/analizadorOpenAI");
const {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromTxtFile,
  isTxtFile,
} = require("../../IA/textFile");
const {
  buildExtractiveAnswer,
  retrieveRelevantChunks,
} = require("../../IA/ragLocal");
const {
  listDocumentsForCase,
  saveAnalysisResult,
} = require("../modelos/repositorioIA");

const router = express.Router();
const uploadTextFile = multer({
  limits: {
    fileSize: MAX_TEXT_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!isTxtFile(file)) {
      callback(new Error("Por ahora solo se admiten archivos .txt."));
      return;
    }

    callback(null, true);
  },
}).single("file");

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    module: "LegalMind IA",
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    openai_model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  });
});

router.post("/analyze", async (req, res) => {
  const { text, mode = "auto" } = req.body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "El campo 'text' es obligatorio y debe ser un string no vacio.",
    });
  }

  return sendAnalysisResponse(res, text, mode, {
    causaId: parseOptionalPositiveInteger(req.body.causa_id || req.body.case_id),
    persist: parseBoolean(req.body.persist),
  });
});

router.post("/analyze-file", (req, res) => {
  uploadTextFile(req, res, async (uploadError) => {
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

      return sendAnalysisResponse(res, text, req.body.mode || "auto", {
        causaId: parseOptionalPositiveInteger(req.body.causa_id || req.body.case_id),
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
    const caseId = parseRequiredPositiveInteger(req.params.caseId);
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
    const caseId = parseRequiredPositiveInteger(req.body.causa_id || req.body.case_id);
    const question = String(req.body.question || "").trim();

    if (!question) {
      return res.status(400).json({
        error: "El campo 'question' es obligatorio.",
      });
    }

    const documents = await listDocumentsForCase(caseId);
    const chunks = retrieveRelevantChunks(documents, question, Number(req.body.top_k) || 5);
    const answer = buildExtractiveAnswer(question, chunks);

    return res.json({
      ...answer,
      case_id: caseId,
      retrieved_chunks: chunks,
      engine: "local_rag",
    });
  } catch (error) {
    return next(error);
  }
});

async function sendAnalysisResponse(res, text, mode, options = {}) {
  if (!["auto", "openai", "local"].includes(mode)) {
    return res.status(400).json({
      error: "El campo 'mode' debe ser 'auto', 'openai' o 'local'.",
    });
  }

  if (mode === "local") {
    const analysis = analyzeLegalText(text);
    const metadata = {
      engine: "local",
      fallback_used: false,
      ...buildSourceFileMetadata(options.sourceFile),
    };

    return sendPersistablePayload(res, {
      ...analysis,
      _metadata: metadata,
    }, text, options);
  }

  try {
    const analysis = await analyzeLegalTextWithOpenAI(text);
    const metadata = {
      engine: "openai",
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      fallback_used: false,
      ...buildSourceFileMetadata(options.sourceFile),
    };

    return sendPersistablePayload(res, {
      ...analysis,
      _metadata: metadata,
    }, text, options);
  } catch (error) {
    if (mode === "openai") {
      return res.status(500).json({
        error: "No se pudo analizar el texto con OpenAI.",
        details: error.message,
      });
    }

    const analysis = analyzeLegalText(text);
    const metadata = {
      engine: "local",
      fallback_used: true,
      fallback_reason: error.message,
      ...buildSourceFileMetadata(options.sourceFile),
    };

    return sendPersistablePayload(res, {
      ...analysis,
      _metadata: metadata,
    }, text, options);
  }
}

async function sendPersistablePayload(res, payload, text, options) {
  if (!options.persist) {
    return res.json(payload);
  }

  try {
    const persistence = await saveAnalysisResult({
      analysis: stripMetadata(payload),
      causaId: options.causaId,
      metadata: payload._metadata,
      sourceFile: options.sourceFile,
      text,
    });

    return res.json({
      ...payload,
      _metadata: {
        ...payload._metadata,
        persistence,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: "No se pudo guardar el analisis.",
      details: error.message,
    });
  }
}

function stripMetadata(payload) {
  const { _metadata, ...analysis } = payload;
  return analysis;
}

function buildSourceFileMetadata(sourceFile) {
  return sourceFile ? { source_file: sourceFile } : {};
}

function getUploadErrorMessage(error) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return "El archivo supera el limite de 5 MB.";
  }

  return error.message;
}

function parseBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function parseOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return parseRequiredPositiveInteger(value);
}

function parseRequiredPositiveInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error("El id de causa debe ser numerico.");
    error.statusCode = 400;
    throw error;
  }

  return number;
}

module.exports = router;
