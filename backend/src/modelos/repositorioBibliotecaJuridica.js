const { pool } = require("../configuracion/baseDatos");
const { expandLegalQuery } = require("../../IA/terminologiaRag");

async function searchLegalLibrary({ query, queryEmbedding, limit = 8 }, deps = {}) {
  const database = deps.pool || pool;
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8));
  const candidateLimit = Math.min(80, safeLimit * 4);
  const expandedQuery = buildFtsWebQuery(query);
  const lexical = await database.query(`WITH consulta AS (
    SELECT websearch_to_tsquery('spanish', $1) AS valor
  ) SELECT fj.id, fj.orden, fj.identificador, fj.encabezado, fj.texto, fj.metadata_json,
      f.id AS fuente_id, f.clave, f.tipo, f.titulo, f.numero_norma, f.organismo, f.url_oficial,
      ts_rank_cd(fj.texto_busqueda, consulta.valor, 32) AS lexical_score,
      NULL::double precision AS semantic_score
    FROM fragmentos_juridicos fj
    JOIN fuentes_juridicas f ON f.id=fj.fuente_id
    CROSS JOIN consulta
    WHERE f.vigente=TRUE AND f.jurisdiccion='nacional_federal'
      AND fj.texto_busqueda @@ consulta.valor
    ORDER BY lexical_score DESC, fuente_id, orden LIMIT $2`, [expandedQuery, candidateLimit]);

  let semanticRows = [];
  if (Array.isArray(queryEmbedding) && queryEmbedding.length === 768) {
    const semantic = await database.query(`SELECT fj.id, fj.orden, fj.identificador, fj.encabezado, fj.texto,
      fj.metadata_json, f.id AS fuente_id, f.clave, f.tipo, f.titulo, f.numero_norma, f.organismo, f.url_oficial,
      NULL::double precision AS lexical_score, 1-(fj.embedding <=> $1::vector) AS semantic_score
      FROM fragmentos_juridicos fj JOIN fuentes_juridicas f ON f.id=fj.fuente_id
      WHERE f.vigente=TRUE AND f.jurisdiccion='nacional_federal' AND fj.embedding IS NOT NULL
      ORDER BY fj.embedding <=> $1::vector LIMIT $2`, [vectorLiteral(queryEmbedding), candidateLimit]);
    semanticRows = semantic.rows;
  }
  return fuseRankings(lexical.rows, semanticRows, safeLimit).map(mapLibraryChunk);
}

function buildFtsWebQuery(query) {
  return [...new Set(expandLegalQuery(query).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) || [])].join(" OR ");
}

function mapLibraryChunk(row) {
  return {
    id: `norma-${row.id}`,
    document_id: `norma-${row.fuente_id}`,
    document_name: row.titulo,
    chunk_index: Number(row.orden),
    text: row.texto,
    score: Math.min(1, Math.max(0, Number(row.score) || 0)),
    lexical_score: row.lexical_score == null ? null : Number(row.lexical_score),
    semantic_score: row.semantic_score == null ? null : Number(row.semantic_score),
    source_type: row.tipo,
    source_url: row.url_oficial,
    metadata: {
      ...(row.metadata_json || {}),
      article: row.identificador || null,
      heading: row.encabezado || null,
      law_number: row.numero_norma || null,
      official_body: row.organismo || null,
      source_key: row.clave,
    },
  };
}

function fuseRankings(lexicalRows, semanticRows, limit) {
  const fused = new Map();
  const add = (row, rank, weight, scoreField) => {
    const current = fused.get(row.id) || { ...row, score: 0, lexical_score: null, semantic_score: null };
    current.score += weight / (60 + rank + 1);
    if (row[scoreField] != null) current[scoreField] = Number(row[scoreField]);
    fused.set(row.id, current);
  };
  lexicalRows.forEach((row, rank) => add(row, rank, 0.45, "lexical_score"));
  semanticRows.forEach((row, rank) => add(row, rank, 0.55, "semantic_score"));
  const maximum = 1 / 61;
  return [...fused.values()].map((row) => ({ ...row, score: row.score / maximum }))
    .sort((left, right) => right.score - left.score).slice(0, limit);
}

function vectorLiteral(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

module.exports = { buildFtsWebQuery, fuseRankings, mapLibraryChunk, searchLegalLibrary, vectorLiteral };
