const { pool } = require("../configuracion/baseDatos");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { DOCUMENT_PROCESSING_STATES } = require("./estadosDocumentos");

const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function listCases(organizationId, filters = {}) {
  ensureDatabaseConfigured();

  const where = ["c.organizacion_id = $1"];
  const values = [organizationId];

  if (filters.expediente) {
    values.push(`%${filters.expediente}%`);
    where.push(`(c.identificador ILIKE $${values.length} OR c.caratula ILIKE $${values.length})`);
  }

  const result = await pool.query(`
    SELECT
      c.id,
      c.identificador,
      c.caratula,
      c.descripcion,
      c.estado,
      c.created_at,
      c.updated_at,
      COUNT(DISTINCT ci.imputado_id)::int AS imputados_count,
      MIN(fr.fecha) FILTER (
        WHERE fr.requiere_alerta = true
          AND (fr.fecha IS NULL OR fr.fecha >= CURRENT_DATE)
      ) AS proxima_alerta
    FROM causas c
    LEFT JOIN causa_imputados ci ON ci.causa_id = c.id
    LEFT JOIN fechas_relevantes fr ON fr.causa_id = c.id
    WHERE ${where.join(" AND ")}
    GROUP BY c.id
    ORDER BY c.updated_at DESC, c.id DESC
  `, values);

  return result.rows.map(mapCaseListRow);
}

async function getCaseById(id, organizationId) {
  ensureDatabaseConfigured();

  const caseResult = await pool.query(
    `
      SELECT
        id,
        identificador,
        caratula,
        descripcion,
        estado,
        created_at,
        updated_at
      FROM causas
      WHERE id = $1 AND organizacion_id = $2
    `,
    [id, organizationId]
  );

  if (!caseResult.rowCount) {
    return null;
  }

  const defendantsResult = await pool.query(
    `
      SELECT
        i.id,
        i.nombre,
        i.documento_identidad,
        i.notas,
        ci.rol,
        ci.datos_contexto
      FROM causa_imputados ci
      INNER JOIN imputados i ON i.id = ci.imputado_id
      WHERE ci.causa_id = $1
      ORDER BY i.nombre ASC
    `,
    [id]
  );

  const analysisResult = await pool.query(
    `
      SELECT resultado_json, created_at
      FROM analisis_ia
      WHERE causa_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [id]
  );

  const documentsResult = await pool.query(
    `
      SELECT
        id,
        causa_id,
        nombre_archivo,
        tipo_archivo,
        texto_extraido,
        ruta_archivo,
        estado_procesamiento,
        sha256,
        version,
        requiere_ocr,
        confianza_extraccion,
        created_at
      FROM documentos
      WHERE causa_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [id]
  );

  const jurisprudenceResult = await pool.query(
    `
      SELECT
        id,
        titulo,
        anio,
        tribunal,
        referencia,
        resumen,
        created_at
      FROM jurisprudencia
      WHERE causa_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [id]
  );

  const datesResult = await pool.query(
    `
      SELECT
        id,
        fecha_texto,
        fecha,
        evento,
        tipo,
        requiere_alerta
      FROM fechas_relevantes
      WHERE causa_id = $1
      ORDER BY fecha ASC NULLS LAST, id ASC
    `,
    [id]
  );

  return mapCaseDetailRow(
    caseResult.rows[0],
    defendantsResult.rows,
    analysisResult.rows[0],
    documentsResult.rows,
    jurisprudenceResult.rows,
    datesResult.rows
  );
}

async function createCase(payload, security) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const caseResult = await client.query(
      `
        INSERT INTO causas (identificador, caratula, descripcion, estado, organizacion_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        emptyToNull(payload.identificador),
        payload.caratula.trim(),
        emptyToNull(payload.descripcion),
        payload.estado || "activa",
        security.organizationId,
        security.userId,
      ]
    );

    const caseId = caseResult.rows[0].id;

    for (const defendant of payload.imputados || []) {
      const name = typeof defendant === "string" ? defendant : defendant.nombre;

      if (!name || !name.trim()) {
        continue;
      }

      const defendantResult = await client.query(
        `
          INSERT INTO imputados (nombre, documento_identidad, notas)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [
          name.trim(),
          emptyToNull(defendant.documento_identidad),
          emptyToNull(defendant.notas),
        ]
      );

      await client.query(
        `
          INSERT INTO causa_imputados (causa_id, imputado_id, rol, datos_contexto)
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          caseId,
          defendantResult.rows[0].id,
          defendant.rol || "imputado",
          JSON.stringify(defendant.datos_contexto || {}),
        ]
      );
    }

    for (const document of normalizeTextItems(payload.documentos)) {
      await client.query(
        `
          INSERT INTO documentos (
            causa_id,
            nombre_archivo,
            tipo_archivo,
            mime_type,
          tamano_bytes,
          texto_extraido,
          estado_procesamiento
        )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          caseId,
          document,
          "nota_inicial",
          "text/plain",
          Buffer.byteLength(document, "utf8"),
          document,
          DOCUMENT_PROCESSING_STATES.TEXT_EXTRACTED,
        ]
      );
    }

    for (const precedent of normalizeTextItems(payload.jurisprudencia)) {
      await client.query(
        `
          INSERT INTO jurisprudencia (
            causa_id,
            titulo,
            resumen
          )
          VALUES ($1, $2, $3)
        `,
        [caseId, precedent, "Referencia inicial cargada al crear el caso."]
      );
    }

    if (payload.fecha_importante) {
      await client.query(
        `
          INSERT INTO fechas_relevantes (
            causa_id,
            fecha_texto,
            fecha,
            evento,
            tipo,
            requiere_alerta
          )
          VALUES ($1, $2, $3, $4, 'fecha_inicial', true)
        `,
        [
          caseId,
          payload.fecha_importante,
          parseInputDate(payload.fecha_importante),
          "Fecha importante cargada al crear el caso.",
        ]
      );
    }

    await client.query("COMMIT");
    return getCaseById(caseId, security.organizationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateCase(id, payload, organizationId) {
  ensureDatabaseConfigured();

  const allowedFields = ["caratula", "descripcion", "estado", "identificador"];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      values.push(field === "caratula" ? payload[field].trim() : emptyToNull(payload[field]));
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (!updates.length) {
    return getCaseById(id, organizationId);
  }

  values.push(id);

  const result = await pool.query(
    `
      UPDATE causas
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length} AND organizacion_id = $${values.length + 1}
      RETURNING id
    `,
    [...values, organizationId]
  );

  if (!result.rowCount) {
    return null;
  }

  return getCaseById(id, organizationId);
}

async function deleteCase(id) {
  ensureDatabaseConfigured();

  const documentsResult = await pool.query(
    `
      SELECT ruta_archivo
      FROM documentos
      WHERE causa_id = $1 AND ruta_archivo IS NOT NULL
    `,
    [id]
  );

  const result = await pool.query(
    `
      DELETE FROM causas
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return {
    deleted: result.rowCount > 0,
    filePaths: documentsResult.rows.map((row) => row.ruta_archivo).filter(Boolean),
  };
}

