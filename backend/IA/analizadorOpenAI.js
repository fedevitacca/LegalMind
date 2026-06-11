const { LEGALMIND_PROMPT_BASE } = require("./instruccionesBase");
const {
  legalMindAnalysisSchema,
  legalMindRagSearchSchema,
} = require("./esquema");

let openAIClientFactoryForTests;

function createOpenAIClient() {
  if (openAIClientFactoryForTests) {
    return openAIClientFactoryForTests();
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta configurar OPENAI_API_KEY en el archivo .env del backend.");
  }

  let OpenAI;

  try {
    OpenAI = require("openai");
  } catch (error) {
    throw new Error(`No se pudo cargar el SDK de OpenAI: ${error.message}`);
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function analyzeLegalTextWithOpenAI(text) {
  const client = createOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          LEGALMIND_PROMPT_BASE,
          "Devolve exclusivamente un JSON que respete el schema indicado.",
          "No inventes datos. Si algo no surge del texto, usa arrays vacios u observaciones.",
          "Si detectas informacion incierta, explicalo en observaciones y baja el nivel de confianza.",
          "No supongas resultados de reglas externas al analisis de OpenAI.",
          "En rag_juridico.indice_vectorial.proveedor usa 'openai_responses_api' salvo que el texto indique otra fuente.",
        ].join("\n\n"),
      },
      {
        role: "user",
        content: `Analiza este documento juridico para LegalMind:\n\n${text}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "legalmind_analysis",
        strict: true,
        schema: legalMindAnalysisSchema,
      },
    },
  });

  return JSON.parse(response.output_text);
}

async function searchLegalTextWithOpenAI({ text, query, limit = 5 }) {
  const client = createOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          LEGALMIND_PROMPT_BASE,
          "Actua como motor RAG juridico usando exclusivamente el texto provisto por el usuario.",
          "Recupera fragmentos relevantes para la consulta, asigna scores entre 0 y 1 y responde solo con fundamentos del texto.",
          "No inventes hechos ni uses conocimiento externo. Si no hay contexto suficiente, decilo en la respuesta.",
          `Devuelve como maximo ${Math.max(1, Number(limit) || 5)} fragmentos.`,
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
    text: {
      format: {
        type: "json_schema",
        name: "legalmind_rag_search",
        strict: true,
        schema: legalMindRagSearchSchema,
      },
    },
  });

  return JSON.parse(response.output_text);
}

function setOpenAIClientFactoryForTests(factory) {
  openAIClientFactoryForTests = factory;
}

function resetOpenAIClientFactoryForTests() {
  openAIClientFactoryForTests = undefined;
}

module.exports = {
  analyzeLegalTextWithOpenAI,
  resetOpenAIClientFactoryForTests,
  searchLegalTextWithOpenAI,
  setOpenAIClientFactoryForTests,
};
