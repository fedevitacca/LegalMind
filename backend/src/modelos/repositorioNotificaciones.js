const { pool } = require("../configuracion/baseDatos");

async function listNotifications({ organizationId, userId }) {
  const result = await pool.query(`
    WITH personales AS (SELECT rv.id, rv.causa_id, rv.fecha_relevante_id, rv.titulo, rv.mensaje,
           rv.programado_para, rv.estado, rv.leido_at, rv.canal, rv.email_estado,
           rv.email_intentos, rv.email_proximo_intento, rv.email_enviado_at,
           c.caratula, c.identificador
    FROM recordatorios_vencimientos rv
    LEFT JOIN causas c ON c.id = rv.causa_id AND c.organizacion_id = rv.organizacion_id
    WHERE rv.organizacion_id = $1 AND rv.destinatario_user_id = $2
      AND rv.estado <> 'cancelado')
    SELECT * FROM (
      (SELECT * FROM personales WHERE programado_para <= NOW() ORDER BY programado_para DESC, id DESC LIMIT 100)
      UNION ALL
      (SELECT * FROM personales WHERE programado_para > NOW() ORDER BY programado_para ASC, id ASC LIMIT 100)
    ) bandeja
    ORDER BY programado_para DESC, id DESC`, [organizationId, userId]);
  const count = await pool.query(`
    SELECT COUNT(*)::int AS total FROM recordatorios_vencimientos
    WHERE organizacion_id = $1 AND destinatario_user_id = $2
      AND estado <> 'cancelado' AND leido_at IS NULL AND programado_para <= NOW()`, [organizationId, userId]);
  return { notificaciones: result.rows, no_leidas: count.rows[0].total };
}

async function createNotification({ organizationId, userId }, payload) {
  const result = await pool.query(`
    INSERT INTO recordatorios_vencimientos
      (organizacion_id, destinatario_user_id, titulo, mensaje, programado_para, canal, email_estado, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7, '{"origen":"personal"}'::jsonb)
    RETURNING id, titulo, mensaje, programado_para, estado, email_estado`, [
    organizationId, userId, payload.titulo, payload.mensaje, payload.programado_para,
    payload.email ? "email" : "app", payload.email ? "pendiente" : "no_solicitado",
  ]);
  return result.rows[0];
}

async function updateNotification({ organizationId, userId }, id, action) {
  const result = await pool.query(`
    UPDATE recordatorios_vencimientos
    SET leido_at = CASE WHEN $4 = 'leer' THEN COALESCE(leido_at, NOW()) ELSE leido_at END,
        estado = CASE WHEN $4 = 'cancelar' THEN 'cancelado' ELSE 'leido' END,
        email_estado = CASE WHEN $4 = 'cancelar' AND email_estado <> 'enviado' THEN 'cancelado' ELSE email_estado END,
        updated_at = NOW()
    WHERE organizacion_id = $1 AND destinatario_user_id = $2 AND id = $3
      AND estado <> 'cancelado' AND ($4 = 'cancelar' OR programado_para <= NOW())
    RETURNING id, estado, leido_at, email_estado`, [organizationId, userId, id, action]);
  return result.rows[0] || null;
}

async function markAllRead({ organizationId, userId }) {
  await pool.query(`UPDATE recordatorios_vencimientos
    SET leido_at = NOW(), estado = 'leido', updated_at = NOW()
    WHERE organizacion_id = $1 AND destinatario_user_id = $2
      AND estado <> 'cancelado' AND leido_at IS NULL AND programado_para <= NOW()`, [organizationId, userId]);
}

async function syncAgendaReminders() {
  // Una fecha cancelada, completada o sin aviso deja de producir recordatorios.
  await pool.query(`UPDATE recordatorios_vencimientos rv
    SET estado = 'cancelado', email_estado = CASE WHEN email_estado = 'enviado' THEN 'enviado' ELSE 'cancelado' END, updated_at = NOW()
    FROM fechas_relevantes fr
    WHERE rv.fecha_relevante_id = fr.id AND rv.metadata_json->>'origen' = 'agenda'
      AND rv.estado <> 'cancelado'
      AND (fr.estado IN ('cancelada','completada') OR NOT fr.requiere_alerta
           OR fr.recordatorio_at IS NULL OR fr.responsable_user_id IS DISTINCT FROM rv.destinatario_user_id)`);
  await pool.query(`
    INSERT INTO recordatorios_vencimientos
      (organizacion_id, causa_id, fecha_relevante_id, destinatario_user_id, canal, titulo, mensaje, programado_para, email_estado, metadata_json)
    SELECT c.organizacion_id, fr.causa_id, fr.id, fr.responsable_user_id, 'email',
      LEFT('Recordatorio: ' || fr.evento, 240),
      fr.evento || E'\nFecha del evento: ' || COALESCE(fr.fecha_texto, fr.fecha::text, 'Sin fecha'),
      fr.recordatorio_at, 'pendiente', jsonb_build_object('origen','agenda','fecha_evento',fr.fecha)
    FROM fechas_relevantes fr
    JOIN causas c ON c.id = fr.causa_id
    JOIN membresias m ON m.organizacion_id = c.organizacion_id AND m.user_id = fr.responsable_user_id
    LEFT JOIN user_preferences p ON p.user_id = fr.responsable_user_id
    WHERE fr.requiere_alerta AND fr.estado IN ('pendiente','en_seguimiento')
      AND fr.recordatorio_at IS NOT NULL AND COALESCE(p.deadline_notifications, TRUE)
    ON CONFLICT (fecha_relevante_id, destinatario_user_id) WHERE metadata_json->>'origen' = 'agenda'
    DO UPDATE SET titulo = EXCLUDED.titulo, mensaje = EXCLUDED.mensaje,
      programado_para = EXCLUDED.programado_para, metadata_json = EXCLUDED.metadata_json,
      estado = 'pendiente', leido_at = NULL, email_estado = 'pendiente',
      email_intentos = 0, email_proximo_intento = NULL, email_enviado_at = NULL, updated_at = NOW()
    WHERE recordatorios_vencimientos.programado_para IS DISTINCT FROM EXCLUDED.programado_para
      OR recordatorios_vencimientos.metadata_json->'fecha_evento' IS DISTINCT FROM EXCLUDED.metadata_json->'fecha_evento'`);
  await syncAutomaticDeadlineReminders();
}