async function listDefendantsByCase(caseId) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      SELECT
        i.id,
        i.nombre,
        i.documento_identidad,
        i.notas,
        ci.rol,
        ci.datos_contexto
      FROM causa_imputados ci
      INNER JOIN imputados i ON i.id = ci.imputado_id
      WHERE ci.causa_id = $1
      ORDER BY i.nombre ASC
    `,
    [caseId]
  );

  return result.rows.map(mapDefendantRow);
}

async function addDefendantToCase(caseId, payload) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureCaseExists(client, caseId);

    const defendantResult = await client.query(
      `
        INSERT INTO imputados (nombre, documento_identidad, notas)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        payload.nombre.trim(),
        emptyToNull(payload.documento_identidad),
        emptyToNull(payload.notas),
      ]
    );

    const defendantId = defendantResult.rows[0].id;

    await client.query(
      `
        INSERT INTO causa_imputados (causa_id, imputado_id, rol, datos_contexto)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        caseId,
        defendantId,
        payload.rol || "imputado",
        JSON.stringify(payload.datos_contexto || {}),
      ]
    );

    await touchCase(client, caseId);
    await client.query("COMMIT");

    return getDefendantByCase(caseId, defendantId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateDefendantInCase(caseId, defendantId, payload) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const link = await client.query(
      `
        SELECT 1
        FROM causa_imputados
        WHERE causa_id = $1 AND imputado_id = $2
      `,
      [caseId, defendantId]
    );

    if (!link.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    const defendantUpdates = [];
    const defendantValues = [];

    for (const field of ["nombre", "documento_identidad", "notas"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        defendantValues.push(field === "nombre" ? payload[field].trim() : emptyToNull(payload[field]));
        defendantUpdates.push(`${field} = $${defendantValues.length}`);
      }
    }

    if (defendantUpdates.length) {
      defendantValues.push(defendantId);
      await client.query(
        `
          UPDATE imputados
          SET ${defendantUpdates.join(", ")}, updated_at = NOW()
          WHERE id = $${defendantValues.length}
        `,
        defendantValues
      );
    }

    const linkUpdates = [];
    const linkValues = [];

    if (Object.prototype.hasOwnProperty.call(payload, "rol")) {
      linkValues.push(payload.rol || "imputado");
      linkUpdates.push(`rol = $${linkValues.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "datos_contexto")) {
      linkValues.push(JSON.stringify(payload.datos_contexto || {}));
      linkUpdates.push(`datos_contexto = $${linkValues.length}::jsonb`);
    }

    if (linkUpdates.length) {
      linkValues.push(caseId, defendantId);
      await client.query(
        `
          UPDATE causa_imputados
          SET ${linkUpdates.join(", ")}
          WHERE causa_id = $${linkValues.length - 1}
            AND imputado_id = $${linkValues.length}
        `,
        linkValues
      );
    }

    await touchCase(client, caseId);
    await client.query("COMMIT");

    return getDefendantByCase(caseId, defendantId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteDefendantFromCase(caseId, defendantId) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        DELETE FROM causa_imputados
        WHERE causa_id = $1 AND imputado_id = $2
        RETURNING imputado_id
      `,
      [caseId, defendantId]
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `
        DELETE FROM imputados i
        WHERE i.id = $1
          AND NOT EXISTS (
            SELECT 1 FROM causa_imputados ci WHERE ci.imputado_id = i.id
          )
      `,
      [defendantId]
    );

    await touchCase(client, caseId);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listDocumentsByCase(caseId, filters = {}) {
  ensureDatabaseConfigured();

  const values = [caseId];
  const where = ["d.causa_id = $1"];

  if (filters.categoria) {
    values.push(filters.categoria);
    where.push(`d.tipo_archivo = $${values.length}`);
  }

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`d.estado_procesamiento = $${values.length}`);
  }

  if (filters.expediente) {
    values.push(`%${filters.expediente}%`);
    where.push(`(c.identificador ILIKE $${values.length} OR d.nombre_archivo ILIKE $${values.length})`);
  }

  if (filters.q) {
    values.push(`%${filters.q}%`);
    where.push(`(d.nombre_archivo ILIKE $${values.length} OR d.texto_extraido ILIKE $${values.length})`);
  }

  if (filters.imputadoId) {
    values.push(filters.imputadoId);
    where.push(`EXISTS (
      SELECT 1
      FROM documento_imputados di_filter
      WHERE di_filter.documento_id = d.id
        AND di_filter.causa_id = d.causa_id
        AND di_filter.imputado_id = $${values.length}
    )`);
  }

  const result = await pool.query(
    `
      SELECT
        d.id,
        d.causa_id,
        d.nombre_archivo,
        d.tipo_archivo,
        d.mime_type,
        d.tamano_bytes,
        d.ruta_archivo,
        d.texto_extraido,
        d.estado_procesamiento,
        d.sha256,
        d.version,
        d.requiere_ocr,
        d.confianza_extraccion,
        d.created_at,
        d.updated_at,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', i.id,
              'nombre', i.nombre,
              'tipo_relacion', di.tipo_relacion
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS imputados
      FROM documentos d
      INNER JOIN causas c ON c.id = d.causa_id
      LEFT JOIN documento_imputados di ON di.documento_id = d.id
      LEFT JOIN imputados i ON i.id = di.imputado_id
      WHERE ${where.join(" AND ")}
      GROUP BY d.id
      ORDER BY d.created_at DESC, d.id DESC
    `,
    values
  );

  return result.rows.map(mapDocumentRow);
}

async function listDeadlinesByOrganization(organizationId, filters = {}) {
  ensureDatabaseConfigured();

  const values = [organizationId];
  const where = ["c.organizacion_id = $1"];

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`fr.estado = $${values.length}`);
  } else {
    where.push("fr.estado IN ('pendiente', 'en_seguimiento')");
  }

  if (filters.desde) {
    values.push(filters.desde);
    where.push(`fr.fecha >= $${values.length}`);
  }

  if (filters.hasta) {
    values.push(filters.hasta);
    where.push(`fr.fecha <= $${values.length}`);
  }

  if (filters.responsableUserId) {
    values.push(filters.responsableUserId);
    where.push(`fr.responsable_user_id = $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        fr.id,
        fr.causa_id,
        c.identificador,
        c.caratula,
        fr.fecha_texto,
        fr.fecha,
        fr.evento,
        fr.tipo,
        fr.requiere_alerta,
        fr.estado,
        fr.prioridad,
        fr.responsable_user_id,
        fr.recordatorio_at,
        fr.completado_at,
        fr.metadata_json,
        fr.updated_at,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', rv.id,
              'estado', rv.estado,
              'canal', rv.canal,
              'programado_para', rv.programado_para
            )
          ) FILTER (WHERE rv.id IS NOT NULL),
          '[]'
        ) AS recordatorios
      FROM fechas_relevantes fr
      INNER JOIN causas c ON c.id = fr.causa_id
      LEFT JOIN recordatorios_vencimientos rv ON rv.fecha_relevante_id = fr.id
      WHERE ${where.join(" AND ")}
      GROUP BY fr.id, c.id
      ORDER BY fr.fecha ASC NULLS LAST, fr.prioridad DESC, fr.id ASC
      LIMIT $${values.length + 1}
    `,
    [...values, filters.limit || 100]
  );

  return result.rows.map(mapDeadlineRow);
}

async function listDatesByCase(caseId, filters = {}) {
  ensureDatabaseConfigured();

  const values = [caseId];
  const where = ["fr.causa_id = $1"];

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`fr.estado = $${values.length}`);
  }

  if (filters.tipo) {
    values.push(filters.tipo);
    where.push(`fr.tipo = $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        fr.id,
        fr.causa_id,
        fr.fecha_texto,
        fr.fecha,
        fr.evento,
        fr.tipo,
        fr.requiere_alerta,
        fr.estado,
        fr.prioridad,
        fr.responsable_user_id,
        fr.recordatorio_at,
        fr.completado_at,
        fr.metadata_json,
        fr.updated_at,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', rv.id,
              'estado', rv.estado,
              'canal', rv.canal,
              'programado_para', rv.programado_para,
              'titulo', rv.titulo
            )
          ) FILTER (WHERE rv.id IS NOT NULL),
          '[]'
        ) AS recordatorios
      FROM fechas_relevantes fr
      LEFT JOIN recordatorios_vencimientos rv ON rv.fecha_relevante_id = fr.id
      WHERE ${where.join(" AND ")}
      GROUP BY fr.id
      ORDER BY fr.fecha ASC NULLS LAST, fr.id ASC
    `,
    values
  );

  return result.rows.map(mapDeadlineRow);
}

async function createDateForCase(caseId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      INSERT INTO fechas_relevantes (
        causa_id,
        fecha_texto,
        fecha,
        evento,
        tipo,
        requiere_alerta,
        estado,
        prioridad,
        responsable_user_id,
        recordatorio_at,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING *
    `,
    [
      caseId,
      payload.fecha_texto || payload.fecha,
      payload.fecha || parseInputDate(payload.fecha_texto),
      payload.evento,
      payload.tipo || "vencimiento",
      payload.requiere_alerta !== false,
      payload.estado || "pendiente",
      payload.prioridad || "media",
      payload.responsable_user_id || null,
      payload.recordatorio_at || null,
      JSON.stringify(payload.metadata || {}),
    ]
  );

  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [caseId]);
  return mapDeadlineRow(result.rows[0]);
}

