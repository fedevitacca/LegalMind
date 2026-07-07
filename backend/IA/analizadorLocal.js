const { LEGALMIND_PROMPT_BASE } = require("./instruccionesBase");
const {
  legalMindAnalysisSchema,
  legalMindLawyerBriefSchema,
  legalMindRagSearchSchema,
} = require("./esquema");

const DEFAULT_LOCAL_AI_BASE_URL = "http://localhost:11434";
const DEFAULT_LOCAL_AI_MODEL = "llama3.1:8b";
const DEFAULT_TIMEOUT_MS = 120000;

let localAIClientFactoryForTests;

function createLocalAIClient() {
  if (localAIClientFactoryForTests) {
    return localAIClientFactoryForTests();
  }

  return {
    chat: (payload) => sendOllamaChatRequest(payload),
  };
}

async function analyzeLegalTextWithLocalAI(text) {
  const responseText = await createLocalAIClient().chat({
    messages: [
      {
        role: "system",
        content: [
          LEGALMIND_PROMPT_BASE,
          "Devolve exclusivamente un JSON valido, sin markdown ni texto adicional.",
          "El JSON debe respetar el schema indicado en esta instruccion.",
          "No inventes datos. Si algo no surge del texto, usa arrays vacios, null u observaciones.",
          "Si detectas informacion incierta, explicalo en observaciones y baja el nivel de confianza.",
          "No supongas resultados de reglas externas al analisis local.",
          "En rag_juridico.indice_vectorial.proveedor usa 'ollama_local'.",
          `Schema JSON esperado:\n${JSON.stringify(legalMindAnalysisSchema)}`,
        ].join("\n\n"),
      },
      {
        role: "user",
        content: `Analiza este documento juridico para LegalMind:\n\n${text}`,
      },
    ],
  });

  return normalizeSchemaValue(
    parseJsonObject(responseText),
    legalMindAnalysisSchema
  );
}

async function buildLawyerBriefWithLocalAI(text) {
  const responseText = await createLocalAIClient().chat({
    messages: [
      {
        role: "system",
        content: [
          LEGALMIND_PROMPT_BASE,
          "Tu tarea principal es explicar y resumir el documento para un abogado penalista.",
          "No hagas extraccion mecanica de datos en forma de ficha. Eso lo hacen otros modulos locales de LegalMind.",
          "Enfocate en: resumen de causa, explicacion practica, lectura juridica, puntos de atencion y preguntas utiles para revisar.",
          "No inventes datos. Si algo no surge del texto, aclaralo en limitaciones.",
          "No emitas asesoramiento juridico definitivo ni conclusiones sobre culpabilidad.",
          "Devolve exclusivamente un JSON valido, sin markdown ni texto adicional.",
          `Schema JSON esperado:\n${JSON.stringify(legalMindLawyerBriefSchema)}`,
        ].join("\n\n"),
      },
      {
        role: "user",
        content: `Prepara un informe breve para abogado sobre este texto juridico:\n\n${text}`,
      },
    ],
  });

  return normalizeSchemaValue(
    parseJsonObject(responseText),
    legalMindLawyerBriefSchema
  );
}

async function searchLegalTextWithLocalAI({ text, query, limit = 5 }) {
  const maxResults = Math.max(1, Number(limit) || 5);
  const responseText = await createLocalAIClient().chat({
    messages: [
      {
        role: "system",
        content: [
          LEGALMIND_PROMPT_BASE,
          "Actua como motor RAG juridico usando exclusivamente el texto provisto por el usuario.",
          "Recupera fragmentos relevantes para la consulta, asigna scores entre 0 y 1 y responde solo con fundamentos del texto.",
          "No inventes hechos ni uses conocimiento externo. Si no hay contexto suficiente, decilo en la respuesta.",
          `Devuelve como maximo ${maxResults} fragmentos.`,
          "Devolve exclusivamente un JSON valido, sin markdown ni texto adicional.",
          `Schema JSON esperado:\n${JSON.stringify(legalMindRagSearchSchema)}`,
        ].join("\n\n"),
      },
      {
        role: "user",
        content: [
          `Consulta: ${query}`,
          "",
          "Texto juridico:",
          text,
        ].join("\n"),
      },
    ],
  });

  return normalizeSchemaValue(
    parseJsonObject(responseText),
    legalMindRagSearchSchema
  );
}

async function sendOllamaChatRequest({ messages }) {
  const baseUrl = (process.env.LOCAL_AI_BASE_URL || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/$/, "");
  const model = process.env.LOCAL_AI_MODEL || DEFAULT_LOCAL_AI_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.LOCAL_AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      body: JSON.stringify({
        format: "json",
        messages,
        model,
        stream: false,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    const bodyText = await response.text();

    if (!response.ok) {
      throw new Error(`La API local respondio ${response.status}: ${bodyText}`);
    }

    const body = JSON.parse(bodyText);
    const content = body?.message?.content || body?.response;

    if (!content) {
      throw new Error("La API local no devolvio contenido analizable.");
    }

    return content;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La API local excedio el tiempo de espera.");
    }

    if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(error.message)) {
      throw new Error(
        `No se pudo conectar con la API local en ${baseUrl}. Verifica que Ollama este iniciado.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObject(rawText) {
  const cleanText = String(rawText || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleanText);
  } catch (firstError) {
    const start = cleanText.indexOf("{");
    const end = cleanText.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleanText.slice(start, end + 1));
    }

    throw new Error(`La API local no devolvio JSON valido: ${firstError.message}`);
  }
}

function normalizeSchemaValue(value, schema) {
  if (schema.type === "array") {
    return Array.isArray(value)
      ? value.map((item) => normalizeSchemaValue(item, schema.items || {}))
      : [];
  }

  if (schema.type === "object") {
    const source = isPlainObject(value) ? value : {};

    return Object.entries(schema.properties || {}).reduce((normalized, [key, propertySchema]) => {
      normalized[key] = normalizeSchemaValue(source[key], propertySchema);
      return normalized;
    }, {});
  }

  if (Array.isArray(schema.type)) {
    if (value === null && schema.type.includes("null")) {
      return null;
    }

    const preferredType = schema.type.find((type) => type !== "null") || schema.type[0];
    return normalizeSchemaValue(value, { ...schema, type: preferredType });
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return schema.enum[0];
  }

  if (schema.type === "boolean") {
    return typeof value === "boolean" ? value : false;
  }

  if (schema.type === "number") {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  if (schema.type === "string") {
    return typeof value === "string" ? value : value == null ? "" : String(value);
  }

  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getLocalAIConfig() {
  return {
    baseUrl: (process.env.LOCAL_AI_BASE_URL || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/$/, ""),
    model: process.env.LOCAL_AI_MODEL || DEFAULT_LOCAL_AI_MODEL,
  };
}

function setLocalAIClientFactoryForTests(factory) {
  localAIClientFactoryForTests = factory;
}

function resetLocalAIClientFactoryForTests() {
  localAIClientFactoryForTests = undefined;
}

module.exports = {
  analyzeLegalTextWithLocalAI,
  buildLawyerBriefWithLocalAI,
  getLocalAIConfig,
  resetLocalAIClientFactoryForTests,
  searchLegalTextWithLocalAI,
  setLocalAIClientFactoryForTests,
};
