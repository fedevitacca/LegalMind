const { LEGALMIND_PROMPT_BASE } = require("./instruccionesBase");
const {
  legalMindAnalysisSchema,
  legalMindLawyerBriefSchema,
  legalMindRagSearchSchema,
} = require("./esquema");

const DEFAULT_LOCAL_AI_BASE_URL = "http://localhost:11434";
const DEFAULT_LOCAL_AI_MODEL = "llama3.1:8b";
const DEFAULT_TIMEOUT_MS = 120000;
const { getTool, toolResultSchema } = require("./motorHerramientas");

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

async function runLegalToolWithLocalAI({ toolId, primaryText, secondaryText = "", query = "", context = [], parameters = {} }) {
  const tool = getTool(toolId);
  if (!tool) throw new Error("La herramienta de IA solicitada no existe.");
  const responseText = await createLocalAIClient().chat({
    format: toolResultSchema,
    maxOutputTokens: 500,
    messages: [{
      role: "system",
      content: [LEGALMIND_PROMPT_BASE, tool.instruction,
        "Trabaja exclusivamente con las fuentes entregadas. No inventes citas, hechos ni normas.",
        "Diferencia evidencia textual de inferencias. Si falta respaldo, aclaralo brevemente en la conclusión.",
        "Escribí como un profesional que deja una nota de trabajo breve para otro abogado.",
        "Usá español claro y directo. No menciones inteligencia artificial, modelos, prompts, RAG ni procesos automáticos.",
        "Evitá introducciones genéricas, repeticiones, adjetivos innecesarios y conclusiones ceremoniales.",
        "Respondé en conclusion con 2 a 4 oraciones y un máximo de 110 palabras.",
        "Agregá entre 2 y 4 puntos_clave distintos, de hasta 40 palabras cada uno. puntos_clave debe ser un array de strings simples, nunca objetos.",
        "Devuelve exclusivamente JSON valido, sin markdown.",
        `Schema esperado: ${JSON.stringify(toolResultSchema)}`].join("\n\n"),
    }, {
      role: "user",
      content: [`Herramienta: ${tool.label}`, `Parametros profesionales: ${JSON.stringify(parameters)}`, query ? `Consulta: ${query}` : "",
        "FUENTE A:", primaryText, secondaryText ? "FUENTE B:" : "", secondaryText,
        context.length ? "FRAGMENTOS RAG RECUPERADOS:" : "", ...context].filter(Boolean).join("\n\n"),
    }],
  });
  return normalizeToolResult(parseJsonObject(responseText));
}

async function sendOllamaChatRequest({ messages, format = "json", maxOutputTokens }) {
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
        format,
        keep_alive: process.env.LOCAL_AI_KEEP_ALIVE || "15m",
        messages,
        model,
        options: { num_ctx: Number(process.env.LOCAL_AI_CONTEXT_SIZE) || 8192,
          num_predict: Number(maxOutputTokens) || Number(process.env.LOCAL_AI_MAX_OUTPUT_TOKENS) || 900,
          temperature: Number(process.env.LOCAL_AI_TEMPERATURE) || 0.1 },
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

function normalizeToolResult(value) {
  const normalized = normalizeSchemaValue(value, toolResultSchema);
  const rawPoints = Array.isArray(value?.puntos_clave) ? value.puntos_clave : [];
  const points = rawPoints
    .map((point) => normalizeToolPoint(point))
    .filter(Boolean)
    .filter((point, index, items) => items.indexOf(point) === index)
    .slice(0, 4);

  return {
    ...normalized,
    conclusion: limitCompleteSentences(normalized.conclusion, 110),
    puntos_clave: points,
  };
}

function normalizeToolPoint(point) {
  if (typeof point === "string") return limitWords(point.trim(), 40);
  if (!isPlainObject(point)) return "";
  const title = String(point.titulo || point.aspecto || "").trim();
  const detail = String(point.detalle || point.descripcion || point.texto || point.conclusion || point.evaluacion || "").trim();
  return limitWords([title, detail].filter(Boolean).join(": "), 40);
}

function limitWords(value, maximum) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maximum) return words.join(" ");
  return `${words.slice(0, maximum).join(" ")}…`;
}

function limitCompleteSentences(value, maximumWords) {
  const text = String(value || "").trim();
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  const selected = [];
  let words = 0;
  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
    if (selected.length && words + sentenceWords > maximumWords) break;
    if (!selected.length && sentenceWords > maximumWords) return limitWords(sentence, maximumWords);
    selected.push(sentence);
    words += sentenceWords;
  }
  return selected.join(" ");
}

async function embedTextsWithLocalAI(texts) {
  if (localAIClientFactoryForTests) throw new Error("Embeddings omitidos durante pruebas aisladas.");
  const baseUrl = (process.env.LOCAL_AI_BASE_URL || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/$/, "");
  const model = process.env.LOCAL_AI_EMBEDDING_MODEL || "nomic-embed-text";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.LOCAL_AI_EMBEDDING_TIMEOUT_MS) || 30000);
  try {
    const response = await fetch(`${baseUrl}/api/embed`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts, keep_alive: process.env.LOCAL_AI_KEEP_ALIVE || "15m" }), signal: controller.signal });
    if (!response.ok) throw new Error(`Embeddings locales no disponibles (${response.status}).`);
    const body = await response.json();
    if (!Array.isArray(body.embeddings) || body.embeddings.length !== texts.length) throw new Error("Respuesta de embeddings invalida.");
    return body.embeddings;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("El modelo de embeddings excedió el tiempo de espera.");
    throw error;
  } finally { clearTimeout(timeout); }
}

async function probeLocalAI() {
  const config = getLocalAIConfig();
  const started = Date.now();
  const response = await fetch(`${config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Ollama respondió ${response.status}.`);
  const body = await response.json();
  const models = (body.models || []).map((item) => item.name);
  return { available: true, latencyMs: Date.now() - started, models,
    chatModelReady: models.some((name) => name === config.model || name.startsWith(`${config.model}:`)),
    embeddingModelReady: models.some((name) => name === config.embeddingModel || name.startsWith(`${config.embeddingModel}:`)) };
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
    embeddingModel: process.env.LOCAL_AI_EMBEDDING_MODEL || "nomic-embed-text",
    timeoutMs: Number(process.env.LOCAL_AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    maxOutputTokens: Number(process.env.LOCAL_AI_MAX_OUTPUT_TOKENS) || 900,
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
  embedTextsWithLocalAI,
  buildLawyerBriefWithLocalAI,
  getLocalAIConfig,
  probeLocalAI,
  resetLocalAIClientFactoryForTests,
  searchLegalTextWithLocalAI,
  runLegalToolWithLocalAI,
  setLocalAIClientFactoryForTests,
};
