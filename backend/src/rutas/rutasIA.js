const express = require("express");

const { analyzeLegalText } = require("../../IA/analizador");
const { analyzeLegalTextWithOpenAI } = require("../../IA/analizadorOpenAI");

const router = express.Router();

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
      },
    });
  }
});

module.exports = router;
