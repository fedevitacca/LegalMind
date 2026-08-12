const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const { pool } = require("../configuracion/baseDatos");
const { listInternalComparisons } = require("./repositorioCasos");

describe("repositorioCasos sprint 6", () => {
  it("lista comparaciones sin SELECT estrella", async () => {
    const originalQuery = pool.query;
    let capturedSql;

    pool.query = async (sql) => {
      capturedSql = sql;
      return { rows: [] };
    };

    try {
      await listInternalComparisons(10, { tipo: "documentos" });

      assert.doesNotMatch(capturedSql, /SELECT\s+\*/i);
      assert.match(capturedSql, /resultado_json/);
      assert.match(capturedSql, /metadata_json/);
    } finally {
      pool.query = originalQuery;
    }
  });
});
