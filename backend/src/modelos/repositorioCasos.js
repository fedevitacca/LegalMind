const { pool } = require("../configuracion/baseDatos");
const fs = require("node:fs/promises");
const path = require("node:path");

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
        causa_id,
        nombre_archivo,
        tipo_archivo,
        texto_extraido,
        ruta_archivo,
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

async function updateCase(id, payload) {
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
    return getCaseById(id);
  }

  values.push(id);

  const result = await pool.query(
    `
      UPDATE causas
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id
    `,
    values
  );

  if (!result.rowCount) {
    return null;
  }

  return getCaseById(id);
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

async function listDocumentsByCase(caseId) {
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
        created_at,
        updated_at
      FROM documentos
      WHERE causa_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [caseId]
  );

  return result.rows.map(mapDocumentRow);
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
        estado_procesamiento
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'cargado')
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
        updated_at
    `,
    [
      caseId,
      documentName.trim(),
      documentType,
      file?.mimetype || payload.mime_type || "text/plain",
      file?.size || Buffer.byteLength(text || "", "utf8"),
      file?.path || null,
      text || null,
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
        updated_at
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
  createDocument,
  createCase,
  deleteCase,
  deleteDocument,
  deleteDefendantFromCase,
  getDocumentById,
  getCaseById,
  listCases,
  listDocumentsByCase,
  listDefendantsByCase,
  updateCase,
  updateDocument,
  updateDefendantInCase,
};
