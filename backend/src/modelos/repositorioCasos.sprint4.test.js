const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const { pool } = require("../configuracion/baseDatos");
const {
  createInternalComparison,
  listDocumentsByCase,
  listActionsByCase,
} = require("./repositorioCasos");

describe("repositorioCasos sprint 4", () => {
  it("filtra documentos por imputado, categoria y expediente con parametros SQL", async () => {
    const originalQuery = pool.query;
    let captured;

    pool.query = async (sql, values) => {
      captured = { sql, values };
      return { rows: [] };
    };

    try {
      const result = await listDocumentsByCase(5, {
        categoria: "pdf",
        expediente: "EXP-22",
        imputadoId: 9,
        q: "audiencia",
      });

      assert.deepEqual(result, []);
      assert.match(captured.sql, /documento_imputados di_filter/);
      assert.match(captured.sql, /tipo_archivo = \$2/);
      assert.match(captured.sql, /identificador ILIKE \$3/);
      assert.match(captured.sql, /imputado_id = \$5/);
      assert.deepEqual(captured.values, [5, "pdf", "%EXP-22%", "%audiencia%", 9]);
    } finally {
      pool.query = originalQuery;
    }
  });

  it("filtra actuaciones por imputado y documento relacionado", async () => {
    const originalQuery = pool.query;
    let captured;

    pool.query = async (sql, values) => {
      captured = { sql, values };
      return { rows: [] };
    };

    try {
      await listActionsByCase(7, {
        documentoId: 3,
        estado: "pendiente",
        imputadoId: 11,
      });

      assert.match(captured.sql, /actuacion_imputados ai_filter/);
      assert.match(captured.sql, /documento_actuaciones da_filter/);
      assert.deepEqual(captured.values, [7, "pendiente", 11, 3]);
    } finally {
      pool.query = originalQuery;
    }
  });

  it("prepara una comparacion interna con metadata JSON", async () => {
    const originalQuery = pool.query;
    let captured;

    pool.query = async (sql, values) => {
      captured = { sql, values };
      return {
        rows: [{
          causa_id: values[0],
          created_at: new Date("2026-08-11T00:00:00Z"),
          criterio: values[7],
          destino_id: values[5],
          destino_tipo: values[4],
          estado: "pendiente",
          id: 99,
          imputado_id: values[6],
          metadata_json: JSON.parse(values[8]),
          origen_id: values[3],
          origen_tipo: values[2],
          resultado_json: {},
          tipo: values[1],
          updated_at: new Date("2026-08-11T00:00:00Z"),
        }],
      };
    };

    try {
      const result = await createInternalComparison(4, {
        criterio: "contradicciones",
        destino_id: 2,
        destino_tipo: "documento",
        imputado_id: 8,
        metadata: { prioridad: "alta" },
        origen_id: 1,
        origen_tipo: "documento",
        tipo: "documentos",
      });

      assert.match(captured.sql, /INSERT INTO comparaciones_internas/);
      assert.equal(captured.values[8], JSON.stringify({ prioridad: "alta" }));
      assert.equal(result.id, 99);
      assert.equal(result.tipo, "documentos");
      assert.deepEqual(result.metadata, { prioridad: "alta" });
    } finally {
      pool.query = originalQuery;
    }
  });
});
