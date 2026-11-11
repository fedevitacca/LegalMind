const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const { listLibraryResources, updateLibraryResource } = require("./repositorioBibliotecaEstudio");

describe("repositorio de biblioteca juridica", () => {
  it("restringe busquedas por organizacion y parametriza filtros", async () => {
    const original = pool.query; let captured;
    pool.query = async (sql, values) => { captured = { sql, values }; return { rows: [] }; };
    try {
      await listLibraryResources(12, { query: "prueba", type: "fallo", featured: true });
      assert.match(captured.sql, /r\.organizacion_id=\$1/);
      assert.match(captured.sql, /r\.destacado=TRUE/);
      assert.deepEqual(captured.values, [12, "%prueba%", "fallo"]);
    } finally { pool.query = original; }
  });

  it("actualiza un recurso sin salir de su organizacion", async () => {
    const original = pool.query; let captured;
    pool.query = async (sql, values) => { captured = { sql, values }; return { rows: [{ id: 4 }] }; };
    try {
      await updateLibraryResource(9, 4, { destacado: true });
      assert.match(captured.sql, /WHERE organizacion_id=\$1 AND id=\$2/);
      assert.deepEqual(captured.values, [9, 4, true]);
    } finally { pool.query = original; }
  });
});
