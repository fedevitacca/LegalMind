const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const { pool } = require("../configuracion/baseDatos");
const { saveLegalAnalysis } = require("./repositorioIA");

describe("repositorioIA", () => {
  it("persiste analisis normalizando alertas y estado documental", async () => {
    const queries = [];
    const originalConnect = pool.connect;

    pool.connect = async () => ({
      async query(sql, values = []) {
        queries.push({ sql, values });

        if (/INSERT INTO analisis_ia/i.test(sql)) {
          return { rows: [{ id: 9 }], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      },
      release() {},
    });

    try {
      const result = await saveLegalAnalysis({
        analysis: {
          alertas: [
            {
              descripcion: "Controlar vencimiento detectado.",
              prioridad: "alta",
              tipo: "plazo",
              titulo: "Revision alta",
            },
          ],
          actuaciones_pendientes: [],
          entidades_juridicas: {},
          fechas_relevantes: [],
          grafo_conocimiento: { relaciones: [] },
          nivel_confianza: "medio",
          rag_juridico: { fragmentos: [] },
        },
        causaId: 7,
        documentoId: 22,
        metadata: { engine: "local", model: "test-model" },
        text: "Texto juridico.",
      });

      assert.equal(result.persisted, true);
      assert.equal(result.analisis_ia_id, 9);

      const alertInsert = queries.find(({ sql }) => /INSERT INTO alertas_ia/i.test(sql));
      assert.ok(alertInsert);
      assert.equal(alertInsert.values[3], "alerta-1");
      assert.equal(alertInsert.values[10], "ia");

      const documentUpdate = queries.find(
        ({ sql, values }) => /UPDATE documentos/i.test(sql) && values[0] === 22
      );
      assert.ok(documentUpdate);
      assert.equal(documentUpdate.values[1], "analizado");
    } finally {
      pool.connect = originalConnect;
    }
  });
});