async function updateDateForCase(caseId, dateId, payload) {
  ensureDatabaseConfigured();

  const allowedFields = [
    "fecha_texto",
    "fecha",
    "evento",
    "tipo",
    "requiere_alerta",
    "estado",
    "prioridad",
    "responsable_user_id",
    "recordatorio_at",
  ];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      values.push(field === "responsable_user_id" ? payload[field] || null : payload[field]);
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "metadata")) {
    values.push(JSON.stringify(payload.metadata || {}));
    updates.push(`metadata_json = $${values.length}::jsonb`);
  }

  if (payload.estado === "completada") {
    updates.push("completado_at = COALESCE(completado_at, NOW())");
  } else if (Object.prototype.hasOwnProperty.call(payload, "estado")) {
    updates.push("completado_at = NULL");
  }

  if (!updates.length) {
    const current = await pool.query(
      `
        SELECT
          id,
          causa_id,
          fecha_texto,
          fecha,
          evento,
          tipo,
          requiere_alerta,
          estado,
          prioridad,
          responsable_user_id,
          recordatorio_at,
          completado_at,
          metadata_json,
          updated_at
        FROM fechas_relevantes
        WHERE causa_id = $1 AND id = $2
      `,
      [caseId, dateId]
    );
    return current.rows[0] ? mapDeadlineRow(current.rows[0]) : null;
  }

  values.push(caseId, dateId);

  const result = await pool.query(
    `
      UPDATE fechas_relevantes
      SET ${updates.join(", ")},
          updated_at = NOW()
      WHERE causa_id = $${values.length - 1}
        AND id = $${values.length}
      RETURNING *
    `,
    values
  );

  if (!result.rowCount) {
    return null;
  }

  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [caseId]);
  return mapDeadlineRow(result.rows[0]);
}

