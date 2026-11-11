const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");

describe("rutas de biblioteca juridica", () => {
  let server; let baseUrl;
  before(async () => {
    setSessionResolverForTests(async () => ({ user: { id: "library-user", name: "Test", email: "library@test.local" } }));
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 3, role: "administrador", userId: req.user.id } : true);
    await new Promise((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(); }); });
  });
  after(async () => { resetSessionResolverForTests(); resetAuthorizationResolverForTests(); await new Promise((resolve) => server.close(resolve)); });

  it("valida titulo, tipo y enlace antes de guardar", async () => {
    for (const [payload, pattern] of [
      [{ tipo: "nota" }, /titulo/i],
      [{ titulo: "Recurso", tipo: "video" }, /tipo/i],
      [{ titulo: "Recurso", tipo: "enlace", url: "javascript:alert(1)" }, /http/i],
    ]) {
      const response = await fetch(`${baseUrl}/api/biblioteca`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      assert.equal(response.status, 400); assert.match((await response.json()).error, pattern);
    }
  });

  it("impide que un miembro de lectura agregue recursos", async () => {
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 3, role: "lectura", userId: req.user.id } : true);
    const response = await fetch(`${baseUrl}/api/biblioteca`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: "Ley", tipo: "ley" }) });
    assert.equal(response.status, 403);
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 3, role: "administrador", userId: req.user.id } : true);
  });
});
