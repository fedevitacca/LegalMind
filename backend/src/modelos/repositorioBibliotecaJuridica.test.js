const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { buildFtsWebQuery, searchLegalLibrary } = require("./repositorioBibliotecaJuridica");

describe("repositorioBibliotecaJuridica", () => {
  it("expande terminología con OR para no exigir todos los sinónimos", () => {
    const query = buildFtsWebQuery("declaración del acusado en audiencia");
    assert.match(query, /acusado OR/);
    assert.match(query, /imputado/);
    assert.match(query, /audiencia/);
  });

  it("busca sólo fuentes nacionales y federales vigentes", async () => {
    let captured;
    const rows = await searchLegalLibrary({ query: "prisión preventiva", limit: 50 }, { pool: {
      query: async (sql, values) => {
        captured = { sql, values };
        return { rows: [{ id: 3, fuente_id: 2, orden: 16, titulo: "CPPF", texto: "Peligro real de fuga.", lexical_score: 0.4, tipo: "legislacion", url_oficial: "https://example.test", metadata_json: {} }] };
      },
    } });
    assert.match(captured.sql, /jurisdiccion='nacional_federal'/);
    assert.equal(captured.values[1], 80);
    assert.equal(rows[0].source_type, "legislacion");
    assert.equal(rows[0].source_url, "https://example.test");
  });

  it("fusiona búsqueda léxica y semántica cuando recibe un embedding", async () => {
    let calls = 0;
    const common = { id: 3, fuente_id: 2, orden: 17, titulo: "CPPF", texto: "Riesgo procesal de fuga.",
      tipo: "legislacion", url_oficial: "https://example.test", metadata_json: {} };
    const rows = await searchLegalLibrary({ query: "puede escaparse", queryEmbedding: Array(768).fill(0.1), limit: 5 }, { pool: {
      query: async () => {
        calls += 1;
        return calls === 1
          ? { rows: [{ ...common, lexical_score: 0.3 }] }
          : { rows: [{ ...common, semantic_score: 0.92 }] };
      },
    } });
    assert.equal(calls, 2);
    assert.equal(rows[0].lexical_score, 0.3);
    assert.equal(rows[0].semantic_score, 0.92);
    assert.ok(rows[0].score > 0.9);
  });
});