async function createDeadlineReminder(caseId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      INSERT INTO recordatorios_vencimientos (
        organizacion_id,
        causa_id,
        fecha_relevante_id,
        destinatario_user_id,
        canal,
        titulo,
        mensaje,
        programado_para,
        metadata_json
      )
      SELECT
        c.organizacion_id,
        fr.causa_id,
        fr.id,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::jsonb
      FROM fechas_relevantes fr
      INNER JOIN causas c ON c.id = fr.causa_id
      WHERE fr.causa_id = $1
        AND fr.id = $2
      RETURNING *
    `,
    [
      caseId,
      payload.fecha_relevante_id,
      payload.destinatario_user_id || null,
      payload.canal || "app",
      payload.titulo,
      payload.mensaje,
      payload.programado_para,
      JSON.stringify(payload.metadata || {}),
    ]
  );

  return result.rows[0] ? mapReminderRow(result.rows[0]) : null;
}

async function listPendingReminders(organizationId, filters = {}) {
  ensureDatabaseConfigured();

  const values = [organizationId];
  const where = ["rv.organizacion_id = $1"];

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`rv.estado = $${values.length}`);
  } else {
    where.push("rv.estado = 'pendiente'");
  }

  if (filters.hasta) {
    values.push(filters.hasta);
    where.push(`rv.programado_para <= $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        rv.*,
        c.identificador,
        c.caratula,
        fr.fecha,
        fr.evento
      FROM recordatorios_vencimientos rv
      INNER JOIN causas c ON c.id = rv.causa_id
      INNER JOIN fechas_relevantes fr ON fr.id = rv.fecha_relevante_id
      WHERE ${where.join(" AND ")}
      ORDER BY rv.programado_para ASC, rv.id ASC
      LIMIT $${values.length + 1}
    `,
    [...values, filters.limit || 100]
  );

  return result.rows.map(mapReminderRow);
}

async function updateReminderStatus(organizationId, reminderId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      UPDATE recordatorios_vencimientos
      SET estado = $3,
          enviado_at = CASE WHEN $3 = 'enviado' THEN COALESCE(enviado_at, NOW()) ELSE enviado_at END,
          leido_at = CASE WHEN $3 = 'leido' THEN COALESCE(leido_at, NOW()) ELSE leido_at END,
          error_detalle = $4,
          updated_at = NOW()
      WHERE organizacion_id = $1
        AND id = $2
      RETURNING *
    `,
    [organizationId, reminderId, payload.estado, payload.error_detalle || null]
  );

  return result.rows[0] ? mapReminderRow(result.rows[0]) : null;
}

async function listActionsByCase(caseId, filters = {}) {
  ensureDatabaseConfigured();

  const values = [caseId];
  const where = ["a.causa_id = $1"];

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`a.estado = $${values.length}`);
  }

  if (filters.fuente) {
    values.push(filters.fuente);
    where.push(`a.fuente = $${values.length}`);
  }

  if (filters.imputadoId) {
    values.push(filters.imputadoId);
    where.push(`EXISTS (
      SELECT 1
      FROM actuacion_imputados ai_filter
      WHERE ai_filter.actuacion_id = a.id
        AND ai_filter.causa_id = a.causa_id
        AND ai_filter.imputado_id = $${values.length}
    )`);
  }

  if (filters.documentoId) {
    values.push(filters.documentoId);
    where.push(`EXISTS (
      SELECT 1
      FROM documento_actuaciones da_filter
      WHERE da_filter.actuacion_id = a.id
        AND da_filter.causa_id = a.causa_id
        AND da_filter.documento_id = $${values.length}
    )`);
  }

  if (filters.q) {
    values.push(`%${filters.q}%`);
    where.push(`a.descripcion ILIKE $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.causa_id,
        a.documento_id,
        a.analisis_ia_id,
        a.descripcion,
        a.estado,
        a.fuente,
        a.created_at,
        a.updated_at,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', i.id,
              'nombre', i.nombre,
              'tipo_relacion', ai.tipo_relacion
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS imputados,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', d.id,
              'nombre', d.nombre_archivo,
              'tipo_relacion', da.tipo_relacion
            )
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM actuaciones a
      LEFT JOIN actuacion_imputados ai ON ai.actuacion_id = a.id
      LEFT JOIN imputados i ON i.id = ai.imputado_id
      LEFT JOIN documento_actuaciones da ON da.actuacion_id = a.id
      LEFT JOIN documentos d ON d.id = da.documento_id
      WHERE ${where.join(" AND ")}
      GROUP BY a.id
      ORDER BY a.created_at DESC, a.id DESC
    `,
    values
  );

  return result.rows.map(mapActionRow);
}

