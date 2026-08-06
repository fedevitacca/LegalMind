const { pool } = require("../configuracion/baseDatos");

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultas_ia (
      id BIGSERIAL PRIMARY KEY,
      causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
      herramienta VARCHAR(80) NOT NULL,
      titulo VARCHAR(240) NOT NULL,
      consulta TEXT,
      entrada_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      citas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS consultas_ia_causa_fecha_idx
      ON consultas_ia (causa_id, created_at DESC);
  `);
  initialized = true;
}

async function createAIQuery(payload) {
  await ensureTable();
  const result = await pool.query(`
    INSERT INTO consultas_ia (causa_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb)
    RETURNING *
  `, [payload.caseId, payload.toolId, payload.title, payload.query || null,
    JSON.stringify(payload.input), JSON.stringify(payload.result), JSON.stringify(payload.citations), JSON.stringify(payload.metadata)]);
  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [payload.caseId]);
  return mapRow(result.rows[0]);
}

async function listAIQueries(caseId) {
  await ensureTable();
  const result = await pool.query(`SELECT * FROM consultas_ia WHERE causa_id = $1 ORDER BY created_at DESC, id DESC`, [caseId]);
  return result.rows.map(mapRow);
}

async function getAIQuery(caseId, id) {
  await ensureTable();
  const result = await pool.query(`SELECT * FROM consultas_ia WHERE causa_id = $1 AND id = $2`, [caseId, id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function deleteAIQuery(caseId, id) {
  await ensureTable();
  const result = await pool.query("DELETE FROM consultas_ia WHERE causa_id = $1 AND id = $2 RETURNING id", [caseId, id]);
  return result.rowCount > 0;
}

function mapRow(row) { return { id: Number(row.id), case_id: Number(row.causa_id), tool_id: row.herramienta, title: row.titulo,
  query: row.consulta, input: row.entrada_json, result: row.resultado_json, citations: row.citas_json,
  metadata: row.metadata_json, created_at: row.created_at }; }

function resetQueriesTableForTests() { initialized = false; }
module.exports = { createAIQuery, deleteAIQuery, getAIQuery, listAIQueries, resetQueriesTableForTests };
