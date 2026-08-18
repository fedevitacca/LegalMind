const nodemailer = require("nodemailer");
const { pool } = require("../configuracion/baseDatos");

let timer;
let transporter;

async function processNextReminder(options = {}) {
  const client = await pool.connect();
  let reminder;
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT rv.*, u.email AS destinatario_email, c.identificador, c.caratula
      FROM recordatorios_vencimientos rv
      INNER JOIN causas c ON c.id = rv.causa_id
      LEFT JOIN "user" u ON u.id = rv.destinatario_user_id
      WHERE rv.estado = 'pendiente' AND rv.programado_para <= NOW()
      ORDER BY rv.programado_para, rv.id
      FOR UPDATE OF rv SKIP LOCKED
      LIMIT 1
    `);
    reminder = result.rows[0];
    if (!reminder) {
      await client.query("COMMIT");
      return false;
    }

    if (reminder.canal === "email") {
      if (!reminder.destinatario_email) {
        throw new Error("El recordatorio por email no tiene un destinatario con correo.");
      }
      const mailer = options.transporter || getTransporter();
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: reminder.destinatario_email,
        subject: reminder.titulo,
        text: `${reminder.mensaje}\n\nExpediente: ${reminder.identificador} - ${reminder.caratula}`,
      });
    }

    await client.query(`UPDATE recordatorios_vencimientos
      SET estado='enviado', enviado_at=NOW(), error_detalle=NULL, updated_at=NOW()
      WHERE id=$1`, [reminder.id]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    if (reminder?.id) {
      await pool.query(`UPDATE recordatorios_vencimientos
        SET estado='error', error_detalle=$2, updated_at=NOW() WHERE id=$1`,
      [reminder.id, String(error.message).slice(0, 2000)]);
      return true;
    }
    throw error;
  } finally {
    client.release();
  }
}

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST no esta configurado.");
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

function startReminderWorker() {
  if (timer) return;
  const poll = async () => {
    try { while (await processNextReminder()) {} }
    catch (error) { console.error("Reminder worker failed:", error.message); }
  };
  void poll();
  timer = setInterval(poll, Number(process.env.REMINDER_WORKER_INTERVAL_MS || 30_000));
  timer.unref();
}

function stopReminderWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

module.exports = { processNextReminder, startReminderWorker, stopReminderWorker };
