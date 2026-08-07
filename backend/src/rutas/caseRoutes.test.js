const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");

describe("case routes", () => {
  let baseUrl;
  let server;

  before(async () => {
    setSessionResolverForTests(async () => ({ user: { id: "test-user", name: "Test", email: "test@legalmind.local" } }));
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 1, role: "administrador", userId: req.user.id } : true);
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    resetSessionResolverForTests(); resetAuthorizationResolverForTests();
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("oculta una causa de otra organizacion", async () => {
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 1, role: "administrador", userId: req.user.id } : false);
    const response = await fetch(`${baseUrl}/api/casos/999`);
    assert.equal(response.status, 404);
    setAuthorizationResolverForTests(async (req, kind) => kind === "context" ? { organizationId: 1, role: "administrador", userId: req.user.id } : true);
  });

  it("valida la caratula al crear un caso", async () => {
    const response = await fetch(`${baseUrl}/api/casos`, {
      body: JSON.stringify({ caratula: "" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /caratula/);
  });

  it("informa cuando PostgreSQL no esta configurado", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const response = await fetch(`${baseUrl}/api/casos`);
    const body = await response.json();

    if (previousDatabaseUrl) {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    assert.equal(response.status, 503);
    assert.match(body.error, /DATABASE_URL/);
  });

  it("valida el estado al actualizar un caso", async () => {
    const response = await fetch(`${baseUrl}/api/casos/1`, {
      body: JSON.stringify({ estado: "en_revision" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /estado/);
  });

  it("valida el nombre al agregar un imputado", async () => {
    const response = await fetch(`${baseUrl}/api/casos/1/imputados`, {
      body: JSON.stringify({ nombre: "" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /nombre/);
  });

  it("valida que un documento tenga archivo o texto inicial", async () => {
    const response = await fetch(`${baseUrl}/api/casos/1/documentos`, {
      body: JSON.stringify({ nombre_archivo: "acta.txt" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /archivo/);
  });

  it("valida el estado de procesamiento al actualizar un documento", async () => {
    const response = await fetch(`${baseUrl}/api/casos/1/documentos/1`, {
      body: JSON.stringify({ estado_procesamiento: "cargado" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /estado_procesamiento/);
    assert.match(body.error, /pendiente/);
  });
});
