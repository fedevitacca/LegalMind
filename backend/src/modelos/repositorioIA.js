const { pool } = require("../configuracion/baseDatos");

const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function saveAnalysisResult({ analysis, metadata, sourceFile, text, causaId }) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const documentResult = await client.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, 'analizado')
        RETURNING id
      `,
      [
        causaId || null,
        sourceFile?.name || "texto-ingresado",
        sourceFile ? "txt" : "texto",
        sourceFile?.mime_type || "text/plain",
        sourceFile?.size_bytes || Buffer.byteLength(text, "utf8"),
        text,
      ]
    );

    const documentId = documentResult.rows[0].id;
    const analysisResult = await client.query(
      `
        INSERT INTO analisis_ia (
          causa_id,
          documento_id,
          motor,
          modelo,
          fallback_usado,
          nivel_confianza,
          resultado_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        RETURNING id
      `,
      [
        causaId || null,
        documentId,
        metadata.engine,
        metadata.model || null,
        Boolean(metadata.fallback_used),
        analysis.nivel_confianza || null,
        JSON.stringify({ ...analysis, _metadata: metadata }),
      ]
    );

    const analysisId = analysisResult.rows[0].id;

    for (const date of analysis.fechas_relevantes || []) {
      await client.query(
        `
          INSERT INTO fechas_relevantes (
            causa_id,
            documento_id,
            analisis_ia_id,
            fecha_texto,
            fecha,
            evento,
            tipo,
            requiere_alerta
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          causaId || null,
          documentId,
          analysisId,
          date.fecha,
          parseLegalDate(date.fecha),
          date.evento || "",
          date.tipo || "fecha_mencionada",
          Boolean(date.requiere_alerta),
        ]
      );
    }

    for (const action of analysis.actuaciones_pendientes || []) {
      await client.query(
        `
          INSERT INTO actuaciones (
            causa_id,
            documento_id,
            analisis_ia_id,
            descripcion,
            fuente
          )
          VALUES ($1, $2, $3, $4, 'ia')
        `,
        [causaId || null, documentId, analysisId, action]
      );
    }

    await client.query("COMMIT");

    return {
      analysis_id: analysisId,
      document_id: documentId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listDocumentsForCase(causaId) {
  ensureDatabaseConfigured();

  const result = await pool.query(
    `
      SELECT
        id,
        nombre_archivo,
        tipo_archivo,
        mime_type,
        tamano_bytes,
        texto_extraido,
        estado_procesamiento,
        created_at
      FROM documentos
      WHERE causa_id = $1
        AND texto_extraido IS NOT NULL
      ORDER BY created_at DESC, id DESC
    `,
    [causaId]
  );

  return result.rows;
}

function parseLegalDate(value) {
  const text = String(value || "").trim().toLowerCase();
  const numeric = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (numeric) {
    const [, day, month, rawYear] = numeric;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthNames = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12",
  };
  const named = text.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);

  if (!named || !monthNames[named[2]]) {
    return null;
  }

  return `${named[3]}-${monthNames[named[2]]}-${named[1].padStart(2, "0")}`;
}

function ensureDatabaseConfigured() {
  if (!databaseConfigured()) {
    const error = new Error("DATABASE_URL no esta configurado.");
    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  listDocumentsForCase,
  saveAnalysisResult,
};
