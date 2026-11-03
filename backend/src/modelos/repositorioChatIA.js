const { pool } = require("../configuracion/baseDatos");

async function listConversations({ organizationId, caseId, userId }) {
  const result = await pool.query(`SELECT c.id,c.causa_id,c.titulo,c.created_at,c.updated_at,
    COUNT(m.id)::int AS mensajes_count,
    (ARRAY_AGG(m.contenido ORDER BY m.created_at DESC,m.id DESC) FILTER (WHERE m.id IS NOT NULL))[1] AS ultimo_mensaje
    FROM conversaciones_ia c LEFT JOIN mensajes_chat_ia m ON m.conversacion_id=c.id
    WHERE c.organizacion_id=$1 AND c.causa_id=$2 AND c.user_id=$3
    GROUP BY c.id ORDER BY c.updated_at DESC,c.id DESC`, [organizationId, caseId, userId]);
  return result.rows.map(mapConversation);
}

async function createConversation({ organizationId, caseId, userId, title = "Nueva conversacion" }) {
  const result = await pool.query(`INSERT INTO conversaciones_ia (organizacion_id,causa_id,user_id,titulo)
    VALUES($1,$2,$3,$4) RETURNING id,causa_id,titulo,created_at,updated_at`,
  [organizationId, caseId, userId, normalizeTitle(title)]);
  return mapConversation(result.rows[0]);
}

async function getConversation({ organizationId, caseId, userId, conversationId }) {
  const conversation = await pool.query(`SELECT id,causa_id,titulo,created_at,updated_at
    FROM conversaciones_ia WHERE id=$1 AND organizacion_id=$2 AND causa_id=$3 AND user_id=$4`,
  [conversationId, organizationId, caseId, userId]);
  if (!conversation.rowCount) return null;
  const messages = await pool.query(`SELECT id,rol,contenido,consulta_recuperacion,herramienta,citas_json,metadata_json,created_at
    FROM mensajes_chat_ia WHERE conversacion_id=$1 ORDER BY created_at,id`, [conversationId]);
  return { ...mapConversation(conversation.rows[0]), messages: messages.rows.map(mapMessage) };
}

async function appendExchange({ organizationId, caseId, userId, conversationId, userContent,
  assistantContent, retrievalQuery, toolId, citations = [], metadata = {} }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query(`SELECT id,titulo FROM conversaciones_ia
      WHERE id=$1 AND organizacion_id=$2 AND causa_id=$3 AND user_id=$4 FOR UPDATE`,
    [conversationId, organizationId, caseId, userId]);
    if (!owner.rowCount) { const error = new Error("Conversacion no encontrada."); error.statusCode = 404; throw error; }
    const userMessage = await client.query(`INSERT INTO mensajes_chat_ia (conversacion_id,rol,contenido)
      VALUES($1,'usuario',$2) RETURNING *`, [conversationId, userContent]);
    const assistantMessage = await client.query(`INSERT INTO mensajes_chat_ia
      (conversacion_id,rol,contenido,consulta_recuperacion,herramienta,citas_json,metadata_json)
      VALUES($1,'asistente',$2,$3,$4,$5::jsonb,$6::jsonb) RETURNING *`,
    [conversationId, assistantContent, retrievalQuery || null, toolId || null, JSON.stringify(citations), JSON.stringify(metadata)]);
    const title = owner.rows[0].titulo === "Nueva conversacion" ? buildTitle(userContent) : owner.rows[0].titulo;
    await client.query("UPDATE conversaciones_ia SET titulo=$2,updated_at=NOW() WHERE id=$1", [conversationId, title]);
    await client.query("COMMIT");
    return { title, userMessage: mapMessage(userMessage.rows[0]), assistantMessage: mapMessage(assistantMessage.rows[0]) };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function deleteConversation({ organizationId, caseId, userId, conversationId }) {
  const result = await pool.query(`DELETE FROM conversaciones_ia
    WHERE id=$1 AND organizacion_id=$2 AND causa_id=$3 AND user_id=$4 RETURNING id`,
  [conversationId, organizationId, caseId, userId]);
  return result.rowCount > 0;
}

function mapConversation(row) {
  return { id: Number(row.id), case_id: Number(row.causa_id), title: row.titulo,
    messages_count: Number(row.mensajes_count || 0), last_message: row.ultimo_mensaje || null,
    created_at: row.created_at, updated_at: row.updated_at };
}
function mapMessage(row) {
  return { id: Number(row.id), role: row.rol, content: row.contenido,
    retrieval_query: row.consulta_recuperacion || null, tool_id: row.herramienta || null,
    citations: row.citas_json || [], metadata: row.metadata_json || {}, created_at: row.created_at };
}
function normalizeTitle(value) { return String(value || "Nueva conversacion").replace(/\s+/g, " ").trim().slice(0, 160) || "Nueva conversacion"; }
function buildTitle(value) { const clean = String(value || "").replace(/\s+/g, " ").trim(); return clean.length > 72 ? `${clean.slice(0, 69)}...` : clean || "Nueva conversacion"; }

module.exports = { appendExchange, createConversation, deleteConversation, getConversation, listConversations };
