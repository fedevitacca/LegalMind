const { pool } = require("../configuracion/baseDatos");
const {
  DOCUMENT_JOB_STATES,
  DOCUMENT_PROCESSING_STATES,
} = require("./estadosDocumentos");

const JOB_TYPES = Object.freeze({
  EXTRACT_TEXT: "extraer_texto",
  OCR: "ocr",
});

async function enqueueDocumentJob(
  documentId,
  caseId,
  { force = false, type = JOB_TYPES.EXTRACT_TEXT } = {}
) {
  if (!force) {
    const current = await pool.query(
      `
        SELECT id, documento_id, causa_id, tipo, estado
        FROM trabajos_documentales
        WHERE documento_id = $1
          AND tipo = $2
          AND estado IN ($3, $4)
        LIMIT 1
      `,
      [
        documentId,
        type,
        DOCUMENT_JOB_STATES.PENDING,
        DOCUMENT_JOB_STATES.PROCESSING,
      ]
    );

    if (current.rowCount) {
      return current.rows[0];
    }
  }

  const result = await pool.query(
    `
      INSERT INTO trabajos_documentales (documento_id, causa_id, tipo)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [documentId, caseId, type]
  );

  return result.rows[0];
}

async function getDocumentJobs(documentId, caseId) {
  const result = await pool.query(
    `
      SELECT
        id,
        tipo,
        estado,
        intentos,
        max_intentos,
        progreso,
        error_codigo,
        error_detalle,
        iniciado_at,
        finalizado_at,
        created_at,
        updated_at
      FROM trabajos_documentales
      WHERE documento_id = $1
        AND causa_id = $2
      ORDER BY created_at DESC
    `,
    [documentId, caseId]
  );

  return result.rows;
}

async function claimNextJob() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          t.*,
          d.nombre_archivo,
          d.mime_type,
          d.ruta_archivo,
          d.texto_extraido
        FROM trabajos_documentales t
        INNER JOIN documentos d ON d.id = t.documento_id
        WHERE t.estado = $1
          AND t.disponible_desde <= NOW()
        ORDER BY t.id
        FOR UPDATE OF t SKIP LOCKED
        LIMIT 1
      `,
      [DOCUMENT_JOB_STATES.PENDING]
    );

    if (!result.rowCount) {
      await client.query("COMMIT");
      return null;
    }

    const job = result.rows[0];

    await client.query(
      `
        UPDATE trabajos_documentales
        SET estado = $2,
            intentos = intentos + 1,
            progreso = 10,
            iniciado_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.id, DOCUMENT_JOB_STATES.PROCESSING]
    );

    await client.query(
      `
        UPDATE documentos
        SET estado_procesamiento = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.documento_id, DOCUMENT_PROCESSING_STATES.PROCESSING]
    );

    await client.query("COMMIT");
    return { ...job, intentos: job.intentos + 1 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeJob(job, text) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE documentos
        SET texto_extraido = $2,
            estado_procesamiento = $3,
            requiere_ocr = false,
            confianza_extraccion = 1,
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.documento_id, text, DOCUMENT_PROCESSING_STATES.TEXT_EXTRACTED]
    );

    await completeJobRow(client, job.id);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function failJob(job, error, { requiresOcr = false } = {}) {
  const final = requiresOcr || job.intentos >= job.max_intentos;
  const jobState = requiresOcr
    ? DOCUMENT_JOB_STATES.OCR_REQUIRED
    : final
      ? DOCUMENT_JOB_STATES.ERROR
      : DOCUMENT_JOB_STATES.PENDING;
  const documentState = requiresOcr
    ? DOCUMENT_PROCESSING_STATES.OCR_REQUIRED
    : final
      ? DOCUMENT_PROCESSING_STATES.ERROR
      : DOCUMENT_PROCESSING_STATES.PENDING;
  const delay = Math.min(300, 2 ** job.intentos * 5);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE trabajos_documentales
        SET estado = $2,
            progreso = $3,
            error_codigo = $4,
            error_detalle = $5,
            finalizado_at = CASE WHEN $6 THEN NOW() ELSE NULL END,
            disponible_desde = NOW() + ($7 || ' seconds')::interval,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        job.id,
        jobState,
        final ? 100 : 0,
        requiresOcr ? "OCR_REQUIRED" : "EXTRACTION_ERROR",
        String(error.message || error).slice(0, 1000),
        final || requiresOcr,
        delay,
      ]
    );

    await client.query(
      `
        UPDATE documentos
        SET estado_procesamiento = $2,
            requiere_ocr = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.documento_id, documentState, requiresOcr]
    );

    await client.query("COMMIT");
  } catch (rollbackError) {
    await client.query("ROLLBACK");
    throw rollbackError;
  } finally {
    client.release();
  }
}

async function updateJobProgress(id, progress) {
  await pool.query(
    `
      UPDATE trabajos_documentales
      SET progreso = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, Math.max(1, Math.min(99, Math.round(progress)))]
  );
}

async function completeOcrJob(job, result) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE documentos
        SET texto_extraido = $2,
            estado_procesamiento = $3,
            requiere_ocr = false,
            confianza_extraccion = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        job.documento_id,
        result.text,
        DOCUMENT_PROCESSING_STATES.TEXT_EXTRACTED,
        result.confidence,
      ]
    );

    for (const page of result.pages) {
      await client.query(
        `
          INSERT INTO paginas_documento (
            documento_id,
            numero,
            texto,
            confianza,
            metodo
          )
          VALUES ($1, $2, $3, $4, 'ocr')
          ON CONFLICT (documento_id, numero)
          DO UPDATE SET
            texto = EXCLUDED.texto,
            confianza = EXCLUDED.confianza,
            metodo = 'ocr',
            updated_at = NOW()
        `,
        [job.documento_id, page.number, page.text, page.confidence]
      );
    }

    await completeJobRow(client, job.id);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeJobRow(client, jobId) {
  await client.query(
    `
      UPDATE trabajos_documentales
      SET estado = $2,
          progreso = 100,
          finalizado_at = NOW(),
          error_codigo = NULL,
          error_detalle = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [jobId, DOCUMENT_JOB_STATES.COMPLETED]
  );
}

module.exports = {
  JOB_TYPES,
  claimNextJob,
  completeJob,
  completeOcrJob,
  enqueueDocumentJob,
  failJob,
  getDocumentJobs,
  updateJobProgress,
};