async function getCaseRelations(caseId) {
  ensureDatabaseConfigured();

  const [documentDefendants, actionDefendants, documentActions] = await Promise.all([
    pool.query(
      `
        SELECT
          di.documento_id,
          d.nombre_archivo,
          di.imputado_id,
          i.nombre AS imputado_nombre,
          di.tipo_relacion,
          di.evidencia,
          di.fuente,
          di.created_at
        FROM documento_imputados di
        INNER JOIN documentos d ON d.id = di.documento_id
        INNER JOIN imputados i ON i.id = di.imputado_id
        WHERE di.causa_id = $1
        ORDER BY d.created_at DESC, i.nombre ASC
      `,
      [caseId]
    ),
    pool.query(
      `
        SELECT
          ai.actuacion_id,
          a.descripcion,
          ai.imputado_id,
          i.nombre AS imputado_nombre,
          ai.tipo_relacion,
          ai.evidencia,
          ai.fuente,
          ai.created_at
        FROM actuacion_imputados ai
        INNER JOIN actuaciones a ON a.id = ai.actuacion_id
        INNER JOIN imputados i ON i.id = ai.imputado_id
        WHERE ai.causa_id = $1
        ORDER BY a.created_at DESC, i.nombre ASC
      `,
      [caseId]
    ),
    pool.query(
      `
        SELECT
          da.documento_id,
          d.nombre_archivo,
          da.actuacion_id,
          a.descripcion,
          da.tipo_relacion,
          da.evidencia,
          da.fuente,
          da.created_at
        FROM documento_actuaciones da
        INNER JOIN documentos d ON d.id = da.documento_id
        INNER JOIN actuaciones a ON a.id = da.actuacion_id
        WHERE da.causa_id = $1
        ORDER BY da.created_at DESC
      `,
      [caseId]
    ),
  ]);

  return {
    documentos_imputados: documentDefendants.rows,
    actuaciones_imputados: actionDefendants.rows,
    documentos_actuaciones: documentActions.rows,
  };
}

async function linkDocumentToDefendant(caseId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      INSERT INTO documento_imputados (
        documento_id,
        imputado_id,
        causa_id,
        tipo_relacion,
        evidencia,
        fuente
      )
      SELECT d.id, i.id, $1, $4, $5, $6
      FROM documentos d
      INNER JOIN causa_imputados ci ON ci.causa_id = d.causa_id
      INNER JOIN imputados i ON i.id = ci.imputado_id
      WHERE d.causa_id = $1
        AND d.id = $2
        AND i.id = $3
      ON CONFLICT (documento_id, imputado_id, tipo_relacion)
      DO UPDATE SET
        evidencia = EXCLUDED.evidencia,
        fuente = EXCLUDED.fuente
      RETURNING documento_id, imputado_id, causa_id, tipo_relacion, evidencia, fuente, created_at
    `,
    [
      caseId,
      payload.documento_id,
      payload.imputado_id,
      payload.tipo_relacion || "mencionado",
      emptyToNull(payload.evidencia),
      payload.fuente || "manual",
    ]
  );

  return result.rows[0] || null;
}

async function linkActionToDefendant(caseId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      INSERT INTO actuacion_imputados (
        actuacion_id,
        imputado_id,
        causa_id,
        tipo_relacion,
        evidencia,
        fuente
      )
      SELECT a.id, i.id, $1, $4, $5, $6
      FROM actuaciones a
      INNER JOIN causa_imputados ci ON ci.causa_id = a.causa_id
      INNER JOIN imputados i ON i.id = ci.imputado_id
      WHERE a.causa_id = $1
        AND a.id = $2
        AND i.id = $3
      ON CONFLICT (actuacion_id, imputado_id, tipo_relacion)
      DO UPDATE SET
        evidencia = EXCLUDED.evidencia,
        fuente = EXCLUDED.fuente
      RETURNING actuacion_id, imputado_id, causa_id, tipo_relacion, evidencia, fuente, created_at
    `,
    [
      caseId,
      payload.actuacion_id,
      payload.imputado_id,
      payload.tipo_relacion || "vinculado",
      emptyToNull(payload.evidencia),
      payload.fuente || "manual",
    ]
  );

  return result.rows[0] || null;
}

async function linkDocumentToAction(caseId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      INSERT INTO documento_actuaciones (
        documento_id,
        actuacion_id,
        causa_id,
        tipo_relacion,
        evidencia,
        fuente
      )
      SELECT d.id, a.id, $1, $4, $5, $6
      FROM documentos d
      INNER JOIN actuaciones a ON a.causa_id = d.causa_id
      WHERE d.causa_id = $1
        AND d.id = $2
        AND a.id = $3
      ON CONFLICT (documento_id, actuacion_id, tipo_relacion)
      DO UPDATE SET
        evidencia = EXCLUDED.evidencia,
        fuente = EXCLUDED.fuente
      RETURNING documento_id, actuacion_id, causa_id, tipo_relacion, evidencia, fuente, created_at
    `,
    [
      caseId,
      payload.documento_id,
      payload.actuacion_id,
      payload.tipo_relacion || "sustento",
      emptyToNull(payload.evidencia),
      payload.fuente || "manual",
    ]
  );

  return result.rows[0] || null;
}

async function createInternalComparison(caseId, payload) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      INSERT INTO comparaciones_internas (
        causa_id,
        tipo,
        origen_tipo,
        origen_id,
        destino_tipo,
        destino_id,
        imputado_id,
        criterio,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING *
    `,
    [
      caseId,
      payload.tipo,
      payload.origen_tipo,
      payload.origen_id,
      payload.destino_tipo,
      payload.destino_id,
      payload.imputado_id || null,
      payload.criterio || "comparacion_interna",
      JSON.stringify(payload.metadata || {}),
    ]
  );

  return mapComparisonRow(result.rows[0]);
}

