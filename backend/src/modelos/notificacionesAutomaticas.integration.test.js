const assert = require("node:assert/strict");
const { it } = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");

// Prueba real optativa: sólo trabaja en un esquema aislado, revierte todo al finalizar.
it("genera y entrega alertas automáticas sin duplicados y respeta responsables, estados y preferencias", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { pool } = require("../configuracion/baseDatos");
  const { syncAutomaticDeadlineReminders, listNotifications, markAllRead } = require("./repositorioNotificaciones");
  const { processNextReminder } = require("../trabajos/procesadorRecordatorios");
  const client = await pool.connect();
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const schema = `legalmind_alertas_test_${process.pid}_${Date.now()}`;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout=10000");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}, pg_catalog`);
    await client.query(`
      CREATE TABLE "user"(id TEXT PRIMARY KEY, email TEXT);
      CREATE TABLE organizaciones(id BIGINT PRIMARY KEY);
      CREATE TABLE membresias(organizacion_id BIGINT, user_id TEXT);
      CREATE TABLE causas(id BIGINT PRIMARY KEY, organizacion_id BIGINT, identificador TEXT, caratula TEXT, estado TEXT, created_by TEXT);
      CREATE TABLE fechas_relevantes(id BIGINT PRIMARY KEY, causa_id BIGINT, evento TEXT, fecha_texto TEXT, fecha TIMESTAMPTZ,
        estado TEXT, requiere_alerta BOOLEAN, recordatorio_at TIMESTAMPTZ, responsable_user_id TEXT, metadata_json JSONB DEFAULT '{}');
      CREATE TABLE recordatorios_vencimientos(id BIGSERIAL PRIMARY KEY, organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id),
        causa_id BIGINT NOT NULL REFERENCES causas(id), fecha_relevante_id BIGINT NOT NULL REFERENCES fechas_relevantes(id),
        destinatario_user_id TEXT REFERENCES "user"(id), canal TEXT DEFAULT 'app', titulo TEXT, mensaje TEXT,
        programado_para TIMESTAMPTZ, estado TEXT DEFAULT 'pendiente', enviado_at TIMESTAMPTZ, leido_at TIMESTAMPTZ,
        error_detalle TEXT, metadata_json JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
    `);
    for (const name of ["015_notificaciones_personales.sql", "016_preferencias_notificaciones.sql", "017_alertas_automaticas_vencimientos.sql"]) {
      await client.query(await fs.readFile(path.resolve(__dirname, "../../migrations", name), "utf8"));
    }
    pool.query = (...args) => client.query(...args);
    pool.connect = async () => ({
      query: (sql, values) => client.query(sql === "BEGIN" ? "SAVEPOINT reminder_worker" : sql === "COMMIT" ? "RELEASE SAVEPOINT reminder_worker" : sql === "ROLLBACK" ? "ROLLBACK TO SAVEPOINT reminder_worker" : sql, values),
      release() {},
    });
    await client.query(`
      INSERT INTO "user" VALUES ('responsable','responsable@example.test'), ('creador','creador@example.test'), ('ajeno','ajeno@example.test');
      INSERT INTO organizaciones VALUES (1),(2);
      INSERT INTO membresias VALUES (1,'responsable'),(1,'creador'),(2,'ajeno');
      INSERT INTO causas VALUES (1,1,'TEST','Prueba','activa','creador');
      INSERT INTO fechas_relevantes(id,causa_id,evento,fecha,estado,requiere_alerta,responsable_user_id)
      VALUES (1,1,'Audiencia',NOW()+INTERVAL '6 hours','pendiente',TRUE,'responsable');
    `);
    await syncAutomaticDeadlineReminders();
    await syncAutomaticDeadlineReminders();
    assert.equal((await client.query("SELECT COUNT(*)::int n FROM recordatorios_vencimientos")).rows[0].n, 2);
    const inbox = await listNotifications({ organizationId: 1, userId: "responsable" });
    assert.equal(inbox.no_leidas, 1);
    assert.equal((await listNotifications({ organizationId: 2, userId: "ajeno" })).no_leidas, 0);
    await markAllRead({ organizationId: 1, userId: "responsable" });
    const mails = [];
    const options = { transporter: { sendMail: async (mail) => { mails.push(mail); } } };
    assert.equal(await processNextReminder(options), true);
    assert.equal(await processNextReminder(options), false);
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, "responsable@example.test");

    // Al acercarse/reprogramarse la fecha, se envía la segunda etapa aunque se haya leído la primera.
    await client.query("UPDATE fechas_relevantes SET fecha=NOW()+INTERVAL '40 minutes' WHERE id=1");
    await syncAutomaticDeadlineReminders();
    assert.equal(await processNextReminder(options), true);
    await syncAutomaticDeadlineReminders();
    assert.equal(await processNextReminder(options), false);
    assert.equal(mails.length, 2);

    // Fecha existente sin responsable: destinatario = creador, y sólo la etapa urgente si ya está cerca.
    await client.query(`INSERT INTO fechas_relevantes(id,causa_id,evento,fecha,estado,requiere_alerta)
      VALUES(2,1,'Presentación',NOW()+INTERVAL '20 minutes','pendiente',TRUE)`);
    await syncAutomaticDeadlineReminders();
    const fallback = (await client.query("SELECT * FROM recordatorios_vencimientos WHERE fecha_relevante_id=2")).rows;
    assert.equal(fallback.length, 1);
    assert.equal(fallback[0].destinatario_user_id, "creador");
    assert.equal(fallback[0].metadata_json.etapa, "1h");
    await client.query("UPDATE fechas_relevantes SET estado='completada' WHERE id=2");
    assert.equal(await processNextReminder(options), false);
    await syncAutomaticDeadlineReminders();
    assert.equal((await client.query("SELECT estado FROM recordatorios_vencimientos WHERE fecha_relevante_id=2")).rows[0].estado, "cancelado");

    // Sin recordatorio, preferencia desactivada, fecha pasada o responsable ajeno: no hay envíos.
    await client.query(`
      INSERT INTO fechas_relevantes(id,causa_id,evento,fecha,estado,requiere_alerta,responsable_user_id,metadata_json)
      VALUES (3,1,'Sin avisos',NOW()+INTERVAL '4 hours','pendiente',TRUE,'responsable','{"recordatorios_automaticos":false}'),
             (4,1,'Vencida',NOW()-INTERVAL '1 hour','pendiente',TRUE,'responsable','{}'),
             (5,1,'Ajeno',NOW()+INTERVAL '4 hours','pendiente',TRUE,'ajeno','{}');
      INSERT INTO user_preferences(user_id,deadline_notifications) VALUES ('creador',FALSE);
      INSERT INTO fechas_relevantes(id,causa_id,evento,fecha,estado,requiere_alerta)
      VALUES (6,1,'Preferencia desactivada',NOW()+INTERVAL '4 hours','pendiente',TRUE);
    `);
    await syncAutomaticDeadlineReminders();
    assert.equal((await client.query("SELECT COUNT(*)::int n FROM recordatorios_vencimientos WHERE fecha_relevante_id IN (3,4,5,6)")).rows[0].n, 0);
    assert.equal(await processNextReminder(options), false);
    assert.equal(mails.length, 2);
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
