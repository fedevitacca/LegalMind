const { pool } = require("../configuracion/baseDatos");

const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function saveLegalAnalysis({
  analysis,
  causaId = null,
  documentoId = null,
  metadata = {},
}) {
  ensureDatabaseConfigured();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
        documentoId,
        metadata.engine || "openai",
        metadata.model || null,
        false,
        analysis.nivel_confianza || null,
        JSON.stringify(analysis),
      ]
    );
    const analysisId = analysisResult.rows[0].id;

    await saveDates(client, { analysis, analysisId, causaId, documentoId });
    await savePendingActions(client, { analysis, analysisId, causaId, documentoId });
    await saveEntities(client, { analysis, analysisId, causaId, documentoId });
    await saveRelations(client, { analysis, analysisId, causaId, documentoId });
    await saveRagFragments(client, { analysis, analysisId, causaId, documentoId });
    await saveAlerts(client, { analysis, analysisId, causaId, documentoId });

    await client.query("COMMIT");

    return {
      analisis_ia_id: analysisId,
      persisted: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function saveDates(client, { analysis, analysisId, causaId, documentoId }) {
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
        causaId,
        documentoId,
        analysisId,
        date.fecha,
        date.fecha_normalizada || null,
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
  for (const relation of analysis.grafo_conocimiento?.relaciones || []) {
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
        relation.id,
        relation.origen,
        relation.destino,
        relation.tipo,
        relation.evidencia || null,
      ]
    );
  }
}

async function saveRagFragments(client, { analysis, analysisId, causaId, documentoId }) {
  for (const fragment of analysis.rag_juridico?.fragmentos || []) {
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
        fragment.id,
        fragment.orden,
        fragment.texto,
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
  for (const alert of analysis.alertas || []) {
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
        alert.id,
        alert.tipo,
        alert.titulo,
        alert.descripcion,
        alert.fecha_normalizada || null,
        alert.prioridad,
        alert.estado || "pendiente",
        alert.fuente,
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

function ensureDatabaseConfigured() {
  if (!databaseConfigured()) {
    const error = new Error("DATABASE_URL no esta configurado.");
    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  saveLegalAnalysis,
};
