const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");

const {
  embedTextsWithLocalAI,
  getLocalAIConfig,
  probeLocalAI,
  resetLocalAIClientFactoryForTests,
  runCaseChatWithLocalAI,
  runCaseChatPlainWithLocalAI,
  setLocalAIClientFactoryForTests,
} = require("./analizadorLocal");

const originalFetch = global.fetch;
const originalEnvironment = {
  LOCAL_AI_BASE_URL: process.env.LOCAL_AI_BASE_URL,
  LOCAL_AI_EMBEDDING_MODEL: process.env.LOCAL_AI_EMBEDDING_MODEL,
  LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL,
  OLLAMA_API_KEY: process.env.OLLAMA_API_KEY,
};

describe("cliente Ollama", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    resetLocalAIClientFactoryForTests();
    restoreEnvironment();
  });

  it("envia memoria y fuentes al chat del expediente con salida estructurada", async () => {
    let payload;
    setLocalAIClientFactoryForTests(() => ({ chat: async (value) => {
      payload = value;
      return JSON.stringify({ answer: "La audiencia figura para el 12 de mayo [FUENTE 1].",
        suggested_questions: ["¿Quiénes participan?"], limitations: [] });
    } }));

    const result = await runCaseChatWithLocalAI({ question: "¿Cuándo es la audiencia?",
      history: [{ role: "usuario", content: "Revisemos las próximas fechas" }],
      context: [{ documentName: "Agenda", location: "Fragmento 1", text: "Audiencia: 12 de mayo." }] });

    assert.match(payload.messages.at(-1).content, /Audiencia: 12 de mayo/);
    assert.ok(payload.messages.some((message) => message.content.includes("Revisemos las próximas fechas")));
    assert.match(result.answer, /12 de mayo/);
    assert.deepEqual(result.suggestedQuestions, ["¿Quiénes participan?"]);
  });

  it("permite un reintento conversacional libre sin exigir JSON", async () => {
    let payload;
    setLocalAIClientFactoryForTests(() => ({ chat: async (value) => {
      payload = value;
      return "La pericia acredita el acceso, pero no identifica al operador [FUENTE 1].";
    } }));
    const result = await runCaseChatPlainWithLocalAI({ question: "Evalua la pericia",
      context: [{ documentName: "Pericia", text: "No fue posible identificar a la persona que opero." }] });
    assert.equal(payload.format, null);
    assert.match(result.answer, /no identifica al operador/i);
  });

  it("envia la API key a Ollama Cloud sin exponerla en la configuracion", async () => {
    process.env.LOCAL_AI_BASE_URL = "https://ollama.com";
    process.env.LOCAL_AI_MODEL = "gpt-oss:20b";
    process.env.OLLAMA_API_KEY = "test-cloud-secret";
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ models: [{ name: "gpt-oss:20b" }] }),
      };
    };

    const health = await probeLocalAI();
    const config = getLocalAIConfig();

    assert.equal(request.url, "https://ollama.com/api/tags");
    assert.equal(request.options.headers.Authorization, "Bearer test-cloud-secret");
    assert.equal(health.chatModelReady, true);
    assert.equal(config.authenticated, true);
    assert.equal(JSON.stringify(config).includes("test-cloud-secret"), false);
  });

  it("mantiene Ollama local sin encabezado de autenticacion", async () => {
    process.env.LOCAL_AI_BASE_URL = "http://localhost:11434";
    process.env.LOCAL_AI_MODEL = "llama3.1:8b";
    delete process.env.OLLAMA_API_KEY;
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ models: [{ name: "llama3.1:8b" }] }),
      };
    };

    await probeLocalAI();

    assert.equal(request.url, "http://localhost:11434/api/tags");
    assert.equal("Authorization" in request.options.headers, false);
  });

  it("autentica tambien las solicitudes de embeddings", async () => {
    process.env.LOCAL_AI_BASE_URL = "https://ollama.com";
    process.env.LOCAL_AI_EMBEDDING_MODEL = "embeddinggemma";
    process.env.OLLAMA_API_KEY = "test-cloud-secret";
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ embeddings: [[0.1, 0.2]] }),
      };
    };

    const embeddings = await embedTextsWithLocalAI(["texto juridico"]);

    assert.equal(request.url, "https://ollama.com/api/embed");
    assert.equal(request.options.headers.Authorization, "Bearer test-cloud-secret");
    assert.deepEqual(embeddings, [[0.1, 0.2]]);
  });
});

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