async function listInternalComparisons(caseId, filters = {}) {
  ensureDatabaseConfigured();

  const values = [caseId];
  const where = ["causa_id = $1"];

  if (filters.imputadoId) {
    values.push(filters.imputadoId);
    where.push(`imputado_id = $${values.length}`);
  }

  if (filters.tipo) {
    values.push(filters.tipo);
    where.push(`tipo = $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        id,
        causa_id,
        tipo,
        origen_tipo,
        origen_id,
        destino_tipo,
        destino_id,
        imputado_id,
        criterio,
        estado,
        resultado_json,
        metadata_json,
        created_at,
        updated_at
      FROM comparaciones_internas
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC, id DESC
    `,
    values
  );

  return result.rows.map(mapComparisonRow);
}

async function createDocument(caseId, payload) {
  ensureDatabaseConfigured();

  const caseResult = await pool.query("SELECT id FROM causas WHERE id = $1", [caseId]);

  if (!caseResult.rowCount) {
    const error = new Error("Caso no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const file = payload.archivo;
  const text = payload.texto_extraido || (await extractTextFromFile(file));
  const documentName = payload.nombre_archivo || file?.originalname;
  const documentType =
    payload.tipo_archivo ||
    getFileExtension(file?.originalname) ||
    "documento";
  const hashInput = file?.path ? await fs.readFile(file.path) : Buffer.from(text || "", "utf8");
  const sha256 = crypto.createHash("sha256").update(hashInput).digest("hex");

  const result = await pool.query(
    `
      INSERT INTO documentos (
        causa_id,
        nombre_archivo,
        tipo_archivo,
        mime_type,
        tamano_bytes,
        ruta_archivo,
        texto_extraido,
        estado_procesamiento,
        sha256
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        causa_id,
        nombre_archivo,
        tipo_archivo,
        mime_type,
        tamano_bytes,
        ruta_archivo,
        texto_extraido,
        estado_procesamiento,
        created_at,
        updated_at,
        sha256,
        version,
        requiere_ocr,
        confianza_extraccion
    `,
    [
      caseId,
      documentName.trim(),
      documentType,
      file?.mimetype || payload.mime_type || "text/plain",
      file?.size || Buffer.byteLength(text || "", "utf8"),
      file?.path || null,
      text || null,
      text
        ? DOCUMENT_PROCESSING_STATES.TEXT_EXTRACTED
        : DOCUMENT_PROCESSING_STATES.PENDING,
      sha256,
    ]
  );

  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [caseId]);
  return mapDocumentRow(result.rows[0]);
}

async function updateDocument(caseId, documentId, payload) {
  ensureDatabaseConfigured();

  const allowedFields = [
    "nombre_archivo",
    "tipo_archivo",
    "mime_type",
    "texto_extraido",
    "estado_procesamiento",
  ];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      values.push(emptyToNull(payload[field]));
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "texto_extraido") &&
    !Object.prototype.hasOwnProperty.call(payload, "estado_procesamiento")
  ) {
    values.push(
      payload.texto_extraido
        ? DOCUMENT_PROCESSING_STATES.TEXT_EXTRACTED
        : DOCUMENT_PROCESSING_STATES.PENDING
    );
    updates.push(`estado_procesamiento = $${values.length}`);
  }

  if (!updates.length) {
    return getDocumentById(caseId, documentId).then((document) =>
      document ? mapDocumentRow(document) : null
    );
  }

  values.push(caseId, documentId);

  const result = await pool.query(
    `
      UPDATE documentos
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE causa_id = $${values.length - 1}
        AND id = $${values.length}
      RETURNING
        id,
        causa_id,
        nombre_archivo,
        tipo_archivo,
        mime_type,
        tamano_bytes,
        ruta_archivo,
        texto_extraido,
        estado_procesamiento,
        created_at,
        updated_at,
        sha256,
        version,
        requiere_ocr,
        confianza_extraccion
    `,
    values
  );

  if (!result.rowCount) {
    return null;
  }

  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [caseId]);
  return mapDocumentRow(result.rows[0]);
}

async function getDocumentById(caseId, documentId) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      SELECT
        id,
        causa_id,
        nombre_archivo,
        tipo_archivo,
        mime_type,
        tamano_bytes,
        ruta_archivo,
        texto_extraido,
        estado_procesamiento,
        sha256,
        version,
        requiere_ocr,
        confianza_extraccion,
        created_at,
        updated_at
      FROM documentos
      WHERE causa_id = $1 AND id = $2
    `,
    [caseId, documentId]
  );

  return result.rows[0] || null;
}

async function deleteDocument(caseId, documentId) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      DELETE FROM documentos
      WHERE causa_id = $1 AND id = $2
      RETURNING id, causa_id, ruta_archivo
    `,
    [caseId, documentId]
  );

  if (!result.rowCount) {
    return null;
  }

  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [caseId]);
  return result.rows[0];
}

function mapCaseListRow(row) {
  const alertLevel = getAlertLevel(row.proxima_alerta);

  return {
    alert_level: alertLevel,
    caption: buildCaption(row),
    created_at: row.created_at,
    descripcion: row.descripcion,
    estado: row.estado,
    id: row.id,
    identificador: row.identificador,
    imputados_count: row.imputados_count,
    name: row.caratula,
    proxima_alerta: row.proxima_alerta,
    slug: String(row.id),
    updated_at: row.updated_at,
  };
}

