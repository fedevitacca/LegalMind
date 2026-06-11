const express = require("express");

const {
  analyzeLegalTextWithOpenAI,
  searchLegalTextWithOpenAI,
} = require("../../IA/analizadorOpenAI");
const {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromTxtFile,
  isTxtFile,
} = require("../../IA/textFile");
const { saveLegalAnalysis } = require("../modelos/repositorioIA");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    module: "LegalMind IA",
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    openai_model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    openai_required: true,
    capabilities: [
      "extraccion_juridica_estructurada",
      "entidades_para_base_juridica",
      "grafo_conocimiento",
      "rag_juridico_openai",
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

  const modeError = validateOpenAIOnlyMode(req.body.mode);

  if (modeError) {
    return res.status(400).json({ error: modeError });
  }

  return sendAnalysisResponse(res, text, {
    causaId: parseOptionalNumericId(req.body.causa_id),
    documentoId: parseOptionalNumericId(req.body.documento_id),
    persist: req.body.persist === true,
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
      const modeError = validateOpenAIOnlyMode(req.body.mode);

      if (modeError) {
        return res.status(400).json({ error: modeError });
      }

      return sendAnalysisResponse(res, text, {
        causaId: parseOptionalNumericId(req.body.causa_id),
        documentoId: parseOptionalNumericId(req.body.documento_id),
        persist: req.body.persist === "true" || req.body.persist === true,
        sourceFile,
      });
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  });
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
    const ragResult = await searchLegalTextWithOpenAI({ text, query, limit });

    return res.json({
      ...ragResult,
      _metadata: {
        engine: "openai",
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      },
    });
  } catch (error) {
    return res.status(getOpenAIErrorStatus(error)).json({
      error: "No se pudo ejecutar la busqueda RAG con OpenAI.",
      details: error.message,
    });
  }
});

async function sendAnalysisResponse(res, text, options = {}) {
  try {
    const analysis = await analyzeLegalTextWithOpenAI(text);
    const metadata = {
      engine: "openai",
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      ...buildSourceFileMetadata(options.sourceFile),
    };

    return res.json(await buildAnalysisPayload(analysis, metadata, options));
  } catch (error) {
    return res.status(getOpenAIErrorStatus(error)).json({
      error: "No se pudo analizar el texto con OpenAI.",
      details: error.message,
    });
  }
}

async function buildAnalysisPayload(analysis, metadata, options) {
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
    });
  } catch (error) {
    payload._metadata.persistence = {
      persisted: false,
      error: error.message,
    };
  }

  return payload;
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

function validateOpenAIOnlyMode(mode) {
  if (!mode || mode === "openai") {
    return null;
  }

  return "Solo esta habilitado OpenAI. El unico modo disponible es 'openai'.";
}

function getOpenAIErrorStatus(error) {
  return /OPENAI_API_KEY|SDK de OpenAI/i.test(error.message) ? 503 : 500;
}

function parseTextFileUpload(req, callback) {
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

      if (!isTxtFile(parsed.file)) {
        throw new Error("Por ahora solo se admiten archivos .txt.");
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

module.exports = router;
