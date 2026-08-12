const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const { pool } = require("../configuracion/baseDatos");
const {
  createDeadlineReminder,
  listDeadlinesByOrganization,
  updateReminderStatus,
} = require("./repositorioCasos");

describe("repositorioCasos sprint 5", () => {
  it("consulta vencimientos por organizacion con filtros seguros", async () => {
    const originalQuery = pool.query;
    let captured;

    pool.query = async (sql, values) => {
      captured = { sql, values };
      return { rows: [] };
    };

    try {
      const result = await listDeadlinesByOrganization(3, {
        desde: "2026-08-01",
        estado: "pendiente",
        hasta: "2026-08-31",
        limit: 20,
        responsableUserId: "user-1",
      });

      assert.deepEqual(result, []);
      assert.match(captured.sql, /c\.organizacion_id = \$1/);
      assert.match(captured.sql, /fr\.responsable_user_id = \$5/);
      assert.deepEqual(captured.values, [3, "pendiente", "2026-08-01", "2026-08-31", "user-1", 20]);
    } finally {
      pool.query = originalQuery;
    }
  });

  it("crea recordatorios de vencimiento dentro de la causa", async () => {
    const originalQuery = pool.query;
    let captured;

    pool.query = async (sql, values) => {
      captured = { sql, values };
      return {
        rows: [{
          canal: values[3],
          causa_id: values[0],
          created_at: new Date("2026-08-11T00:00:00Z"),
          destinatario_user_id: values[2],
          estado: "pendiente",
          fecha_relevante_id: values[1],
          id: 44,
          mensaje: values[5],
          metadata_json: JSON.parse(values[7]),
          organizacion_id: 9,
          programado_para: values[6],
          titulo: values[4],
          updated_at: new Date("2026-08-11T00:00:00Z"),
        }],
      };
    };

    try {
      const result = await createDeadlineReminder(8, {
        canal: "app",
        destinatario_user_id: "user-7",
        fecha_relevante_id: 12,
        mensaje: "Revisar vencimiento",
        metadata: { origen: "test" },
        programado_para: "2026-08-12T12:00:00.000Z",
        titulo: "Vence plazo",
      });

      assert.match(captured.sql, /INSERT INTO recordatorios_vencimientos/);
      assert.equal(result.id, 44);
      assert.equal(result.fecha_relevante_id, 12);
      assert.deepEqual(result.metadata, { origen: "test" });
    } finally {
      pool.query = originalQuery;
    }
  });

  it("marca recordatorios como enviados sin tocar otras organizaciones", async () => {
    const originalQuery = pool.query;
    let captured;

    pool.query = async (sql, values) => {
      captured = { sql, values };
      return { rows: [{ id: values[1], estado: values[2], metadata_json: {} }] };
    };

    try {
      const result = await updateReminderStatus(2, 77, { estado: "enviado" });

      assert.match(captured.sql, /WHERE organizacion_id = \$1/);
      assert.equal(result.id, 77);
      assert.equal(result.estado, "enviado");
      assert.deepEqual(captured.values, [2, 77, "enviado", null]);
    } finally {
      pool.query = originalQuery;
    }
  });
});
