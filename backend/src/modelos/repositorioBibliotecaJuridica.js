const { pool } = require("../configuracion/baseDatos");
const { ampliarConsultaJuridica } = require("../../IA/terminologiaRag");

async function buscarNormativaOficial({ query: consulta, queryEmbedding: embeddingConsulta, limit: limite = 8 }, deps = {}) {
  const database = deps.pool || pool;
  const safeLimit = Math.min(20, Math.max(1, Number(limite) || 8));
  const candidateLimit = Math.min(80, safeLimit * 4);
  const expandedQuery = construirConsultaDeTextoCompleto(consulta);
  const lexico = await database.query(`WITH consulta AS (
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

  let filasSemanticas = [];
  if (Array.isArray(embeddingConsulta) && embeddingConsulta.length === 768) {
    const semantico = await database.query(`SELECT fj.id, fj.orden, fj.identificador, fj.encabezado, fj.texto,
      fj.metadata_json, f.id AS fuente_id, f.clave, f.tipo, f.titulo, f.numero_norma, f.organismo, f.url_oficial,
      NULL::double precision AS lexical_score, 1-(fj.embedding <=> $1::vector) AS semantic_score
      FROM fragmentos_juridicos fj JOIN fuentes_juridicas f ON f.id=fj.fuente_id
      WHERE f.vigente=TRUE AND f.jurisdiccion='nacional_federal' AND fj.embedding IS NOT NULL
      ORDER BY fj.embedding <=> $1::vector LIMIT $2`, [convertirVectorAFormatoSql(embeddingConsulta), candidateLimit]);
    filasSemanticas = semantico.rows;
  }
  return fusionarResultados(lexico.rows, filasSemanticas, safeLimit).map(convertirArticuloEnFragmento);
}

function construirConsultaDeTextoCompleto(consulta) {
  return [...new Set(ampliarConsultaJuridica(consulta).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) || [])].join(" OR ");
}

function convertirArticuloEnFragmento(fila) {
  return {
    id: `norma-${fila.id}`,
    document_id: `norma-${fila.fuente_id}`,
    document_name: fila.titulo,
    chunk_index: Number(fila.orden),
    text: fila.texto,
    score: Math.min(1, Math.max(0, Number(fila.score) || 0)),
    lexical_score: fila.lexical_score == null ? null : Number(fila.lexical_score),
    semantic_score: fila.semantic_score == null ? null : Number(fila.semantic_score),
    source_type: fila.tipo,
    source_url: fila.url_oficial,
    metadata: {
      ...(fila.metadata_json || {}),
      article: fila.identificador || null,
      heading: fila.encabezado || null,
      law_number: fila.numero_norma || null,
      official_body: fila.organismo || null,
      source_key: fila.clave,
    },
  };
}

function fusionarResultados(filasLexicas, filasSemanticas, limite) {
  const resultadosFusionados = new Map();
  const agregarResultado = (fila, posicion, peso, scoreField) => {
    const actual = resultadosFusionados.get(fila.id) || { ...fila, score: 0, lexical_score: null, semantic_score: null };
    actual.score += peso / (60 + posicion + 1);
    if (fila[scoreField] != null) actual[scoreField] = Number(fila[scoreField]);
    resultadosFusionados.set(fila.id, actual);
  };
  filasLexicas.forEach((fila, posicion) => agregarResultado(fila, posicion, 0.45, "lexical_score"));
  filasSemanticas.forEach((fila, posicion) => agregarResultado(fila, posicion, 0.55, "semantic_score"));
  const maximo = 1 / 61;
  return [...resultadosFusionados.values()].map((fila) => ({ ...fila, score: fila.score / maximo }))
    .sort((izquierda, derecha) => derecha.score - izquierda.score).slice(0, limite);
}

function convertirVectorAFormatoSql(vector) {
  return `[${vector.map((valor) => Number(valor).toFixed(8)).join(",")}]`;
}

module.exports = { construirConsultaDeTextoCompleto, fusionarResultados, convertirArticuloEnFragmento, buscarNormativaOficial, convertirVectorAFormatoSql };
