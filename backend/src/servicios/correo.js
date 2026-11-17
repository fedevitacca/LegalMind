const nodemailer = require("nodemailer");
let transportador;

function estaConfiguradoElCorreo() {
  return Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM || process.env.SMTP_USER));
}

function obtenerTransportadorDeCorreo() {
  if (!estaConfiguradoElCorreo()) throw new Error("El envío de correo requiere SMTP_HOST y SMTP_FROM (o SMTP_USER).");
  if (!transportador) {
    transportador = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transportador;
}

function redactarCorreoDeRecordatorio(recordatorio) {
  const lines = [recordatorio.mensaje];
  if (recordatorio.causa_id) {
    lines.push(`Expediente: ${recordatorio.identificador || "Sin número"} - ${recordatorio.caratula || "Caso"}`);
    const url = new URL(`/casos/${recordatorio.causa_id}/agenda`, process.env.FRONTEND_URL || "http://localhost:3000");
    lines.push(`Abrir agenda del expediente: ${url.href}`);
  }
  lines.push("Recordatorio de LegalMind.");
  return {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recordatorio.destinatario_email,
    subject: recordatorio.titulo.replace(/[\r\n]/g, " "),
    text: lines.join("\n\n"),
    messageId: `<recordatorio-${recordatorio.id}-${new Date(recordatorio.programado_para || 0).getTime()}@legalmind.local>`,
  };
}

module.exports = { estaConfiguradoElCorreo, obtenerTransportadorDeCorreo, redactarCorreoDeRecordatorio };
