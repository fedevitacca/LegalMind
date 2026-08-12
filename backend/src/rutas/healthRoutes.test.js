const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

const app = require("../aplicacion");

describe("health routes", () => {
  let baseUrl;
  let server;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("publica headers de seguridad y request id", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.ok(response.headers.get("x-request-id"));
    assert.match(response.headers.get("cache-control"), /no-store/);
  });
});
