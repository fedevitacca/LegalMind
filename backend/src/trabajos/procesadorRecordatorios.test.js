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
    assert.ok(statements.some(({ sql }) => /email_estado='enviado'/.test(sql)));
    assert.ok(statements.some(({ sql }) => /leido_at IS NOT NULL THEN 'leido'/.test(sql)));
  });

  it("termina cuando no hay recordatorios vencidos", async () => {
    pool.connect = async () => ({ query: async () => ({ rows: [] }), release() {} });
    assert.equal(await processNextReminder(), false);
  });

  it("mantiene el aviso en la app y programa reintentos cuando falla el correo", async () => {
    const statements = [];
    pool.connect = async () => ({
      query: async (sql, values) => {
        statements.push({ sql, values });
        return { rows: /SELECT rv/.test(sql) ? [{ id: 3, canal: "email", email_estado: "pendiente", destinatario_email: "persona@example.com", titulo: "Aviso", mensaje: "Recordar" }] : [] };
      }, release() {},
    });
    assert.equal(await processNextReminder({ transporter: { sendMail: async () => { throw new Error("SMTP temporalmente caído"); } } }), true);
    assert.ok(statements.some(({ sql }) => /email_estado='error'/.test(sql) && /email_intentos=email_intentos\+1/.test(sql)));
    assert.ok(statements.some(({ sql }) => /POWER\(2/.test(sql)));
    assert.ok(statements.some(({ sql }) => /estado=CASE/.test(sql)));
    assert.ok(statements.some(({ sql }) => sql === "COMMIT"));
    assert.ok(!statements.some(({ sql }) => sql === "ROLLBACK"));
  });

  it("un aviso leído sigue enviando su email pendiente", async () => {
    let sent = 0;
    pool.connect = async () => ({
      query: async (sql) => ({ rows: /SELECT rv/.test(sql) ? [{ id: 4, estado: "leido", canal: "email", email_estado: "pendiente", destinatario_email: "persona@example.com", titulo: "Aviso", mensaje: "Recordar" }] : [] }), release() {},
    });
    await processNextReminder({ transporter: { sendMail: async () => { sent++; } } });
    assert.equal(sent, 1);
  });

  it("sin SMTP conserva el email pendiente sin consumir intentos", async () => {
    const previousHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    const statements = [];
    pool.connect = async () => ({ query: async (sql) => { statements.push(sql); return { rows: /SELECT rv/.test(sql) ? [{ id: 5, canal: "email", email_estado: "pendiente" }] : [] }; }, release() {} });
    try {
      assert.equal(await processNextReminder(), true);
      assert.ok(statements.some((sql) => /email_estado='pendiente'/.test(sql) && /5 minutes/.test(sql)));
      assert.ok(!statements.some((sql) => /email_intentos=email_intentos\+1/.test(sql)));
    } finally { if (previousHost !== undefined) process.env.SMTP_HOST = previousHost; }
  });

  it("no reenvía un correo ya enviado ni toma avisos cancelados o fechas completadas", async () => {
    pool.connect = async () => ({ query: async (sql) => {
      if (/SELECT rv/.test(sql)) {
        assert.match(sql, /rv.estado <> 'cancelado'/);
        assert.match(sql, /fr.estado IN \('pendiente','en_seguimiento'\)/);
        assert.match(sql, /rv.email_intentos < 5/);
        assert.match(sql, /m.user_id = rv.destinatario_user_id/);
        return { rows: [{ id: 6, canal: "email", email_estado: "enviado" }] };
      }
      return { rows: [] };
    }, release() {} });
    await processNextReminder({ transporter: { sendMail: async () => { assert.fail("No debe reenviar"); } } });
  });
});
