const assert = require("node:assert/strict");
const { after, afterEach, before, beforeEach, describe, it, mock } = require("node:test");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");
const { setLocalAIClientFactoryForTests, resetLocalAIClientFactoryForTests } = require("../../IA/analizadorLocal");

describe("mensajes del chat del expediente", () => {
  const originalQuery = pool.query, originalConnect = pool.connect;
  let server, url, savedMetadata, statements;
  before(async () => {
    setSessionResolverForTests(async () => ({ user: { id: "test-user" } }));
    setAuthorizationResolverForTests(async (req, kind) => kind === "context"
      ? { organizationId: 1, role: "abogado", userId: req.user.id } : true);
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    url = `http://127.0.0.1:${server.address().port}/api/ia/cases/16/chats/2/messages`;
  });
  beforeEach(() => {
    statements = []; savedMetadata = null;
    pool.query = async (sql) => {
      if (/FROM conversaciones_ia/.test(sql)) return { rowCount: 1, rows: [{ id: 2, causa_id: 16, titulo: "Nueva conversacion" }] };
      if (/FROM documentos/.test(sql)) return { rows: [{ id: 3, nombre_archivo: "Acta", texto_extraido: "La audiencia del expediente se realizara el 12 de mayo de 2026." }] };
      return { rows: [], rowCount: 0 };
    };
    pool.connect = async () => ({
      query: async (sql, values) => {
        statements.push(sql);
        if (/SELECT id,titulo/.test(sql)) return { rowCount: 1, rows: [{ id: 2, titulo: "Nueva conversacion" }] };
        if (/INSERT INTO mensajes_chat_ia/.test(sql)) {
          if (values.length > 2) savedMetadata = JSON.parse(values[5]);
          return { rows: [{ id: values.length > 2 ? 11 : 10,
            rol: values.length > 2 ? "asistente" : "usuario", contenido: values[1],
            metadata_json: savedMetadata || {} }] };
        }
        return { rows: [], rowCount: 0 };
      }, release() {},
    });
    setLocalAIClientFactoryForTests(() => ({ chat: async () => JSON.stringify({
      answer: "La audiencia sera el 12 de mayo de 2026 [FUENTE 1].",
      suggested_questions: [], limitations: [],
    }) }));
  });
  afterEach(() => {
    pool.query = originalQuery; pool.connect = originalConnect;
    resetLocalAIClientFactoryForTests();
    mock.restoreAll();
  });
  after(async () => {
    resetSessionResolverForTests(); resetAuthorizationResolverForTests();
    await new Promise((resolve) => server.close(resolve));
  });
  function send(content, toolId) { return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, tool_id: toolId }) }); }

  it("genera y guarda ambos mensajes con sus citas en una transaccion", async () => {
    const response = await send("Cuando es la audiencia del expediente?");
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.match(body.assistant_message.content, /12 de mayo/);
    assert.equal(savedMetadata.engine, "ollama_case_chat");
    assert.ok(statements.includes("COMMIT"));
    assert.equal(statements.filter((sql) => /INSERT INTO mensajes_chat_ia/.test(sql)).length, 2);
  });

  it("devuelve y guarda evidencia extractiva cuando Ollama no esta accesible", async () => {
    setLocalAIClientFactoryForTests(() => ({ chat: async () => { throw new Error("ECONNREFUSED localhost:11434"); } }));
    const response = await send("Cuando es la audiencia del expediente?");
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(savedMetadata.engine, "extractive_chat_fallback");
    assert.match(body.assistant_message.content, /12 de mayo/);
    assert.ok(statements.includes("COMMIT"));
  });

  it("resume en lenguaje conversacional y normaliza las citas al usar Ollama Cloud", async () => {
    const previousUrl = process.env.LOCAL_AI_BASE_URL;
    process.env.LOCAL_AI_BASE_URL = "https://ollama.com";
    const requests = [];
    setLocalAIClientFactoryForTests(() => ({ chat: async (payload) => {
      requests.push(payload);
      return "**La audiencia es el 12 de mayo.** [FUENTE 1, FUENTE 2]";
    } }));
    try {
      const response = await send("Resumí el expediente", "resumen_expediente");
      const body = await response.json();
      assert.equal(response.status, 201);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].format, null);
      assert.match(requests[0].messages[0].content, /empezá por el hecho/);
      assert.equal(body.assistant_message.content, "La audiencia es el 12 de mayo. [1] [2]");
      assert.equal(savedMetadata.engine, "ollama_tool_resumen_expediente");
    } finally {
      if (previousUrl === undefined) delete process.env.LOCAL_AI_BASE_URL;
      else process.env.LOCAL_AI_BASE_URL = previousUrl;
    }
  });

  it("guarda saludos sin invocar al modelo", async () => {
    setLocalAIClientFactoryForTests(() => ({ chat: async () => { assert.fail("El saludo no necesita Ollama"); } }));
    const response = await send("Hola");
    assert.equal(response.status, 201);
    assert.equal(savedMetadata.engine, "deterministic_conversation");
  });

  it("identifica la etapa y la solicitud cuando falla el guardado y revierte la transaccion", async () => {
    const connect = pool.connect;
    pool.connect = async () => {
      const client = await connect();
      const query = client.query;
      client.query = async (sql, values) => {
        if (/INSERT INTO mensajes_chat_ia/.test(sql)) {
          const error = new Error("No se pudo guardar el mensaje");
          error.code = "TEST_DB_ERROR";
          throw error;
        }
        return query(sql, values);
      };
      return client;
    };
    const log = mock.method(console, "error", () => {});
    const response = await send("Hola");
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.ok(body.request_id);
    assert.ok(statements.includes("ROLLBACK"));
    assert.ok(!statements.includes("COMMIT"));
    assert.equal(log.mock.calls[0].arguments[1].stage, "save_exchange");
    assert.equal(log.mock.calls[0].arguments[1].request_id, body.request_id);
  });
});
