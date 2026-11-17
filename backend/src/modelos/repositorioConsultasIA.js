const { pool } = require("../configuracion/baseDatos");

let initialized = false;
async function asegurarTabla() {
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

async function guardarConsultaDeIA(datosDeEnvio) {
  if (!datosDeEnvio.userId) throw new Error("No se puede guardar un análisis sin usuario propietario.");
  await asegurarTabla();
  const resultado = await pool.query(`
    INSERT INTO consultas_ia (causa_id, user_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
    RETURNING *
  `, [datosDeEnvio.caseId, datosDeEnvio.userId, datosDeEnvio.toolId, datosDeEnvio.title, datosDeEnvio.query || null,
    JSON.stringify(datosDeEnvio.input), JSON.stringify(datosDeEnvio.result), JSON.stringify(datosDeEnvio.citations), JSON.stringify(datosDeEnvio.metadata)]);
  await pool.query("UPDATE causas SET updated_at = NOW() WHERE id = $1", [datosDeEnvio.caseId]);
  return mapearFila(resultado.rows[0]);
}

async function listarConsultasDeIA(idExpediente, idUsuario) {
  if (!idUsuario) throw new Error("El usuario es obligatorio para consultar el historial.");
  await asegurarTabla();
  const resultado = await pool.query(`
    SELECT id, causa_id, user_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json, created_at
    FROM consultas_ia
    WHERE causa_id = $1 AND user_id = $2
    ORDER BY created_at DESC, id DESC
  `, [idExpediente, idUsuario]);
  return resultado.rows.map(mapearFila);
}

async function obtenerConsultaDeIA(idExpediente, id, idUsuario) {
  if (!idUsuario) throw new Error("El usuario es obligatorio para consultar el análisis.");
  await asegurarTabla();
  const resultado = await pool.query(`
    SELECT id, causa_id, user_id, herramienta, titulo, consulta, entrada_json, resultado_json, citas_json, metadata_json, created_at
    FROM consultas_ia
    WHERE causa_id = $1 AND id = $2 AND user_id = $3
  `, [idExpediente, id, idUsuario]);
  return resultado.rows[0] ? mapearFila(resultado.rows[0]) : null;
}

async function eliminarConsultaDeIA(idExpediente, id, idUsuario) {
  if (!idUsuario) throw new Error("El usuario es obligatorio para eliminar el análisis.");
  await asegurarTabla();
  const resultado = await pool.query("DELETE FROM consultas_ia WHERE causa_id = $1 AND id = $2 AND user_id = $3 RETURNING id", [idExpediente, id, idUsuario]);
  return resultado.rowCount > 0;
}

function mapearFila(fila) { return { id: Number(fila.id), case_id: Number(fila.causa_id), user_id: fila.user_id, tool_id: fila.herramienta, title: fila.titulo,
  query: fila.consulta, input: fila.entrada_json, result: fila.resultado_json, citations: fila.citas_json,
  metadata: fila.metadata_json, created_at: fila.created_at }; }

function reiniciarTablaDeConsultasParaPruebas() { initialized = false; }
module.exports = { guardarConsultaDeIA, eliminarConsultaDeIA, obtenerConsultaDeIA, listarConsultasDeIA, reiniciarTablaDeConsultasParaPruebas };
