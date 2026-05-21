const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

const app = require("../app");

describe("IA file routes", () => {
  let baseUrl;
  let server;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
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

  it("analiza un archivo TXT en modo local", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [
          "En el legajo nro 789/26 el imputado Ana Gomez fue citada a audiencia el 21/05/2026.",
        ],
        "legajo.txt",
        { type: "text/plain" }
      )
    );
    formData.set("mode", "local");

    const response = await fetch(`${baseUrl}/api/ia/analyze-file`, {
      method: "POST",
      body: formData,
    });
    const analysis = await response.json();

    assert.equal(response.status, 200);
    assert.equal(analysis._metadata.engine, "local");
    assert.equal(analysis._metadata.source_file.name, "legajo.txt");
    assert.match(analysis.causa.datos_generales[0], /789\/26/);
    assert.equal(analysis.imputados[0].nombre, "Ana Gomez");
  });

  it("rechaza archivos sin extractor disponible", async () => {
    const formData = new FormData();
    formData.set("file", new File(["pdf"], "legajo.pdf", { type: "application/pdf" }));
    formData.set("mode", "local");

    const response = await fetch(`${baseUrl}/api/ia/analyze-file`, {
      method: "POST",
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /solo se admiten archivos \.txt/);
  });
});
