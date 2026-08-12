const { pool } = require("../configuracion/baseDatos");

async function loadDocumentForIndex(documentId, caseId) {
  const result = await pool.query(`SELECT d.id,d.causa_id,d.version,d.texto_extraido,c.organizacion_id,
    COALESCE(json_agg(json_build_object('numero',p.numero,'texto',p.texto) ORDER BY p.numero)
      FILTER (WHERE p.id IS NOT NULL),'[]') AS paginas
    FROM documentos d JOIN causas c ON c.id=d.causa_id LEFT JOIN paginas_documento p ON p.documento_id=d.id
    WHERE d.id=$1 AND d.causa_id=$2 GROUP BY d.id,c.organizacion_id`, [documentId, caseId]);
  return result.rows[0] || null;
}

async function replaceVectorIndex(document, chunks, embeddings, model) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dimensions = embeddings[0]?.length || 0;
    if (dimensions !== 768) throw new Error(`EMBEDDING_DIMENSION: se esperaban 768 dimensiones y se recibieron ${dimensions}.`);
    const indexResult = await client.query(`INSERT INTO indices_rag
      (organizacion_id,causa_id,documento_id,documento_version,modelo_embedding,dimensiones,estado,fragmentos)
      VALUES($1,$2,$3,$4,$5,$6,'indexando',0)
      ON CONFLICT(documento_id,documento_version,modelo_embedding) DO UPDATE SET estado='indexando',updated_at=NOW() RETURNING id`,
    [document.organizacion_id, document.causa_id, document.id, document.version, model, dimensions]);
    const indexId = indexResult.rows[0].id;
    await client.query("DELETE FROM fragmentos_rag_v2 WHERE indice_id=$1", [indexId]);
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      await client.query(`INSERT INTO fragmentos_rag_v2
        (indice_id,organizacion_id,causa_id,documento_id,pagina,orden,texto,caracteres_inicio,caracteres_fin,metadata_json,embedding)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::vector)`, [indexId, document.organizacion_id,
        document.causa_id, document.id, chunk.page, chunk.order, chunk.text, chunk.start, chunk.end,
        JSON.stringify(chunk.metadata), vectorLiteral(embeddings[index])]);
    }
    await client.query("UPDATE indices_rag SET estado='listo',fragmentos=$2,updated_at=NOW() WHERE id=$1", [indexId, chunks.length]);
    await client.query("COMMIT");
    return { indexId, fragments: chunks.length, dimensions };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function hybridSearch({ organizationId, caseId, query, queryEmbedding, limit = 5 }) {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 5));
  const result = await pool.query(`WITH ranked AS (
    SELECT f.id,f.documento_id,f.pagina,f.orden,f.texto,f.metadata_json,d.nombre_archivo,
      ts_rank_cd(f.texto_busqueda,websearch_to_tsquery('spanish',$3)) AS lexical_score,
      1-(f.embedding <=> $4::vector) AS semantic_score
    FROM fragmentos_rag_v2 f JOIN indices_rag i ON i.id=f.indice_id JOIN documentos d ON d.id=f.documento_id
    WHERE f.organizacion_id=$1 AND f.causa_id=$2 AND i.estado='listo'
  ) SELECT *, (0.40*lexical_score+0.60*GREATEST(semantic_score,0)) AS score FROM ranked
    WHERE lexical_score>0 OR semantic_score>0 ORDER BY score DESC LIMIT $5`,
  [organizationId, caseId, query, vectorLiteral(queryEmbedding), safeLimit]);
  return result.rows;
}
function vectorLiteral(vector) { return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`; }
module.exports = { hybridSearch, loadDocumentForIndex, replaceVectorIndex, vectorLiteral };
