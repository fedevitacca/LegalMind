const { pool } = require("../configuracion/baseDatos");

const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function listCases() {
  ensureDatabaseConfigured();

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
    GROUP BY c.id
    ORDER BY c.updated_at DESC, c.id DESC
  `);

  return result.rows.map(mapCaseListRow);
}

async function getCaseById(id) {
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
      WHERE id = $1
    `,
    [id]
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

  return mapCaseDetailRow(
    caseResult.rows[0],
    defendantsResult.rows,
    analysisResult.rows[0]
  );
}

async function createCase(payload) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const caseResult = await client.query(
      `
        INSERT INTO causas (identificador, caratula, descripcion, estado)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        emptyToNull(payload.identificador),
        payload.caratula.trim(),
        emptyToNull(payload.descripcion),
        payload.estado || "activa",
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

    await client.query("COMMIT");
    return getCaseById(caseId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function mapCaseListRow(row) {
  return {
    caption: buildCaption(row),
    created_at: row.created_at,
    descripcion: row.descripcion,
    estado: row.estado,
    id: row.id,
    identificador: row.identificador,
    imputados_count: row.imputados_count,
    name: row.caratula,
    slug: String(row.id),
    updated_at: row.updated_at,
  };
}

function mapCaseDetailRow(caseRow, defendantRows, analysisRow) {
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
    deadline: "Sin vencimiento cargado",
    descripcion: caseRow.descripcion,
    estado: caseRow.estado,
    id: caseRow.id,
    identificador: caseRow.identificador,
    name: caseRow.caratula,
    slug: String(caseRow.id),
    status: translateStatus(caseRow.estado),
    updated_at: caseRow.updated_at,
    defendants,
  };
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

function ensureDatabaseConfigured() {
  if (!databaseConfigured()) {
    const error = new Error("DATABASE_URL no esta configurado.");
    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  createCase,
  getCaseById,
  listCases,
};
