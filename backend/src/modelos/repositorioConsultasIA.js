const { pool } = require("../configuracion/baseDatos");

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultas_ia (
      id BIGSERIAL PRIMARY KEY,
      causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
      herramienta VARCHAR(80) NOT NULL,
      titulo VARCHAR(240) NOT NULL,
      consulta TEXT,
      entrada_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      citas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE consultas_ia
      ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS consultas_ia_usuario_causa_fecha_idx
      ON consultas_ia (user_id, causa_id, created_at DESC);
  `);
  initialized = true;
}

async function createAIQuery(payload) {
  if (!payload.userId) throw new Error("No se puede guardar un análisis sin usuario propietario.");
  await ensureTable();
  const result = await pool.query(`
    INSERT INTO consultas_ia (causa_id, user_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
    RETURNING *
  `, [payload.caseId, payload.userId, payload.toolId, payload.title, payload.query || null,
    JSON.stringify(payload.input), JSON.stringify(payload.result), JSON.stringify(payload.citations), JSON.stringify(payload.metadata)]);
  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [payload.caseId]);
  return mapRow(result.rows[0]);
}

async function listAIQueries(caseId, userId) {
  if (!userId) throw new Error("El usuario es obligatorio para consultar el historial.");
  await ensureTable();
  const result = await pool.query(`
    SELECT id, causa_id, user_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json, created_at
    FROM consultas_ia
    WHERE causa_id = $1 AND user_id = $2
    ORDER BY created_at DESC, id DESC
  `, [caseId, userId]);
  return result.rows.map(mapRow);
}

async function getAIQuery(caseId, id, userId) {
  if (!userId) throw new Error("El usuario es obligatorio para consultar el análisis.");
  await ensureTable();
  const result = await pool.query(`
    SELECT id, causa_id, user_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json, created_at
    FROM consultas_ia
    WHERE causa_id = $1 AND id = $2 AND user_id = $3
  `, [caseId, id, userId]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function deleteAIQuery(caseId, id, userId) {
  if (!userId) throw new Error("El usuario es obligatorio para eliminar el análisis.");
  await ensureTable();
  const result = await pool.query("DELETE FROM consultas_ia WHERE causa_id = $1 AND id = $2 AND user_id = $3 RETURNING id", [caseId, id, userId]);
  return result.rowCount > 0;
}

function mapRow(row) { return { id: Number(row.id), case_id: Number(row.causa_id), user_id: row.user_id, tool_id: row.herramienta, title: row.titulo,
  query: row.consulta, input: row.entrada_json, result: row.resultado_json, citations: row.citas_json,
  metadata: row.metadata_json, created_at: row.created_at }; }

function resetQueriesTableForTests() { initialized = false; }
module.exports = { createAIQuery, deleteAIQuery, getAIQuery, listAIQueries, resetQueriesTableForTests };
