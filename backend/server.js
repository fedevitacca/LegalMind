require("dotenv").config({ quiet: true });

const express = require("express");
const { analyzeLegalText } = require("./IA/analyzer");
const { analyzeLegalTextWithOpenAI } = require("./IA/openaiAnalyzer");

const app = express();

const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.send("LegalMind backend running");
});

app.get("/api/ia/health", (req, res) => {
  res.json({
    status: "ok",
    module: "LegalMind IA",
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    openai_model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  });
});

app.post("/api/ia/analyze", async (req, res) => {
  const { text, mode = "auto" } = req.body;

  if (typeof text !== "string") {
    return res.status(400).json({
      error: "El campo 'text' es obligatorio y debe ser un string.",
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
