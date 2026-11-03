const assert = require("node:assert/strict");
const { it } = require("node:test");
const nodemailer = require("nodemailer");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const app = require("../aplicacion");
const { setSessionResolverForTests, resetSessionResolverForTests } = require("../autenticacion/sesion");
const { setAuthorizationResolverForTests, resetAuthorizationResolverForTests } = require("../autenticacion/autorizacion");
const { processNextReminder } = require("../trabajos/procesadorRecordatorios");

it("cada cuenta recibe su propio aviso aunque ambas usen el mismo remitente SMTP", async () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const previousUser = process.env.SMTP_USER;
  const previousFrom = process.env.SMTP_FROM;
  const users = new Map([
    ["cuenta-a", { id: "cuenta-a", email: "persona-a@example.test" }],
    ["cuenta-b", { id: "cuenta-b", email: "persona-b@example.test" }],
  ]);
  const pending = [];
  const sent = [];
  let server;

  try {
    process.env.SMTP_USER = "remitente@example.test";
    process.env.SMTP_FROM = "LegalMind <remitente@example.test>";
    setSessionResolverForTests(async (req) => ({ user: users.get(req.headers["x-test-account"]) }));
    setAuthorizationResolverForTests(async (req) => ({ organizationId: 12, userId: req.user.id, role: "lectura" }));
    pool.query = async (sql, values) => {
      assert.match(sql, /INSERT INTO recordatorios_vencimientos/);
      const [organizationId, userId, titulo, mensaje, programado_para, canal, email_estado] = values;
      const reminder = { id: pending.length + 1, organizacion_id: organizationId, destinatario_user_id: userId, titulo, mensaje, programado_para, canal, email_estado };
      pending.push(reminder);
      return { rows: [reminder] };
    };
    pool.connect = async () => ({
      query: async (sql) => {
        if (!/SELECT rv/.test(sql)) return { rows: [] };
        assert.match(sql, /u.email AS destinatario_email/);
        assert.match(sql, /u.id = rv.destinatario_user_id/);
        const reminder = pending.shift();
        return { rows: reminder ? [{ ...reminder, destinatario_email: users.get(reminder.destinatario_user_id).email }] : [] };
      },
      release() {},
    });
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    const url = `http://127.0.0.1:${server.address().port}/api/notificaciones`;
    for (const id of users.keys()) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-test-account": id },
        body: JSON.stringify({ titulo: `Aviso ${id}`, mensaje: "Recordatorio personal", email: true,
          destinatario_user_id: "cuenta-ajena", destinatario_email: process.env.SMTP_USER }),
      });
      assert.equal(response.status, 201);
      assert.equal((await response.json()).notificacion.destinatario_user_id, id);
    }

    // El correo puede haber cambiado entre la creacion y la entrega del aviso.
    users.get("cuenta-b").email = "persona-b-actualizada@example.test";
    const jsonTransport = nodemailer.createTransport({ jsonTransport: true });
    const transporter = { sendMail: async (message) => {
      const result = await jsonTransport.sendMail(message);
      sent.push(JSON.parse(result.message));
      return result;
    } };
    assert.equal(await processNextReminder({ transporter }), true);
    assert.equal(await processNextReminder({ transporter }), true);
    assert.equal(await processNextReminder({ transporter }), false);
    assert.deepEqual(sent.map((mail) => mail.to.map((to) => to.address)), [
      ["persona-a@example.test"], ["persona-b-actualizada@example.test"],
    ]);
    assert(sent.every((mail) => mail.from.address === "remitente@example.test"));
    assert(sent.every((mail) => !mail.cc && !mail.bcc));
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    resetSessionResolverForTests();
    resetAuthorizationResolverForTests();
    if (previousUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = previousUser;
    if (previousFrom === undefined) delete process.env.SMTP_FROM; else process.env.SMTP_FROM = previousFrom;
    if (server) await new Promise((resolve) => server.close(resolve));
  }
});
