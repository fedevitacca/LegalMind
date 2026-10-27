const { pool } = require("../configuracion/baseDatos");
const { isEmailConfigured, getTransporter, reminderMessage } = require("../servicios/correo");
const { syncAgendaReminders } = require("../modelos/repositorioNotificaciones");

let timer;
let running = false;

async function processNextReminder(options = {}) {
  const client = await pool.connect();
  let reminder;
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT rv.*, u.email AS destinatario_email, c.identificador, c.caratula
      FROM recordatorios_vencimientos rv
      LEFT JOIN causas c ON c.id = rv.causa_id
      LEFT JOIN "user" u ON u.id = rv.destinatario_user_id
      LEFT JOIN fechas_relevantes fr ON fr.id = rv.fecha_relevante_id
      LEFT JOIN user_preferences p ON p.user_id = rv.destinatario_user_id
      WHERE rv.estado <> 'cancelado' AND rv.programado_para <= NOW()
        AND (rv.causa_id IS NULL OR c.organizacion_id = rv.organizacion_id)
        AND (rv.estado = 'pendiente' OR (rv.email_estado IN ('pendiente','error') AND rv.email_intentos < 5))
        AND (rv.email_proximo_intento IS NULL OR rv.email_proximo_intento <= NOW())
        AND (rv.fecha_relevante_id IS NULL OR (fr.estado IN ('pendiente','en_seguimiento') AND fr.requiere_alerta))
        AND (rv.destinatario_user_id IS NULL OR EXISTS (
          SELECT 1 FROM membresias m WHERE m.organizacion_id = rv.organizacion_id AND m.user_id = rv.destinatario_user_id))
        AND (COALESCE(rv.metadata_json->>'origen','') NOT IN ('agenda','vencimiento_automatico') OR COALESCE(p.deadline_notifications, TRUE))
        AND (COALESCE(rv.metadata_json->>'origen','') <> 'vencimiento_automatico' OR (
          fr.fecha > NOW() AND fr.recordatorio_at IS NULL
          AND c.estado NOT IN ('cerrada','archivada')
          AND COALESCE(fr.metadata_json->>'recordatorios_automaticos','true') <> 'false'
          AND COALESCE(fr.responsable_user_id,c.created_by) = rv.destinatario_user_id
          AND rv.metadata_json->'fecha_evento' = to_jsonb(fr.fecha)
          AND (rv.metadata_json->>'etapa' <> '24h' OR fr.fecha > NOW()+INTERVAL '1 hour')
        ))
      ORDER BY rv.programado_para, rv.id
      FOR UPDATE OF rv SKIP LOCKED
      LIMIT 1
    `);
    reminder = result.rows[0];
    if (!reminder) {
      await client.query("COMMIT");
      return false;
    }

    // Leer en la aplicación no cancela un email pendiente.
    await client.query(`UPDATE recordatorios_vencimientos
      SET estado=CASE WHEN leido_at IS NOT NULL THEN 'leido' ELSE 'enviado' END,
          enviado_at=COALESCE(enviado_at,NOW()), updated_at=NOW()
      WHERE id=$1`, [reminder.id]);

    if (reminder.canal === "email" && !["enviado", "cancelado"].includes(reminder.email_estado)) {
      if (!options.transporter && !isEmailConfigured()) {
        // No consumir intentos mientras el servidor no tenga correo configurado.
        await client.query(`UPDATE recordatorios_vencimientos SET email_estado='pendiente',
          email_proximo_intento=NOW()+INTERVAL '5 minutes', updated_at=NOW() WHERE id=$1`, [reminder.id]);
      } else {
        try {
          if (!reminder.destinatario_email) throw new Error("La cuenta no tiene correo de destino.");
          const mailer = options.transporter || getTransporter();
          const sent = await mailer.sendMail(reminderMessage(reminder));
          if (sent?.rejected?.length) throw new Error("El servidor de correo rechazó al destinatario.");
          await client.query(`UPDATE recordatorios_vencimientos
            SET email_estado='enviado', email_enviado_at=NOW(), email_intentos=email_intentos+1,
                email_proximo_intento=NULL, error_detalle=NULL, updated_at=NOW() WHERE id=$1`, [reminder.id]);
        } catch (error) {
          await client.query(`UPDATE recordatorios_vencimientos
            SET email_estado='error', email_intentos=email_intentos+1,
                email_proximo_intento=NOW()+INTERVAL '1 minute' * POWER(2, LEAST(email_intentos, 4)),
                error_detalle=$2, updated_at=NOW() WHERE id=$1`, [reminder.id, String(error.message).slice(0, 2000)]);
        }
      }
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function startReminderWorker() {
  if (timer) return;
  const poll = async () => {
    if (running) return;
    running = true;
    try {
      await syncAgendaReminders();
      for (let processed = 0; processed < 100 && await processNextReminder(); processed++) { /* Lote acotado. */ }
    }
    catch (error) { console.error("Reminder worker failed:", error.message); }
    finally { running = false; }
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
