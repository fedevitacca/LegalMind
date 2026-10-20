const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");

describe("rutas de gestion juridica", () => {
  let server; let baseUrl;
  before(async () => {
    setSessionResolverForTests(async () => ({ user: { id: "work-user", name: "Abogada Test", email: "work@legalmind.local" } }));
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 7, role: "administrador", userId: req.user.id } : true);
    await new Promise((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(); }); });
  });
  after(async () => { resetSessionResolverForTests(); resetAuthorizationResolverForTests(); await new Promise((resolve) => server.close(resolve)); });

  it("valida el titulo antes de crear una tarea", async () => {
    const response = await fetch(`${baseUrl}/api/trabajo/tareas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prioridad: "alta" }) });
    const body = await response.json();
    assert.equal(response.status, 400); assert.match(body.error, /titulo/i);
  });

  it("valida los datos de una audiencia antes de persistir", async () => {
    const response = await fetch(`${baseUrl}/api/trabajo/casos/10/audiencias`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lugar: "Sala 2" }) });
    const body = await response.json();
    assert.equal(response.status, 400); assert.match(body.error, /titulo/i);
  });

  it("impide que un usuario de lectura cree tareas", async () => {
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 7, role: "lectura", userId: req.user.id } : true);
    const response = await fetch(`${baseUrl}/api/trabajo/tareas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: "No autorizada" }) });
    assert.equal(response.status, 403);
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 7, role: "administrador", userId: req.user.id } : true);
  });
});
