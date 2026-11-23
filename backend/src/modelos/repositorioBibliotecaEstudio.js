const { pool } = require("../configuracion/baseDatos");
const { ampliarConsultaJuridica } = require("../../IA/terminologiaRag");
const {
  convertirVectorAFormatoSql,
  fusionarResultados,
} = require("./repositorioBibliotecaJuridica");

const columnasDocumento = "id, nombre_archivo, tamano_bytes, modelo_embedding, created_at";

async function listarArchivos(organizacionId) {
  const resultado = await pool.query(`SELECT ${columnasDocumento}
    FROM documentos_biblioteca_juridica WHERE organizacion_id=$1 ORDER BY id DESC`, [organizacionId]);
  return resultado.rows;
}

async function guardarArchivo(organizacionId, archivo, fragmentos, embeddings, modelo) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await client.query(`INSERT INTO documentos_biblioteca_juridica
      (organizacion_id, nombre_archivo, archivo, tamano_bytes, modelo_embedding)
      VALUES ($1,$2,$3,$4,$5) RETURNING ${columnasDocumento}`,
    [organizacionId, archivo.originalname, archivo.buffer, archivo.size, modelo]);
    const documento = resultado.rows[0];
    const filas = fragmentos.map((fragmento, indice) => ({
      orden: fragmento.order,
      texto: fragmento.text,
      metadata_json: fragmento.metadata,
      embedding: embeddings ? convertirVectorAFormatoSql(embeddings[indice]) : null,
    }));
    await client.query(`INSERT INTO fragmentos_biblioteca_juridica (documento_id, orden, texto, metadata_json, embedding)
      SELECT $1, orden, texto, metadata_json, embedding::vector
      FROM jsonb_to_recordset($2::jsonb) AS f(orden integer, texto text, metadata_json jsonb, embedding text)`,
    [documento.id, JSON.stringify(filas)]);
    await client.query("COMMIT");
    return documento;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerArchivo(organizacionId, id) {
  const resultado = await pool.query(`SELECT nombre_archivo, archivo FROM documentos_biblioteca_juridica
    WHERE organizacion_id=$1 AND id=$2`, [organizacionId, id]);
  return resultado.rows[0];
}

async function eliminarArchivo(organizacionId, id) {
  const resultado = await pool.query(`DELETE FROM documentos_biblioteca_juridica
    WHERE organizacion_id=$1 AND id=$2`, [organizacionId, id]);
  return resultado.rowCount > 0;
}

async function buscarFragmentosBiblioteca({ organizationId, query, queryEmbedding, embeddingModel, limit = 5 }, deps = {}) {
  const database = deps.pool || pool;
  const terminos = ampliarConsultaJuridica(query).normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  const consulta = [...new Set(terminos)].join(" OR ");
  const limiteCandidatos = limit * 4;
  const columnas = `'biblioteca-' || d.id || '-' || f.orden AS id,
    d.id AS documento_id, d.nombre_archivo, f.orden, f.texto, f.metadata_json`;
  const lexico = consulta ? database.query(`SELECT ${columnas},
      ts_rank_cd(f.texto_busqueda, q.valor, 32) AS lexical_score
    FROM fragmentos_biblioteca_juridica f JOIN documentos_biblioteca_juridica d ON d.id=f.documento_id
    CROSS JOIN websearch_to_tsquery('spanish', $2) AS q(valor)
    WHERE d.organizacion_id=$1 AND f.texto_busqueda @@ q.valor
    ORDER BY lexical_score DESC, d.id, f.orden LIMIT $3`, [organizationId, consulta, limiteCandidatos]) : { rows: [] };
  const semantico = embeddingModel && esVectorValido(queryEmbedding) ? database.query(`SELECT ${columnas},
      1-(f.embedding <=> $2::vector) AS semantic_score
    FROM fragmentos_biblioteca_juridica f JOIN documentos_biblioteca_juridica d ON d.id=f.documento_id
    WHERE d.organizacion_id=$1 AND d.modelo_embedding=$3 AND f.embedding IS NOT NULL
      AND f.embedding <=> $2::vector <= 0.5
    ORDER BY f.embedding <=> $2::vector, d.id, f.orden LIMIT $4`,
  [organizationId, convertirVectorAFormatoSql(queryEmbedding), embeddingModel, limiteCandidatos]) : { rows: [] };
  const [filasLexicas, filasSemanticas] = await Promise.all([lexico, semantico]);
  return fusionarResultados(filasLexicas.rows, filasSemanticas.rows, limit).map((fila) => ({
    id: fila.id,
    document_id: `biblioteca-${fila.documento_id}`,
    document_name: fila.nombre_archivo,
    chunk_index: fila.orden,
    text: fila.texto,
    metadata: fila.metadata_json,
    score: fila.score,
    lexical_score: fila.lexical_score,
    semantic_score: fila.semantic_score,
    source_type: "biblioteca_juridica",
    source_url: `/biblioteca#documento-${fila.documento_id}`,
  }));
}

function esVectorValido(vector) {
  return Array.isArray(vector) && vector.length === 768 && vector.every(Number.isFinite)
    && vector.some((valor) => valor !== 0);
}

module.exports = { listarArchivos, guardarArchivo, obtenerArchivo, eliminarArchivo, buscarFragmentosBiblioteca, esVectorValido };
