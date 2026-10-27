const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const nodemailer = require("nodemailer");
const { reminderMessage } = require("./correo");

describe("correos de recordatorios", () => {
  it("genera un correo al email de la cuenta sin interpretar el mensaje como HTML", async () => {
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    const result = await transporter.sendMail(reminderMessage({
      id: 17, titulo: "Recordar\nBcc: otra@example.test", mensaje: "<strong>Revisar escrito</strong>",
      destinatario_email: "cuenta@example.test", programado_para: "2027-01-01T12:00:00Z",
    }));
    const mail = JSON.parse(result.message);
    assert.equal(mail.to[0].address, "cuenta@example.test");
    assert.equal(mail.bcc, undefined);
    assert.equal(mail.html, undefined);
    assert.ok(mail.text.includes("<strong>Revisar escrito</strong>"));
    assert.ok(!/[\r\n]/.test(mail.subject));
  });

  it("mantiene el identificador del mensaje al reintentar el mismo recordatorio", () => {
    const reminder = { id: 18, titulo: "Aviso", mensaje: "Recordar", programado_para: "2027-01-01T12:00:00Z" };
    assert.equal(reminderMessage({ ...reminder, email_intentos: 0 }).messageId, reminderMessage({ ...reminder, email_intentos: 4 }).messageId);
    assert.notEqual(reminderMessage(reminder).messageId, reminderMessage({ ...reminder, programado_para: "2027-01-02T12:00:00Z" }).messageId);
  });
});
