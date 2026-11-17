const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");

const {
  generarEmbeddingsDeTextos,
  obtenerConfiguracionDeIA,
  comprobarConexionConOllama,
  restablecerClienteDeIAParaPruebas,
  generarRespuestaEstructuradaDelChat,
  generarRespuestaLibreDelChat,
  configurarClienteDeIAParaPruebas,
} = require("./analizadorLocal");

const fetchOriginal = global.fetch;
const entornoOriginal = {
  LOCAL_AI_BASE_URL: process.env.LOCAL_AI_BASE_URL,
  LOCAL_AI_EMBEDDING_MODEL: process.env.LOCAL_AI_EMBEDDING_MODEL,
  LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL,
  OLLAMA_API_KEY: process.env.OLLAMA_API_KEY,
};

describe("cliente Ollama", () => {
  afterEach(() => {
    global.fetch = fetchOriginal;
    restablecerClienteDeIAParaPruebas();
    restaurarEntorno();
  });

  it("envia memoria y fuentes al chat del expediente con salida estructurada", async () => {
    let datosDeEnvio;
    configurarClienteDeIAParaPruebas(() => ({ chat: async (valor) => {
      datosDeEnvio = valor;
      return JSON.stringify({ answer: "La audiencia figura para el 12 de mayo [FUENTE 1].",
        suggested_questions: ["¿Quiénes participan?"], limitations: [] });
    } }));

    const resultado = await generarRespuestaEstructuradaDelChat({ pregunta: "¿Cuándo es la audiencia?",
      historial: [{ role: "usuario", content: "Revisemos las próximas fechas" }],
      contexto: [{ nombreDocumento: "Agenda", ubicacion: "Fragmento 1", texto: "Audiencia: 12 de mayo." }] });

    assert.match(datosDeEnvio.messages.at(-1).content, /Audiencia: 12 de mayo/);
    assert.ok(datosDeEnvio.messages.some((mensaje) => mensaje.content.includes("Revisemos las próximas fechas")));
    assert.match(resultado.respuesta, /12 de mayo/);
    assert.deepEqual(resultado.preguntasSugeridas, ["¿Quiénes participan?"]);
  });

  it("permite un reintento conversacional libre sin exigir JSON", async () => {
    let datosDeEnvio;
    configurarClienteDeIAParaPruebas(() => ({ chat: async (valor) => {
      datosDeEnvio = valor;
      return "La pericia acredita el acceso, pero no identifica al operador [FUENTE 1].";
    } }));
    const resultado = await generarRespuestaLibreDelChat({ pregunta: "Evalua la pericia",
      contexto: [{ nombreDocumento: "Pericia", texto: "No fue posible identificar a la persona que opero." }] });
    assert.equal(datosDeEnvio.format, null);
    assert.match(resultado.respuesta, /no identifica al operador/i);
  });

  it("envia la API key a Ollama Cloud sin exponerla en la configuracion", async () => {
    process.env.LOCAL_AI_BASE_URL = "https://ollama.com";
    process.env.LOCAL_AI_MODEL = "gpt-oss:20b";
    process.env.OLLAMA_API_KEY = "test-cloud-secret";
    let solicitud;
    global.fetch = async (url, opciones) => {
      solicitud = { url, options: opciones };
      return {
        ok: true,
        json: async () => ({ models: [{ name: "gpt-oss:20b" }] }),
      };
    };

    const estadoIA = await comprobarConexionConOllama();
    const configuracion = obtenerConfiguracionDeIA();

    assert.equal(solicitud.url, "https://ollama.com/api/tags");
    assert.equal(solicitud.options.headers.Authorization, "Bearer test-cloud-secret");
    assert.equal(estadoIA.chatModelReady, true);
    assert.equal(configuracion.authenticated, true);
    assert.equal(JSON.stringify(configuracion).includes("test-cloud-secret"), false);
  });

  it("mantiene Ollama local sin encabezado de autenticacion", async () => {
    process.env.LOCAL_AI_BASE_URL = "http://localhost:11434";
    process.env.LOCAL_AI_MODEL = "llama3.1:8b";
    delete process.env.OLLAMA_API_KEY;
    let solicitud;
    global.fetch = async (url, opciones) => {
      solicitud = { url, options: opciones };
      return {
        ok: true,
        json: async () => ({ models: [{ name: "llama3.1:8b" }] }),
      };
    };

    await comprobarConexionConOllama();

    assert.equal(solicitud.url, "http://localhost:11434/api/tags");
    assert.equal("Authorization" in solicitud.options.headers, false);
  });

  it("autentica tambien las solicitudes de embeddings", async () => {
    process.env.LOCAL_AI_BASE_URL = "https://ollama.com";
    process.env.LOCAL_AI_EMBEDDING_MODEL = "embeddinggemma";
    process.env.OLLAMA_API_KEY = "test-cloud-secret";
    let solicitud;
    global.fetch = async (url, opciones) => {
      solicitud = { url, options: opciones };
      return {
        ok: true,
        json: async () => ({ embeddings: [[0.1, 0.2]] }),
      };
    };

    const embeddings = await generarEmbeddingsDeTextos(["texto juridico"]);

    assert.equal(solicitud.url, "https://ollama.com/api/embed");
    assert.equal(solicitud.options.headers.Authorization, "Bearer test-cloud-secret");
    assert.deepEqual(embeddings, [[0.1, 0.2]]);
  });
});

function restaurarEntorno() {
  for (const [key, valor] of Object.entries(entornoOriginal)) {
    if (valor === undefined) delete process.env[key];
    else process.env[key] = valor;
  }
}
