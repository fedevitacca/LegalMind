const express = require("express");
const multer = require("multer");

const { analyzeLegalText } = require("../../IA/analyzer");
const { analyzeLegalTextWithOpenAI } = require("../../IA/openaiAnalyzer");
const {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromTxtFile,
  isTxtFile,
} = require("../../IA/textFile");

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

  return sendAnalysisResponse(res, text, mode);
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

      return sendAnalysisResponse(res, text, req.body.mode || "auto", sourceFile);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  });
});

async function sendAnalysisResponse(res, text, mode, sourceFile) {
  if (!["auto", "openai", "local"].includes(mode)) {
    return res.status(400).json({
      error: "El campo 'mode' debe ser 'auto', 'openai' o 'local'.",
    });
  }

  if (mode === "local") {
    return res.json({
      ...analyzeLegalText(text),
      _metadata: {
        engine: "local",
        fallback_used: false,
        ...buildSourceFileMetadata(sourceFile),
      },
    });
  }

  try {
    const analysis = await analyzeLegalTextWithOpenAI(text);

    return res.json({
      ...analysis,
      _metadata: {
        engine: "openai",
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        fallback_used: false,
        ...buildSourceFileMetadata(sourceFile),
      },
    });
  } catch (error) {
    if (mode === "openai") {
      return res.status(500).json({
        error: "No se pudo analizar el texto con OpenAI.",
        details: error.message,
      });
    }

    return res.json({
      ...analyzeLegalText(text),
      _metadata: {
        engine: "local",
        fallback_used: true,
        fallback_reason: error.message,
        ...buildSourceFileMetadata(sourceFile),
      },
    });
  }
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

module.exports = router;
