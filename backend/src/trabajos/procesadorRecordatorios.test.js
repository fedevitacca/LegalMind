const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const { processNextReminder } = require("./procesadorRecordatorios");
const originalConnect = pool.connect;
const originalQuery = pool.query;
afterEach(() => { pool.connect = originalConnect; pool.query = originalQuery; });

describe("procesador de recordatorios", () => {
  it("envia email y marca el recordatorio como enviado", async () => {
    const statements = [];
    pool.connect = async () => ({
      query: async (sql, values) => {
        statements.push({ sql, values });
        if (/SELECT rv/.test(sql)) return { rows: [{ id: 9, canal: "email", destinatario_email: "persona@example.com", titulo: "Vencimiento", mensaje: "Revisar", identificador: "EXP-1", caratula: "Caso" }] };
        return { rows: [] };
      },
      release() {},
    });
    let mail;
    const processed = await processNextReminder({ transporter: { sendMail: async (payload) => { mail = payload; } } });
    assert.equal(processed, true);
    assert.equal(mail.to, "persona@example.com");
    assert.ok(statements.some(({ sql }) => /SKIP LOCKED/.test(sql)));
    assert.ok(statements.some(({ sql }) => /estado='enviado'/.test(sql)));
  });

  it("termina cuando no hay recordatorios vencidos", async () => {
    pool.connect = async () => ({ query: async () => ({ rows: [] }), release() {} });
    assert.equal(await processNextReminder(), false);
  });
});