function mapCaseDetailRow(
  caseRow,
  defendantRows,
  analysisRow,
  documentRows = [],
  jurisprudenceRows = [],
  dateRows = []
) {
  const defendants = defendantRows.map((row) => ({
    caseLink:
      row.datos_contexto?.vinculo ||
      "Vinculado al expediente para revisar datos, actuaciones y documentos.",
    documento_identidad: row.documento_identidad,
    id: row.id,
    keyData: normalizeList(row.datos_contexto?.datos_clave, [
      row.documento_identidad
        ? `Documento: ${row.documento_identidad}`
        : "Datos personales pendientes de validar",
      "Actuaciones y documentos vinculados",
    ]),
    name: row.nombre,
    notas: row.notas,
    role: row.rol || "Imputado",
    status: row.datos_contexto?.estado || "Ficha inicial",
    summary:
      row.notas ||
      row.datos_contexto?.resumen ||
      "Ficha disponible para completar y validar.",
  }));

  return {
    analisis: mapAnalysis(analysisRow),
    created_at: caseRow.created_at,
    deadline: buildDeadline(dateRows),
    descripcion: caseRow.descripcion,
    estado: caseRow.estado,
    id: caseRow.id,
    identificador: caseRow.identificador,
    name: caseRow.caratula,
    slug: String(caseRow.id),
    status: translateStatus(caseRow.estado),
    updated_at: caseRow.updated_at,
    defendants,
    documentos: documentRows.map(mapDocumentRow),
    fechas: dateRows.map(mapDateRow),
    jurisprudencia: jurisprudenceRows.map(mapJurisprudenceRow),
  };
}

function mapDocumentRow(row) {
  return {
    categoria: row.tipo_archivo || "Documento",
    download_url: row.ruta_archivo ? `/api/casos/${row.causa_id || ""}/documentos/${row.id}/download` : null,
    estado: row.estado_procesamiento,
    fecha: `Cargado el ${new Date(row.created_at).toLocaleDateString("es-AR")}`,
    id: row.id,
    mime_type: row.mime_type,
    nombre: row.nombre_archivo,
    resumen:
      row.texto_extraido?.slice(0, 180) ||
      "Documento asociado al expediente.",
    tamano_bytes: row.tamano_bytes,
    sha256: row.sha256 || null,
    version: row.version || 1,
    requiere_ocr: Boolean(row.requiere_ocr),
    confianza_extraccion: row.confianza_extraccion == null ? null : Number(row.confianza_extraccion),
    imputados: Array.isArray(row.imputados) ? row.imputados : [],
  };
}

function mapActionRow(row) {
  return {
    analisis_ia_id: row.analisis_ia_id,
    causa_id: row.causa_id,
    created_at: row.created_at,
    descripcion: row.descripcion,
    documento_id: row.documento_id,
    documentos: Array.isArray(row.documentos) ? row.documentos : [],
    estado: row.estado,
    fuente: row.fuente,
    id: row.id,
    imputados: Array.isArray(row.imputados) ? row.imputados : [],
    updated_at: row.updated_at,
  };
}

function mapComparisonRow(row) {
  return {
    causa_id: row.causa_id,
    created_at: row.created_at,
    criterio: row.criterio,
    destino_id: row.destino_id,
    destino_tipo: row.destino_tipo,
    estado: row.estado,
    id: row.id,
    imputado_id: row.imputado_id,
    metadata: row.metadata_json || {},
    origen_id: row.origen_id,
    origen_tipo: row.origen_tipo,
    resultado: row.resultado_json || {},
    tipo: row.tipo,
    updated_at: row.updated_at,
  };
}

function mapDefendantRow(row) {
  return {
    caseLink:
      row.datos_contexto?.vinculo ||
      "Vinculado al expediente para revisar datos, actuaciones y documentos.",
    documento_identidad: row.documento_identidad,
    id: row.id,
    keyData: normalizeList(row.datos_contexto?.datos_clave, [
      row.documento_identidad
        ? `Documento: ${row.documento_identidad}`
        : "Datos personales pendientes de validar",
      "Actuaciones y documentos vinculados",
    ]),
    name: row.nombre,
    nombre: row.nombre,
    notas: row.notas,
    role: row.rol || "Imputado",
    rol: row.rol || "imputado",
    status: row.datos_contexto?.estado || "Ficha inicial",
    summary:
      row.notas ||
      row.datos_contexto?.resumen ||
      "Ficha disponible para completar y validar.",
  };
}

function mapJurisprudenceRow(row) {
  return {
    anio: row.anio ? String(row.anio) : "s/f",
    detalle:
      row.resumen ||
      row.referencia ||
      row.tribunal ||
      "Referencia jurisprudencial asociada al caso.",
    id: row.id,
    titulo: row.titulo,
  };
}

function mapDateRow(row) {
  const date = row.fecha ? new Date(row.fecha) : null;

  return {
    descripcion: row.evento || row.tipo || "Fecha importante",
    dia: date
      ? `${date.getDate()}/${date.getMonth() + 1}`
      : row.fecha_texto || "Sin fecha",
    hora: "09:00",
    id: row.id,
    prioridad: getAlertLevel(row.fecha) === "urgente" ? "Alta" : "Media",
    requiere_alerta: row.requiere_alerta,
  };
}

