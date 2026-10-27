const nodemailer = require("nodemailer");
let transporter;

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM || process.env.SMTP_USER));
}

function getTransporter() {
  if (!isEmailConfigured()) throw new Error("El envío de correo requiere SMTP_HOST y SMTP_FROM (o SMTP_USER).");
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

function reminderMessage(reminder) {
  const lines = [reminder.mensaje];
  if (reminder.causa_id) {
    lines.push(`Expediente: ${reminder.identificador || "Sin número"} - ${reminder.caratula || "Caso"}`);
    const url = new URL(`/casos/${reminder.causa_id}/agenda`, process.env.FRONTEND_URL || "http://localhost:3000");
    lines.push(`Abrir agenda del expediente: ${url.href}`);
  }
  lines.push("Recordatorio de LegalMind.");
  return {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: reminder.destinatario_email,
    subject: reminder.titulo.replace(/[\r\n]/g, " "),
    text: lines.join("\n\n"),
    messageId: `<recordatorio-${reminder.id}-${new Date(reminder.programado_para || 0).getTime()}@legalmind.local>`,
  };
}

module.exports = { isEmailConfigured, getTransporter, reminderMessage };
