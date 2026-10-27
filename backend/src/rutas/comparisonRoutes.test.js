const assert = require("node:assert/strict");
const { after, afterEach, before, beforeEach, describe, it } = require("node:test");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");
const { setLocalAIClientFactoryForTests, resetLocalAIClientFactoryForTests } = require("../../IA/analizadorLocal");
const { resetQueriesTableForTests } = require("../modelos/repositorioConsultasIA");
const originalQuery = pool.query;

describe("comparación de imputados y documentos", () => {
  let server, baseUrl, lastPrompt, savedInput;
  before(async () => {
    setSessionResolverForTests(async () => ({ user: { id: "abogado-prueba" } }));
    await new Promise((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${server.address().port}/api/ia/tools`; resolve(); }); });
  });
  beforeEach(() => {
    lastPrompt = undefined; savedInput = undefined;
    resetQueriesTableForTests();
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 1, userId: req.user.id, role: "abogado" } : true);
    pool.query = async (sql, values) => {
      if (/FROM causa_imputados/.test(sql)) {
        assert.deepEqual(values, [7]);
        return { rows: [
          { id: 11, nombre: "Ana Pérez", rol: "imputada", notas: "La ficha registra una declaración del día 10.", datos_contexto: { estado: "Declaración registrada" } },
          { id: 12, nombre: "Juan Gómez", rol: "imputado", notas: "La ficha registra una audiencia del día 12.", datos_contexto: { estado: "Audiencia pendiente" } },
        ] };
      }
      if (/INSERT INTO consultas_ia/.test(sql)) {
        savedInput = JSON.parse(values[5]);
        return { rows: [{ id: 90, causa_id: 7, user_id: values[1], herramienta: values[2], entrada_json: savedInput }] };
      }
      return { rows: [], rowCount: 0 };
    };
    setLocalAIClientFactoryForTests(() => ({ chat: async (payload) => {
      lastPrompt = payload.messages.map((message) => message.content).join("\n");
      return JSON.stringify({ titulo: "Comparación de fichas", conclusion: "Las fichas registran actuaciones distintas.", puntos_clave: ["Revisar ambas fichas."], desarrollo: [{ titulo: "Fuentes", contenido: "Ana Pérez y Juan Gómez tienen actuaciones registradas diferentes." }], acciones_sugeridas: ["Verificar los documentos originales."], limitaciones: ["Se comparan fichas, sin inferir responsabilidad."] });
    } }));
  });
  afterEach(() => { pool.query = originalQuery; resetLocalAIClientFactoryForTests(); });
  after(async () => { resetSessionResolverForTests(); resetAuthorizationResolverForTests(); resetQueriesTableForTests(); await new Promise((resolve) => server.close(resolve)); });
  function run(tool, body) { return fetch(`${baseUrl}/${tool}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }

  it("compara dos fichas del expediente, cita ambas y guarda los IDs seleccionados", async () => {
    const response = await run("comparar_imputados", { case_id: 7, defendant_ids: [11, 12], primary_text: "Dato inventado por el navegador", secondary_text: "Otro dato inventado" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(lastPrompt, /Ana Pérez/); assert.match(lastPrompt, /Juan Gómez/);
    assert.match(lastPrompt, /Audiencia pendiente/);
    assert.doesNotMatch(lastPrompt, /inventado/);
    assert.deepEqual([...new Set(body.citations.map((citation) => citation.document_id))].sort(), ["imputado-11", "imputado-12"]);
    assert.equal(body._metadata.comparison_scope, "fichas_registradas");
    assert.deepEqual(savedInput.defendant_ids, [11, 12]);
    assert.equal(body.saved_query.id, 90);
  });

  it("rechaza el mismo imputado, una selección incompleta o imputados de otro expediente", async () => {
    for (const ids of [[11, 11], [11], [11, 99], [0, 12]]) {
      assert.equal((await run("comparar_imputados", { case_id: 7, defendant_ids: ids })).status, 400);
    }
    assert.equal((await run("comparar_imputados", { defendant_ids: [11, 12] })).status, 400);
    assert.equal(lastPrompt, undefined);
  });

  it("no permite comparar fichas de una causa ajena a la organización", async () => {
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 2, userId: req.user.id, role: "abogado" } : false);
    assert.equal((await run("comparar_imputados", { case_id: 7, defendant_ids: [11, 12] })).status, 404);
    assert.equal(lastPrompt, undefined);
  });

  it("la comparación documental incluye ambas fuentes aunque una sea mucho más larga", async () => {
    const response = await run("comparar_documentos", {
      primary_text: "El informe A registra una audiencia y un peritaje de la defensa. ".repeat(100),
      secondary_text: "La declaración B registra la comparecencia de otro testigo el día 14.",
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual([...new Set(body.citations.map((citation) => citation.document_id))].sort(), ["fuente-a", "fuente-b"]);
    assert.match(lastPrompt, /declaración B/);
    assert.equal((await run("comparar_documentos", { primary_text: "Sólo una fuente" })).status, 400);
  });

  it("si falla la IA devuelve pasajes de ambas fichas e identifica el modo extractivo", async () => {
    setLocalAIClientFactoryForTests(() => ({ chat: async () => { throw new Error("Modelo no disponible"); } }));
    const response = await run("comparar_imputados", { case_id: 7, defendant_ids: [11, 12] });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body._metadata.engine, "fast_extractive_rag");
    assert.ok(body.result.desarrollo.some((section) => section.titulo === "Ficha de Ana Pérez"));
    assert.ok(body.result.desarrollo.some((section) => section.titulo === "Ficha de Juan Gómez"));
    assert.ok(body.result.desarrollo.some((section) => section.titulo === "Alcance de la extracción"));
  });
});
