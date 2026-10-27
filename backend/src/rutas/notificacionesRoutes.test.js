const assert = require("node:assert/strict");
const { after, afterEach, before, describe, it } = require("node:test");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");
const originalQuery = pool.query;

describe("notificaciones personales", () => {
  let server, baseUrl;
  before(async () => {
    setSessionResolverForTests(async () => ({ user: { id: "usuario-1", email: "usuario@example.com" } }));
    setAuthorizationResolverForTests(async (req) => ({ organizationId: 12, userId: req.user.id, role: "lectura" }));
    await new Promise((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${server.address().port}/api/notificaciones`; resolve(); }); });
  });
  afterEach(() => { pool.query = originalQuery; });
  after(async () => { resetSessionResolverForTests(); resetAuthorizationResolverForTests(); await new Promise((resolve) => server.close(resolve)); });
  function post(body) { return fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }

  it("crea un recordatorio para el usuario de la sesión e ignora destinatarios ajenos", async () => {
    let values;
    pool.query = async (sql, args) => { values = args; return { rows: [{ id: 1 }] }; };
    const response = await post({ titulo: "Llamar al cliente", mensaje: "Confirmar reunión", email: true, destinatario_user_id: "otro", organizacion_id: 99 });
    assert.equal(response.status, 201);
    assert.deepEqual(values.slice(0, 4), [12, "usuario-1", "Llamar al cliente", "Confirmar reunión"]);
    assert.deepEqual(values.slice(5), ["email", "pendiente"]);
  });

  it("rechaza mensajes vacíos, fechas inválidas o pasadas y email no booleano", async () => {
    pool.query = async () => { throw new Error("No debe acceder a la base"); };
    for (const invalid of [{ titulo: "" }, { mensaje: "" }, { programado_para: "ayer" }, { programado_para: null }, { programado_para: "2020-01-01T00:00:00Z" }, { email: "false" }]) {
      const response = await post({ titulo: "Aviso", mensaje: "Recordar", ...invalid });
      assert.equal(response.status, 400);
    }
  });

  it("restringe la bandeja y el contador a usuario y organización", async () => {
    const statements = [];
    pool.query = async (sql, values) => { statements.push({ sql, values }); return { rows: /COUNT/.test(sql) ? [{ total: 2 }] : [] }; };
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).no_leidas, 2);
    assert.equal(statements.length, 2);
    for (const { sql, values } of statements) {
      assert.deepEqual(values, [12, "usuario-1"]);
      assert.match(sql, /organizacion_id = \$1/);
      assert.match(sql, /destinatario_user_id = \$2/);
    }
  });

  it("no modifica una notificación ajena", async () => {
    pool.query = async (sql, values) => {
      assert.deepEqual(values, [12, "usuario-1", "91", "leer"]);
      assert.match(sql, /destinatario_user_id = \$2 AND id = \$3/);
      return { rows: [] };
    };
    const response = await fetch(`${baseUrl}/91`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "leer" }) });
    assert.equal(response.status, 404);
  });

  it("marcar como leídas no altera la entrega de emails pendientes", async () => {
    pool.query = async (sql, values) => {
      assert.deepEqual(values, [12, "usuario-1"]);
      assert.doesNotMatch(sql, /email_estado\s*=/);
      assert.match(sql, /programado_para <= NOW\(\)/);
      return { rows: [] };
    };
    assert.equal((await fetch(`${baseUrl}/leidas`, { method: "PUT" })).status, 204);
  });

  it("exige sesión incluso para consultar avisos", async () => {
    setSessionResolverForTests(async () => null);
    assert.equal((await fetch(baseUrl)).status, 401);
    setSessionResolverForTests(async () => ({ user: { id: "usuario-1" } }));
  });
});
