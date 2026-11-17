const { pool } = require("../configuracion/baseDatos");

async function listarConversaciones({ organizationId: idOrganizacion, caseId: idExpediente, userId: idUsuario }) {
  const resultado = await pool.query(`SELECT c.id,c.causa_id,c.titulo,c.created_at,c.updated_at,
    COUNT(m.id)::int AS mensajes_count,
    (ARRAY_AGG(m.contenido ORDER BY m.created_at DESC,m.id DESC) FILTER (WHERE m.id IS NOT NULL))[1] AS ultimo_mensaje
    FROM conversaciones_ia c LEFT JOIN mensajes_chat_ia m ON m.conversacion_id=c.id
    WHERE c.organizacion_id=$1 AND c.causa_id=$2 AND c.user_id=$3
    GROUP BY c.id ORDER BY c.updated_at DESC,c.id DESC`, [idOrganizacion, idExpediente, idUsuario]);
  return resultado.rows.map(mapearConversacion);
}

async function crearConversacion({ organizationId: idOrganizacion, caseId: idExpediente, userId: idUsuario, title: titulo = "Nueva conversacion" }) {
  const resultado = await pool.query(`INSERT INTO conversaciones_ia (organizacion_id,causa_id,user_id,titulo)
    VALUES($1,$2,$3,$4) RETURNING id,causa_id,titulo,created_at,updated_at`,
  [idOrganizacion, idExpediente, idUsuario, normalizarTitulo(titulo)]);
  return mapearConversacion(resultado.rows[0]);
}

async function obtenerConversacion({ organizationId: idOrganizacion, caseId: idExpediente, userId: idUsuario, conversationId: idConversacion }) {
  const conversation = await pool.query(`SELECT id,causa_id,titulo,created_at,updated_at
    FROM conversaciones_ia WHERE id=$1 AND organizacion_id=$2 AND causa_id=$3 AND user_id=$4`,
  [idConversacion, idOrganizacion, idExpediente, idUsuario]);
  if (!conversation.rowCount) return null;
  const mensajes = await pool.query(`SELECT id,rol,contenido,consulta_recuperacion,herramienta,citas_json,metadata_json,created_at
    FROM mensajes_chat_ia WHERE conversacion_id=$1 ORDER BY created_at,id`, [idConversacion]);
  return { ...mapearConversacion(conversation.rows[0]), messages: mensajes.rows.map(mapearMensaje) };
}

async function guardarIntercambio({ organizationId: idOrganizacion, caseId: idExpediente, userId: idUsuario, conversationId: idConversacion, userContent,
  assistantContent, retrievalQuery: consultaDeBusqueda, toolId: idHerramienta, citations: citas = [], metadata: metadatos = {} }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query(`SELECT id,titulo FROM conversaciones_ia
      WHERE id=$1 AND organizacion_id=$2 AND causa_id=$3 AND user_id=$4 FOR UPDATE`,
    [idConversacion, idOrganizacion, idExpediente, idUsuario]);
    if (!owner.rowCount) { const error = new Error("Conversacion no encontrada."); error.statusCode = 404; throw error; }
    const userMessage = await client.query(`INSERT INTO mensajes_chat_ia (conversacion_id,rol,contenido)
      VALUES($1,'usuario',$2) RETURNING *`, [idConversacion, userContent]);
    const assistantMessage = await client.query(`INSERT INTO mensajes_chat_ia
      (conversacion_id,rol,contenido,consulta_recuperacion,herramienta,citas_json,metadata_json)
      VALUES($1,'asistente',$2,$3,$4,$5::jsonb,$6::jsonb) RETURNING *`,
    [idConversacion, assistantContent, consultaDeBusqueda || null, idHerramienta || null, JSON.stringify(citas), JSON.stringify(metadatos)]);
    const titulo = owner.rows[0].titulo === "Nueva conversacion" ? crearTitulo(userContent) : owner.rows[0].titulo;
    await client.query("UPDATE conversaciones_ia SET titulo=$2,updated_at=NOW() WHERE id=$1", [idConversacion, titulo]);
    await client.query("COMMIT");
    return { title: titulo, userMessage: mapearMensaje(userMessage.rows[0]), assistantMessage: mapearMensaje(assistantMessage.rows[0]) };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function eliminarConversacion({ organizationId: idOrganizacion, caseId: idExpediente, userId: idUsuario, conversationId: idConversacion }) {
  const resultado = await pool.query(`DELETE FROM conversaciones_ia
    WHERE id=$1 AND organizacion_id=$2 AND causa_id=$3 AND user_id=$4 RETURNING id`,
  [idConversacion, idOrganizacion, idExpediente, idUsuario]);
  return resultado.rowCount > 0;
}

function mapearConversacion(fila) {
  return { id: Number(fila.id), case_id: Number(fila.causa_id), title: fila.titulo,
    messages_count: Number(fila.mensajes_count || 0), last_message: fila.ultimo_mensaje || null,
    created_at: fila.created_at, updated_at: fila.updated_at };
}
function mapearMensaje(fila) {
  return { id: Number(fila.id), role: fila.rol, content: fila.contenido,
    retrieval_query: fila.consulta_recuperacion || null, tool_id: fila.herramienta || null,
    citations: fila.citas_json || [], metadata: fila.metadata_json || {}, created_at: fila.created_at };
}
function normalizarTitulo(valor) { return String(valor || "Nueva conversacion").replace(/\s+/g, " ").trim().slice(0, 160) || "Nueva conversacion"; }
function crearTitulo(valor) { const limpio = String(valor || "").replace(/\s+/g, " ").trim(); return limpio.length > 72 ? `${limpio.slice(0, 69)}...` : limpio || "Nueva conversacion"; }

module.exports = { guardarIntercambio, crearConversacion, eliminarConversacion, obtenerConversacion, listarConversaciones };
