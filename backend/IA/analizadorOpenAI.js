const OpenAI = require("openai");
const { LEGALMIND_PROMPT_BASE } = require("./instruccionesBase");
const { legalMindAnalysisSchema } = require("./esquema");

function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta configurar OPENAI_API_KEY en el archivo .env del backend.");
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

module.exports = {
  analyzeLegalTextWithOpenAI,
};
