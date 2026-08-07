const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");

describe("seguridad de rutas juridicas", () => {
  let server; let baseUrl;
  before(async () => { setSessionResolverForTests(async () => null); await new Promise((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(); }); }); });
  after(async () => { resetSessionResolverForTests(); resetAuthorizationResolverForTests(); await new Promise((resolve) => server.close(resolve)); });

  it("rechaza casos y analisis privados sin sesion", async () => {
    const [cases, analysis] = await Promise.all([fetch(`${baseUrl}/api/casos`), fetch(`${baseUrl}/api/ia/rag/extract`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "expediente privado" }) })]);
    assert.equal(cases.status, 401); assert.equal(analysis.status, 401);
  });

  it("impide escritura a un miembro de solo lectura", async () => {
    setSessionResolverForTests(async () => ({ user: { id: "lector", email: "lector@legalmind.local" } }));
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 2, role: "lectura", userId: req.user.id } : true);
    const response = await fetch(`${baseUrl}/api/casos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caratula: "No autorizado" }) });
    assert.equal(response.status, 403);
  });
});
