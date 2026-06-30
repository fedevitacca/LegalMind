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

  const documentsResult = await pool.query(
    `
      SELECT
        id,
        nombre_archivo,
        tipo_archivo,
        texto_extraido,
        estado_procesamiento,
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
          VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
        `,
        [
          caseId,
          document,
          "nota_inicial",
          "text/plain",
          Buffer.byteLength(document, "utf8"),
          document,
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
    return getCaseById(caseId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
    estado: row.estado_procesamiento,
    fecha: `Cargado el ${new Date(row.created_at).toLocaleDateString("es-AR")}`,
    id: row.id,
    nombre: row.nombre_archivo,
    resumen:
      row.texto_extraido?.slice(0, 180) ||
      "Documento asociado al expediente.",
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
  createCase,
  getCaseById,
  listCases,
};
