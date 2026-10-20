const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");

const {
  embedTextsWithLocalAI,
  getLocalAIConfig,
  probeLocalAI,
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
    restoreEnvironment();
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