function mapDeadlineRow(row) {
  const date = row.fecha ? new Date(row.fecha) : null;
  const today = startOfDay(new Date());
  const daysUntil = date ? Math.round((startOfDay(date) - today) / 86400000) : null;

  return {
    caratula: row.caratula,
    causa_id: row.causa_id,
    completado_at: row.completado_at || null,
    dias_restantes: daysUntil,
    estado: row.estado || "pendiente",
    evento: row.evento,
    expediente: row.identificador,
    fecha: row.fecha,
    fecha_texto: row.fecha_texto,
    id: row.id,
    metadata: row.metadata_json || {},
    prioridad: row.prioridad || "media",
    recordatorio_at: row.recordatorio_at || null,
    recordatorios: Array.isArray(row.recordatorios) ? row.recordatorios : [],
    requiere_alerta: Boolean(row.requiere_alerta),
    responsable_user_id: row.responsable_user_id || null,
    tipo: row.tipo,
    updated_at: row.updated_at || null,
  };
}

function mapReminderRow(row) {
  return {
    canal: row.canal,
    caratula: row.caratula,
    causa_id: row.causa_id,
    created_at: row.created_at,
    destinatario_user_id: row.destinatario_user_id,
    enviado_at: row.enviado_at,
    error_detalle: row.error_detalle,
    estado: row.estado,
    evento: row.evento,
    expediente: row.identificador,
    fecha: row.fecha,
    fecha_relevante_id: row.fecha_relevante_id,
    id: row.id,
    leido_at: row.leido_at,
    mensaje: row.mensaje,
    metadata: row.metadata_json || {},
    organizacion_id: row.organizacion_id,
    programado_para: row.programado_para,
    titulo: row.titulo,
    updated_at: row.updated_at,
  };
}

function buildDeadline(dateRows) {
  const nextDate = dateRows.find((row) => row.fecha);

  if (!nextDate) {
    return "Sin vencimiento cargado";
  }

  return `Alerta ${new Date(nextDate.fecha).toLocaleDateString("es-AR")}`;
}

function mapAnalysis(row) {
  if (!row?.resultado_json) {
    return undefined;
  }

  const result = row.resultado_json;

  return {
    datosClave: [
      ...(result.causa?.datos_generales || []),
      ...(result.causa?.hechos_relevantes || []),
    ].slice(0, 5),
    documentosBase: result._metadata?.source_file?.name
      ? [result._metadata.source_file.name]
      : ["Analisis guardado"],
    generado: new Date(row.created_at).toLocaleDateString("es-AR"),
    observacion:
      result.observaciones?.[0] ||
      "El analisis debe ser validado por criterio profesional.",
    resumen: result.resumen || "Sin resumen guardado.",
  };
}

function buildCaption(row) {
  if (row.proxima_alerta) {
    return `Alerta ${new Date(row.proxima_alerta).toLocaleDateString("es-AR")}`;
  }

  return translateStatus(row.estado);
}

function getAlertLevel(dateValue) {
  if (!dateValue) {
    return null;
  }

  const today = startOfDay(new Date());
  const alertDate = startOfDay(new Date(dateValue));
  const diffInDays = Math.round((alertDate - today) / 86400000);

  if (diffInDays <= 0) {
    return "urgente";
  }

  if (diffInDays <= 7) {
    return "proximo";
  }

  return null;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function translateStatus(status) {
  const labels = {
    activa: "Activo",
    archivada: "Archivado",
    cerrada: "Cerrado",
  };

  return labels[status] || status;
}

function normalizeList(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function emptyToNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getDefendantByCase(caseId, defendantId) {
  const result = await pool.query(
    `
      SELECT
        i.id,
        i.nombre,
        i.documento_identidad,
        i.notas,
        ci.rol,
        ci.datos_contexto
      FROM causa_imputados ci
      INNER JOIN imputados i ON i.id = ci.imputado_id
      WHERE ci.causa_id = $1 AND ci.imputado_id = $2
    `,
    [caseId, defendantId]
  );

  return result.rows[0] ? mapDefendantRow(result.rows[0]) : null;
}

async function ensureCaseExists(client, caseId) {
  const result = await client.query("SELECT id FROM causas WHERE id = $1", [caseId]);

  if (!result.rowCount) {
    const error = new Error("Caso no encontrado.");
    error.statusCode = 404;
    throw error;
  }
}

async function touchCase(client, caseId) {
  await client.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [caseId]);
}

async function extractTextFromFile(file) {
  if (!file || !isTextFile(file)) {
    return null;
  }

  return fs.readFile(file.path, "utf8");
}

function isTextFile(file) {
  const extension = getFileExtension(file.originalname);

  return (
    file.mimetype?.startsWith("text/") ||
    ["txt", "md", "csv", "json"].includes(extension)
  );
}

function getFileExtension(fileName = "") {
  const extension = path.extname(fileName).replace(".", "").toLowerCase();
  return extension || null;
}

function normalizeTextItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item?.titulo || item?.nombre))
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInputDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return normalized;
  }

  const argMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!argMatch) {
    return null;
  }

  const [, day, month, year] = argMatch;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function ensureDatabaseConfigured() {
  if (!databaseConfigured()) {
    const error = new Error("DATABASE_URL no esta configurado.");
    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  addDefendantToCase,
  createDateForCase,
  createDeadlineReminder,
  createInternalComparison,
  createDocument,
  createCase,
  deleteCase,
  deleteDocument,
  deleteDefendantFromCase,
  getDocumentById,
  getCaseById,
  getCaseRelations,
  linkActionToDefendant,
  linkDocumentToAction,
  linkDocumentToDefendant,
  listCases,
  listActionsByCase,
  listDatesByCase,
  listDeadlinesByOrganization,
  listInternalComparisons,
  listDocumentsByCase,
  listDefendantsByCase,
  listPendingReminders,
  updateCase,
  updateDateForCase,
  updateDocument,
  updateDefendantInCase,
  updateReminderStatus,
};
