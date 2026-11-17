const { pool } = require("../configuracion/baseDatos");
const { DOCUMENT_PROCESSING_STATES } = require("./estadosDocumentos");
const crypto = require("node:crypto");

const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

async function guardarAnalisisJuridico({
  analysis: analisis,
  causaId = null,
  documentoId = null,
  metadata: metadatos = {},
  sourceFile: archivoFuente,
  text: texto,
}) {
  verificarConfiguracionDeBase();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const idDocumento =
      documentoId ||
      (await crearDocumentoParaAnalisis(client, {
        causaId,
        sourceFile: archivoFuente,
        text: texto,
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
        idDocumento,
        metadatos.engine || "local",
        metadatos.model || null,
        false,
        analisis.nivel_confianza || null,
        JSON.stringify({ ...analisis, _metadata: metadatos }),
      ]
    );
    const idAnalisis = analysisResult.rows[0].id;

    await guardarFechas(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId: idDocumento });
    await guardarAccionesPendientes(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId: idDocumento });
    await guardarEntidades(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId: idDocumento });
    await guardarRelaciones(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId: idDocumento });
    await guardarFragmentosRag(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId: idDocumento });
    await guardarAlertas(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId: idDocumento });

    if (idDocumento) {
      await client.query(
        `
          UPDATE documentos
          SET estado_procesamiento = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [idDocumento, DOCUMENT_PROCESSING_STATES.ANALYZED]
      );
    }

    if (causaId) {
      await client.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [causaId]);
    }

    await client.query("COMMIT");

    return {
      analisis_ia_id: idAnalisis,
      analysis_id: idAnalisis,
      document_id: idDocumento,
      persisted: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listarDocumentosDelExpediente(causaId, { includeUnprocessed = false } = {}) {
  verificarConfiguracionDeBase();

  const resultado = await pool.query(
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
        AND ($2::boolean OR texto_extraido IS NOT NULL)
      ORDER BY created_at DESC, id DESC
    `,
    [causaId, includeUnprocessed]
  );

  return resultado.rows;
}

async function crearDocumentoParaAnalisis(client, { causaId, sourceFile: archivoFuente, text: texto }) {
  if (!causaId || !texto) {
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
      archivoFuente?.name || "texto-ingresado",
      archivoFuente ? "txt" : "texto",
      archivoFuente?.mime_type || "text/plain",
      archivoFuente?.size_bytes || Buffer.byteLength(texto, "utf8"),
      texto,
      DOCUMENT_PROCESSING_STATES.ANALYZED,
      crypto.createHash("sha256").update(texto, "utf8").digest("hex"),
    ]
  );

  return documentResult.rows[0].id;
}

async function guardarFechas(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId }) {
  for (const date of analisis.fechas_relevantes || []) {
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
        idAnalisis,
        dateText,
        date.fecha_normalizada || interpretarFechaJuridica(date.fecha || date.fecha_texto),
        date.evento || "",
        date.tipo || "fecha_mencionada",
        Boolean(date.requiere_alerta),
      ]
    );
  }
}

async function guardarAccionesPendientes(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId }) {
  if (!causaId) {
    return;
  }

  for (const description of analisis.actuaciones_pendientes || []) {
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
      [causaId, documentoId, idAnalisis, description]
    );
  }
}

async function guardarEntidades(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId }) {
  for (const entity of aplanarEntidadesJuridicas(analisis.entidades_juridicas)) {
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
        idAnalisis,
        entity.entidad_id,
        entity.tipo,
        entity.etiqueta,
        JSON.stringify(entity.datos_json),
      ]
    );
  }
}

async function guardarRelaciones(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId }) {
  for (const [indice, relation] of (analisis.grafo_conocimiento?.relaciones || []).entries()) {
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
        idAnalisis,
        relation.id || `relacion-${indice + 1}`,
        String(relation.origen || "origen-no-informado"),
        String(relation.destino || "destino-no-informado"),
        relation.tipo || "relacion_juridica",
        relation.evidencia || null,
      ]
    );
  }
}

async function guardarFragmentosRag(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId }) {
  for (const [indice, fragmento] of (analisis.rag_juridico?.fragmentos || []).entries()) {
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
        idAnalisis,
        fragmento.id || `fragmento-${indice + 1}`,
        Number.isInteger(fragmento.orden) ? fragmento.orden : indice + 1,
        String(fragmento.texto || ""),
        fragmento.embedding_id,
        null,
        JSON.stringify({
          categorias: fragmento.categorias || [],
          entidades: fragmento.entidades || [],
          caracteres_inicio: fragmento.caracteres_inicio,
          caracteres_fin: fragmento.caracteres_fin,
          tokens_estimados: fragmento.tokens_estimados,
          relevancia_base: fragmento.relevancia_base,
        }),
      ]
    );
  }
}

async function guardarAlertas(client, { analysis: analisis, analysisId: idAnalisis, causaId, documentoId }) {
  for (const [indice, alert] of (analisis.alertas || []).entries()) {
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
        idAnalisis,
        alert.id || `alerta-${indice + 1}`,
        alert.tipo || "revision",
        alert.titulo || `Alerta ${indice + 1}`,
        alert.descripcion || alert.detalle || "Revisar el hallazgo detectado por IA.",
        alert.fecha_normalizada || null,
        alert.prioridad,
        alert.estado || "pendiente",
        alert.fuente || "ia",
      ]
    );
  }
}

function aplanarEntidadesJuridicas(entities = {}) {
  return Object.entries(entities).flatMap(([type, valores]) => {
    if (!Array.isArray(valores)) {
      return [];
    }

    return valores.map((valor) => ({
      entidad_id: valor.id || `${type}:${obtenerEtiquetaDeEntidad(valor)}`,
      tipo: type,
      etiqueta: obtenerEtiquetaDeEntidad(valor),
      datos_json: valor,
    }));
  });
}

function obtenerEtiquetaDeEntidad(entity) {
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

function interpretarFechaJuridica(valor) {
  const texto = String(valor || "").trim().toLowerCase();
  const numeric = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

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
  const named = texto.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);

  if (!named || !monthNames[named[2]]) {
    return null;
  }

  return `${named[3]}-${monthNames[named[2]]}-${named[1].padStart(2, "0")}`;
}

function verificarConfiguracionDeBase() {
  if (!databaseConfigured()) {
    const error = new Error("DATABASE_URL no esta configurado.");
    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  listarDocumentosDelExpediente,
  guardarAnalisisJuridico,
};
