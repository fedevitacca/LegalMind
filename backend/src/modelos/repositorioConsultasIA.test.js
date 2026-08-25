const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const { pool } = require("../configuracion/baseDatos");
const {
  createAIQuery,
  deleteAIQuery,
  getAIQuery,
  listAIQueries,
  resetQueriesTableForTests,
} = require("./repositorioConsultasIA");

describe("repositorioConsultasIA", () => {
  it("guarda y restringe los análisis por usuario propietario", async () => {
    const originalQuery = pool.query;
    const calls = [];
    const row = {
      id: 31,
      causa_id: 7,
      user_id: "user-a",
      herramienta: "resumen_expediente",
      titulo: "Resumen de prueba",
      consulta: "Revisar fechas",
      entrada_json: { primary_text: "Texto" },
      resultado_json: { conclusion: "Conclusión" },
      citas_json: [],
      metadata_json: { engine: "local" },
      created_at: new Date("2026-08-25T12:00:00Z"),
    };

    pool.query = async (sql, values = []) => {
      calls.push({ sql, values });
      if (/INSERT INTO consultas_ia/i.test(sql)) return { rows: [row], rowCount: 1 };
      if (/DELETE FROM consultas_ia/i.test(sql)) return { rows: [{ id: 31 }], rowCount: 1 };
      if (/SELECT id, causa_id, user_id/i.test(sql)) return { rows: [row], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    };

    resetQueriesTableForTests();
    try {
      const created = await createAIQuery({
        caseId: 7,
        userId: "user-a",
        toolId: "resumen_expediente",
        title: "Resumen de prueba",
        query: "Revisar fechas",
        input: { primary_text: "Texto" },
        result: { conclusion: "Conclusión" },
        citations: [],
        metadata: { engine: "local" },
      });
      const listed = await listAIQueries(7, "user-a");
      const found = await getAIQuery(7, 31, "user-a");
      const deleted = await deleteAIQuery(7, 31, "user-a");

      assert.equal(created.user_id, "user-a");
      assert.equal(listed[0].user_id, "user-a");
      assert.equal(found.user_id, "user-a");
      assert.equal(deleted, true);

      const insert = calls.find(({ sql }) => /INSERT INTO consultas_ia/i.test(sql));
      assert.equal(insert.values[1], "user-a");
      const protectedReads = calls.filter(({ sql }) => /SELECT id, causa_id, user_id/i.test(sql) && /user_id = \$\d/i.test(sql));
      assert.equal(protectedReads.length, 2);
      assert.ok(protectedReads.every(({ values }) => values.at(-1) === "user-a"));
      const protectedDelete = calls.find(({ sql }) => /DELETE FROM consultas_ia/i.test(sql));
      assert.equal(protectedDelete.values[2], "user-a");
    } finally {
      pool.query = originalQuery;
      resetQueriesTableForTests();
    }
  });

  it("rechaza nuevos registros sin usuario propietario", async () => {
    await assert.rejects(() => createAIQuery({}), /sin usuario propietario/i);
  });
});