async function syncAutomaticDeadlineReminders() {
  await pool.query(`
    UPDATE recordatorios_vencimientos rv
    SET estado='cancelado', email_estado='cancelado', updated_at=NOW()
    FROM fechas_relevantes fr JOIN causas c ON c.id=fr.causa_id
    WHERE rv.fecha_relevante_id=fr.id AND rv.metadata_json->>'origen'='vencimiento_automatico'
      AND rv.estado <> 'cancelado' AND rv.email_estado <> 'enviado'
      AND NOT (
        fr.fecha IS NOT NULL AND fr.fecha > NOW() AND fr.requiere_alerta
        AND fr.estado IN ('pendiente','en_seguimiento')
        AND c.estado NOT IN ('cerrada','archivada')
        AND fr.recordatorio_at IS NULL
        AND COALESCE(fr.metadata_json->>'recordatorios_automaticos','true') <> 'false'
        AND COALESCE(fr.responsable_user_id,c.created_by) IS NOT DISTINCT FROM rv.destinatario_user_id
        AND rv.metadata_json->'fecha_evento' = to_jsonb(fr.fecha)
        AND (rv.metadata_json->>'etapa' <> '24h' OR fr.fecha > NOW()+INTERVAL '1 hour')
      )`);
  await pool.query(`
    INSERT INTO recordatorios_vencimientos
      (organizacion_id, causa_id, fecha_relevante_id, destinatario_user_id,
       canal, titulo, mensaje, programado_para, email_estado, metadata_json)
    SELECT c.organizacion_id, fr.causa_id, fr.id, m.user_id, 'email',
      LEFT(CASE WHEN etapa.nombre='1h' THEN 'Vencimiento próximo: ' ELSE 'Vencimiento en las próximas 24 horas: ' END || fr.evento, 240),
      fr.evento || E'\nFecha límite: ' || COALESCE(fr.fecha_texto, fr.fecha::text)
        || E'\nEste aviso se generó automáticamente porque la fecha sigue pendiente.',
      fr.fecha-etapa.anticipacion, 'pendiente',
      jsonb_build_object('origen','vencimiento_automatico','etapa',etapa.nombre,'fecha_evento',fr.fecha)
    FROM fechas_relevantes fr
    JOIN causas c ON c.id=fr.causa_id
    JOIN membresias m ON m.organizacion_id=c.organizacion_id
      AND m.user_id=COALESCE(fr.responsable_user_id,c.created_by)
    LEFT JOIN user_preferences p ON p.user_id=m.user_id
    CROSS JOIN (VALUES ('24h', INTERVAL '24 hours'), ('1h', INTERVAL '1 hour')) etapa(nombre,anticipacion)
    WHERE fr.fecha > NOW() AND fr.fecha <= NOW()+INTERVAL '24 hours'
      AND fr.estado IN ('pendiente','en_seguimiento') AND fr.requiere_alerta
      AND c.estado NOT IN ('cerrada','archivada') AND fr.recordatorio_at IS NULL
      AND COALESCE(fr.metadata_json->>'recordatorios_automaticos','true') <> 'false'
      AND COALESCE(p.deadline_notifications,TRUE)
      AND (etapa.nombre <> '24h' OR fr.fecha > NOW()+INTERVAL '1 hour')
    ON CONFLICT (fecha_relevante_id, destinatario_user_id, (metadata_json->>'etapa'))
      WHERE metadata_json->>'origen'='vencimiento_automatico'
    DO UPDATE SET titulo=EXCLUDED.titulo, mensaje=EXCLUDED.mensaje,
      programado_para=EXCLUDED.programado_para, metadata_json=EXCLUDED.metadata_json,
      estado='pendiente', leido_at=NULL, email_estado='pendiente', email_intentos=0,
      email_proximo_intento=NULL, email_enviado_at=NULL, updated_at=NOW()
    WHERE recordatorios_vencimientos.metadata_json->'fecha_evento' IS DISTINCT FROM EXCLUDED.metadata_json->'fecha_evento'`);
}

module.exports = { listNotifications, createNotification, updateNotification, markAllRead, syncAgendaReminders, syncAutomaticDeadlineReminders };
