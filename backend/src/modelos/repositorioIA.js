const { pool } = require("../configuracion/baseDatos");
const { DOCUMENT_PROCESSING_STATES } = require("./estadosDocumentos");
const crypto = require("node:crypto");

const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function saveLegalAnalysis({
  analysis,
  causaId = null,
  documentoId = null,
  metadata = {},
  sourceFile,
  text,
}) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const documentId =
      documentoId ||
      (await createDocumentForAnalysis(client, {
        causaId,
        sourceFile,
        text,
      }));

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
        causaId,
        documentId,
        metadata.engine || "local",
        metadata.model || null,
        false,
        analysis.nivel_confianza || null,
        JSON.stringify({ ...analysis, _metadata: metadata }),
      ]
    );
    const analysisId = analysisResult.rows[0].id;

    await saveDates(client, { analysis, analysisId, causaId, documentoId: documentId });
    await savePendingActions(client, { analysis, analysisId, causaId, documentoId: documentId });
    await saveEntities(client, { analysis, analysisId, causaId, documentoId: documentId });
    await saveRelations(client, { analysis, analysisId, causaId, documentoId: documentId });
    await saveRagFragments(client, { analysis, analysisId, causaId, documentoId: documentId });
    await saveAlerts(client, { analysis, analysisId, causaId, documentoId: documentId });

    if (documentId) {
      await client.query(
        `
          UPDATE documentos
          SET estado_procesamiento = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [documentId, DOCUMENT_PROCESSING_STATES.ANALYZED]
      );
    }

    if (causaId) {
      await client.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [causaId]);
    }

    await client.query("COMMIT");

    return {
      analisis_ia_id: analysisId,
      analysis_id: analysisId,
      document_id: documentId,
      persisted: true,
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

async function createDocumentForAnalysis(client, { causaId, sourceFile, text }) {
  if (!causaId || !text) {
    return null;
  }

  const documentResult = await client.query(
    `
      INSERT INTO documentos (
        causa_id,
        nombre_archivo,
        tipo_archivo,
        mime_type,
        tamano_bytes,
        texto_extraido,
        estado_procesamiento,
        sha256
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [
      causaId,
      sourceFile?.name || "texto-ingresado",
      sourceFile ? "txt" : "texto",
      sourceFile?.mime_type || "text/plain",
      sourceFile?.size_bytes || Buffer.byteLength(text, "utf8"),
      text,
      DOCUMENT_PROCESSING_STATES.ANALYZED,
      crypto.createHash("sha256").update(text, "utf8").digest("hex"),
    ]
  );

  return documentResult.rows[0].id;
}

async function saveDates(client, { analysis, analysisId, causaId, documentoId }) {
  for (const date of analysis.fechas_relevantes || []) {
    const dateText = date.fecha || date.fecha_texto || date.evento || "Fecha detectada";

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
        causaId,
        documentoId,
        analysisId,
        dateText,
        date.fecha_normalizada || parseLegalDate(date.fecha || date.fecha_texto),
        date.evento || "",
        date.tipo || "fecha_mencionada",
        Boolean(date.requiere_alerta),
      ]
    );
  }
}

async function savePendingActions(client, { analysis, analysisId, causaId, documentoId }) {
  if (!causaId) {
    return;
  }

  for (const description of analysis.actuaciones_pendientes || []) {
    await client.query(
      `
        INSERT INTO actuaciones (
          causa_id,
          documento_id,
          analisis_ia_id,
          descripcion,
          estado,
          fuente
        )
        VALUES ($1, $2, $3, $4, 'pendiente', 'ia')
      `,
      [causaId, documentoId, analysisId, description]
    );
  }
}

async function saveEntities(client, { analysis, analysisId, causaId, documentoId }) {
  for (const entity of flattenLegalEntities(analysis.entidades_juridicas)) {
    await client.query(
      `
        INSERT INTO entidades_juridicas (
          causa_id,
          documento_id,
          analisis_ia_id,
          entidad_id,
          tipo,
          etiqueta,
          datos_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        causaId,
        documentoId,
        analysisId,
        entity.entidad_id,
        entity.tipo,
        entity.etiqueta,
        JSON.stringify(entity.datos_json),
      ]
    );
  }
}

async function saveRelations(client, { analysis, analysisId, causaId, documentoId }) {
  for (const [index, relation] of (analysis.grafo_conocimiento?.relaciones || []).entries()) {
    await client.query(
      `
        INSERT INTO relaciones_juridicas (
          causa_id,
          documento_id,
          analisis_ia_id,
          relacion_id,
          origen,
          destino,
          tipo,
          evidencia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        causaId,
        documentoId,
        analysisId,
        relation.id || `relacion-${index + 1}`,
        String(relation.origen || "origen-no-informado"),
        String(relation.destino || "destino-no-informado"),
        relation.tipo || "relacion_juridica",
        relation.evidencia || null,
      ]
    );
  }
}

async function saveRagFragments(client, { analysis, analysisId, causaId, documentoId }) {
  for (const [index, fragment] of (analysis.rag_juridico?.fragmentos || []).entries()) {
    await client.query(
      `
        INSERT INTO fragmentos_rag (
          causa_id,
          documento_id,
          analisis_ia_id,
          fragmento_id,
          orden,
          texto,
          embedding_id,
          embedding,
          metadata_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
      `,
      [
        causaId,
        documentoId,
        analysisId,
        fragment.id || `fragmento-${index + 1}`,
        Number.isInteger(fragment.orden) ? fragment.orden : index + 1,
        String(fragment.texto || ""),
        fragment.embedding_id,
        null,
        JSON.stringify({
          categorias: fragment.categorias || [],
          entidades: fragment.entidades || [],
          caracteres_inicio: fragment.caracteres_inicio,
          caracteres_fin: fragment.caracteres_fin,
          tokens_estimados: fragment.tokens_estimados,
          relevancia_base: fragment.relevancia_base,
        }),
      ]
    );
  }
}

async function saveAlerts(client, { analysis, analysisId, causaId, documentoId }) {
  for (const [index, alert] of (analysis.alertas || []).entries()) {
    await client.query(
      `
        INSERT INTO alertas_ia (
          causa_id,
          documento_id,
          analisis_ia_id,
          alerta_id,
          tipo,
          titulo,
          descripcion,
          fecha,
          prioridad,
          estado,
          fuente
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        causaId,
        documentoId,
        analysisId,
        alert.id || `alerta-${index + 1}`,
        alert.tipo || "revision",
        alert.titulo || `Alerta ${index + 1}`,
        alert.descripcion || alert.detalle || "Revisar el hallazgo detectado por IA.",
        alert.fecha_normalizada || null,
        alert.prioridad,
        alert.estado || "pendiente",
        alert.fuente || "ia",
      ]
    );
  }
}

function flattenLegalEntities(entities = {}) {
  return Object.entries(entities).flatMap(([type, values]) => {
    if (!Array.isArray(values)) {
      return [];
    }

    return values.map((value) => ({
      entidad_id: value.id || `${type}:${getEntityLabel(value)}`,
      tipo: type,
      etiqueta: getEntityLabel(value),
      datos_json: value,
    }));
  });
}

function getEntityLabel(entity) {
  return (
    entity.nombre ||
    entity.identificador ||
    entity.fecha ||
    entity.descripcion ||
    entity.etiqueta ||
    entity.id ||
    "Entidad sin etiqueta"
  );
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
  saveLegalAnalysis,
};
