const crypto = require("node:crypto");
const { pool } = require("../configuracion/baseDatos");

const DEFAULT_CHECKLISTS = [
  { id: "base-inicio", nombre: "Inicio de causa", etapa: "inicio", items_json: ["Verificar conflicto de interes", "Confirmar datos del cliente", "Registrar partes y contactos", "Cargar documentacion inicial", "Definir responsable y proximos pasos"] },
  { id: "base-audiencia", nombre: "Preparacion de audiencia", etapa: "audiencia", items_json: ["Revisar notificacion y objeto", "Confirmar fecha, horario y lugar", "Revisar prueba y documentos", "Preparar preguntas y argumentos", "Contactar al cliente", "Registrar resultado y proximas acciones"] },
  { id: "base-apelacion", nombre: "Apelacion", etapa: "recurso", items_json: ["Controlar plazo de interposicion", "Revisar resolucion recurrida", "Definir agravios", "Preparar escrito", "Realizar control final", "Registrar presentacion"] },
  { id: "base-cierre", nombre: "Cierre y archivo", etapa: "cierre", items_json: ["Verificar tareas pendientes", "Conciliar honorarios y gastos", "Entregar documentacion al cliente", "Registrar resultado final", "Cerrar accesos del portal", "Archivar expediente"] },
];

async function listMembers(organizationId) {
  const result = await pool.query(`SELECT u.id,u.name,u.email,m.rol
    FROM membresias m JOIN "user" u ON u.id=m.user_id
    WHERE m.organizacion_id=$1 ORDER BY u.name,u.email`, [organizationId]);
  return result.rows;
}

async function listTasks(organizationId, filters = {}) {
  const values = [organizationId]; const where = ["t.organizacion_id=$1"];
  if (filters.caseId) { values.push(filters.caseId); where.push(`t.causa_id=$${values.length}`); }
  if (filters.responsibleUserId) { values.push(filters.responsibleUserId); where.push(`t.responsable_user_id=$${values.length}`); }
  if (filters.status) { values.push(filters.status); where.push(`t.estado=$${values.length}`); }
  if (filters.pendingOnly) where.push("t.estado NOT IN ('completada','cancelada')");
  const result = await pool.query(`SELECT t.*,c.caratula,c.identificador,u.name AS responsable_nombre,
      COALESCE((SELECT json_agg(json_build_object('id',i.id,'texto',i.texto,'completado',i.completado,'orden',i.orden) ORDER BY i.orden,i.id) FROM tarea_items i WHERE i.tarea_id=t.id),'[]') AS items,
      COALESCE((SELECT COUNT(*)::int FROM tarea_comentarios tc WHERE tc.tarea_id=t.id),0) AS comentarios_count
    FROM tareas_juridicas t LEFT JOIN causas c ON c.id=t.causa_id LEFT JOIN "user" u ON u.id=t.responsable_user_id
    WHERE ${where.join(" AND ")}
    ORDER BY CASE t.estado WHEN 'bloqueada' THEN 0 WHEN 'en_curso' THEN 1 WHEN 'pendiente' THEN 2 ELSE 3 END,
      t.fecha_limite ASC NULLS LAST,t.prioridad DESC,t.orden,t.created_at DESC`, values);
  return result.rows;
}

async function createTask(organizationId, userId, payload) {
  const result = await pool.query(`INSERT INTO tareas_juridicas
    (organizacion_id,causa_id,titulo,descripcion,tipo,estado,prioridad,responsable_user_id,documento_id,fecha_limite,estimacion_minutos,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
  [organizationId,payload.causa_id || null,payload.titulo,payload.descripcion || null,payload.tipo || "general",payload.estado || "pendiente",payload.prioridad || "media",payload.responsable_user_id || null,payload.documento_id || null,payload.fecha_limite || null,payload.estimacion_minutos || null,userId]);
  const task = result.rows[0];
  for (const [index, text] of (payload.items || []).entries()) {
    await pool.query("INSERT INTO tarea_items(tarea_id,texto,orden) VALUES($1,$2,$3)", [task.id, String(text).trim(), index]);
  }
  return task;
}

async function updateTask(organizationId, taskId, payload) {
  const allowed = ["titulo","descripcion","tipo","estado","prioridad","responsable_user_id","documento_id","fecha_limite","estimacion_minutos","orden","visible_portal","requiere_confirmacion"];
  const sets=[]; const values=[organizationId,taskId];
  for (const field of allowed) if (Object.prototype.hasOwnProperty.call(payload,field)) { values.push(payload[field] === "" ? null : payload[field]); sets.push(`${field}=$${values.length}`); }
  if (!sets.length) return getTask(organizationId, taskId);
  if (payload.estado === "completada") sets.push("completado_at=NOW()");
  else if (Object.prototype.hasOwnProperty.call(payload,"estado")) sets.push("completado_at=NULL");
  sets.push("updated_at=NOW()");
  const result=await pool.query(`UPDATE tareas_juridicas SET ${sets.join(",")} WHERE organizacion_id=$1 AND id=$2 RETURNING *`,values);
  return result.rows[0] || null;
}

async function getTask(organizationId, taskId) { const r=await pool.query("SELECT * FROM tareas_juridicas WHERE organizacion_id=$1 AND id=$2",[organizationId,taskId]); return r.rows[0] || null; }
async function deleteTask(organizationId, taskId) { const r=await pool.query("DELETE FROM tareas_juridicas WHERE organizacion_id=$1 AND id=$2 RETURNING id",[organizationId,taskId]); return r.rows[0] || null; }

async function addTaskItem(organizationId, taskId, text) {
  const r=await pool.query(`INSERT INTO tarea_items(tarea_id,texto,orden)
    SELECT t.id,$3,COALESCE((SELECT MAX(i.orden)+1 FROM tarea_items i WHERE i.tarea_id=t.id),0)
    FROM tareas_juridicas t WHERE t.organizacion_id=$1 AND t.id=$2 RETURNING *`,[organizationId,taskId,text]); return r.rows[0] || null;
}
async function updateTaskItem(organizationId, itemId, payload, userId) {
  const r=await pool.query(`UPDATE tarea_items i SET completado=COALESCE($3,i.completado), texto=COALESCE($4,i.texto),
      completado_por=CASE WHEN COALESCE($3,i.completado) THEN $5 ELSE NULL END,
      completado_at=CASE WHEN COALESCE($3,i.completado) THEN NOW() ELSE NULL END
    FROM tareas_juridicas t WHERE i.tarea_id=t.id AND t.organizacion_id=$1 AND i.id=$2 RETURNING i.*`,[organizationId,itemId,payload.completado,payload.texto || null,userId]); return r.rows[0] || null;
}
async function addTaskComment(organizationId, taskId, userId, content) {
  const r=await pool.query(`INSERT INTO tarea_comentarios(tarea_id,user_id,contenido)
    SELECT t.id,$3,$4 FROM tareas_juridicas t WHERE t.organizacion_id=$1 AND t.id=$2 RETURNING *`,[organizationId,taskId,userId,content]); return r.rows[0] || null;
}
async function listTaskComments(organizationId, taskId) {
  const r=await pool.query(`SELECT tc.*,u.name AS autor_nombre FROM tarea_comentarios tc JOIN tareas_juridicas t ON t.id=tc.tarea_id LEFT JOIN "user" u ON u.id=tc.user_id WHERE t.organizacion_id=$1 AND t.id=$2 ORDER BY tc.created_at`,[organizationId,taskId]); return r.rows;
}

async function listChecklistTemplates(organizationId) {
  const r=await pool.query("SELECT * FROM plantillas_checklist WHERE organizacion_id=$1 AND activa=TRUE ORDER BY nombre",[organizationId]);
  return [...DEFAULT_CHECKLISTS, ...r.rows];
}
async function createChecklistTemplate(organizationId,userId,payload) { const r=await pool.query(`INSERT INTO plantillas_checklist(organizacion_id,nombre,etapa,descripcion,items_json,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,[organizationId,payload.nombre,payload.etapa || "general",payload.descripcion || null,JSON.stringify(payload.items || []),userId]); return r.rows[0]; }
async function applyChecklistTemplate(organizationId,userId,caseId,payload) {
  let template;
  if (String(payload.plantilla_id).startsWith("base-")) template=DEFAULT_CHECKLISTS.find(item=>item.id===payload.plantilla_id);
  else { const r=await pool.query("SELECT * FROM plantillas_checklist WHERE id=$1 AND organizacion_id=$2 AND activa=TRUE",[payload.plantilla_id,organizationId]); template=r.rows[0]; }
  if (!template) return null;
  return createTask(organizationId,userId,{ causa_id:caseId,titulo:payload.titulo || template.nombre,descripcion:template.descripcion,tipo:template.etapa || "checklist",prioridad:payload.prioridad || "media",responsable_user_id:payload.responsable_user_id,fecha_limite:payload.fecha_limite,items:template.items_json || [] });
}

const SIMPLE_CONFIG = {
  audiencias:{ table:"audiencias", order:"fecha DESC NULLS LAST,created_at DESC", fields:["titulo","fecha","lugar","participantes","objetivo","argumentos","preguntas","objeciones","notas","resultado","proximas_acciones","checklist_json","estado"] },
  comunicaciones:{ table:"comunicaciones", order:"fecha DESC,created_at DESC", fields:["contacto_id","tipo","fecha","asunto","resumen","compromisos","proximo_contacto","privada"] },
  movimientos:{ table:"movimientos_financieros", order:"fecha DESC,created_at DESC", fields:["tipo","concepto","monto","moneda","fecha","estado","comprobante","notas"] },
  tiempos:{ table:"registros_tiempo", order:"fecha DESC,created_at DESC", fields:["tarea_id","descripcion","minutos","fecha","facturable"] },
};
async function listCaseRecords(kind,organizationId,caseId) { const config=SIMPLE_CONFIG[kind]; const r=await pool.query(`SELECT * FROM ${config.table} WHERE organizacion_id=$1 AND causa_id=$2 ORDER BY ${config.order}`,[organizationId,caseId]); return r.rows; }
async function createCaseRecord(kind,organizationId,userId,caseId,payload) {
  const config=SIMPLE_CONFIG[kind]; const fields=config.fields.filter(field=>Object.prototype.hasOwnProperty.call(payload,field));
  const columns=["organizacion_id","causa_id",...(kind==="tiempos"?["user_id"]:["created_by"]),...fields];
  const values=[organizationId,caseId,userId,...fields.map(field=>field==="checklist_json"?JSON.stringify(payload[field] || []):payload[field])];
  const placeholders=values.map((_,index)=>`$${index+1}${columns[index]==="checklist_json"?"::jsonb":""}`);
  const r=await pool.query(`INSERT INTO ${config.table}(${columns.join(",")}) VALUES(${placeholders.join(",")}) RETURNING *`,values); return r.rows[0];
}
async function updateCaseRecord(kind,organizationId,caseId,id,payload) {
  const config=SIMPLE_CONFIG[kind]; const fields=config.fields.filter(field=>Object.prototype.hasOwnProperty.call(payload,field)); const values=[organizationId,caseId,id];
  const sets=fields.map(field=>{values.push(field==="checklist_json"?JSON.stringify(payload[field] || []):payload[field]); return `${field}=$${values.length}${field==="checklist_json"?"::jsonb":""}`;});
  if (["audiencias"].includes(kind)) sets.push("updated_at=NOW()"); if(!sets.length)return null;
  const r=await pool.query(`UPDATE ${config.table} SET ${sets.join(",")} WHERE organizacion_id=$1 AND causa_id=$2 AND id=$3 RETURNING *`,values); return r.rows[0]||null;
}

async function listContacts(organizationId,caseId) { const values=[organizationId]; let where="co.organizacion_id=$1"; if(caseId){values.push(caseId);where+=` AND cc.causa_id=$2`;}
  const r=await pool.query(`SELECT co.*,cc.rol,cc.es_cliente,cc.causa_id FROM contactos co LEFT JOIN causa_contactos cc ON cc.contacto_id=co.id WHERE ${where} ORDER BY co.nombre`,values); return r.rows; }
async function createContact(organizationId,userId,payload) { const r=await pool.query(`INSERT INTO contactos(organizacion_id,nombre,tipo,documento,email,telefono,organizacion_nombre,notas,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[organizationId,payload.nombre,payload.tipo||"cliente",payload.documento||null,payload.email||null,payload.telefono||null,payload.organizacion_nombre||null,payload.notas||null,userId]); return r.rows[0]; }
async function linkContact(organizationId,caseId,contactId,payload={}) { const r=await pool.query(`INSERT INTO causa_contactos(causa_id,contacto_id,rol,es_cliente)
    SELECT c.id,co.id,$4,$5 FROM causas c JOIN contactos co ON co.id=$3 AND co.organizacion_id=$1 WHERE c.id=$2 AND c.organizacion_id=$1
    ON CONFLICT(causa_id,contacto_id) DO UPDATE SET rol=EXCLUDED.rol,es_cliente=EXCLUDED.es_cliente RETURNING *`,[organizationId,caseId,contactId,payload.rol||"vinculado",Boolean(payload.es_cliente)]); return r.rows[0]||null; }
async function findConflicts(organizationId,query) { const needle=`%${String(query).trim()}%`; const r=await pool.query(`SELECT co.id,co.nombre,co.tipo,co.documento,co.organizacion_nombre,c.id AS causa_id,c.caratula,cc.rol
    FROM contactos co LEFT JOIN causa_contactos cc ON cc.contacto_id=co.id LEFT JOIN causas c ON c.id=cc.causa_id
    WHERE co.organizacion_id=$1 AND (co.nombre ILIKE $2 OR co.documento ILIKE $2 OR co.organizacion_nombre ILIKE $2) ORDER BY co.nombre LIMIT 30`,[organizationId,needle]); return r.rows; }

async function getFinanceSummary(organizationId,caseId) { const r=await pool.query(`SELECT
    COALESCE(SUM(monto) FILTER(WHERE tipo='honorario' AND estado<>'cancelado'),0)::numeric AS honorarios,
    COALESCE(SUM(monto) FILTER(WHERE tipo='pago' AND estado<>'cancelado'),0)::numeric AS pagos,
    COALESCE(SUM(monto) FILTER(WHERE tipo='gasto' AND estado<>'cancelado'),0)::numeric AS gastos,
    COALESCE((SELECT SUM(minutos) FROM registros_tiempo WHERE organizacion_id=$1 AND causa_id=$2),0)::int AS minutos
    FROM movimientos_financieros WHERE organizacion_id=$1 AND causa_id=$2`,[organizationId,caseId]); return r.rows[0]; }

async function listWritingTemplates(organizationId) { const r=await pool.query("SELECT * FROM plantillas_escritos WHERE organizacion_id=$1 AND activa=TRUE ORDER BY nombre",[organizationId]); return r.rows; }
async function createWritingTemplate(organizationId,userId,payload) { const vars=[...String(payload.contenido).matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map(m=>m[1]); const r=await pool.query(`INSERT INTO plantillas_escritos(organizacion_id,nombre,categoria,contenido,variables_json,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,[organizationId,payload.nombre,payload.categoria||"general",payload.contenido,JSON.stringify([...new Set(vars)]),userId]); return r.rows[0]; }
async function listWritings(organizationId,caseId) { const r=await pool.query("SELECT * FROM escritos_generados WHERE organizacion_id=$1 AND causa_id=$2 ORDER BY updated_at DESC",[organizationId,caseId]); return r.rows; }
async function generateWriting(organizationId,userId,caseId,payload) { const templateResult=await pool.query("SELECT * FROM plantillas_escritos WHERE id=$1 AND organizacion_id=$2 AND activa=TRUE",[payload.plantilla_id,organizationId]); const template=templateResult.rows[0]; if(!template)return null;
  const caseResult=await pool.query("SELECT * FROM causas WHERE id=$1 AND organizacion_id=$2",[caseId,organizationId]); const legalCase=caseResult.rows[0];
  const variables={caratula:legalCase.caratula,numero_expediente:legalCase.identificador,descripcion:legalCase.descripcion||"",...(payload.variables||{})};
  const content=template.contenido.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_,key)=>String(variables[key]??`{{${key}}}`));
  const r=await pool.query(`INSERT INTO escritos_generados(organizacion_id,causa_id,plantilla_id,titulo,contenido,variables_json,created_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,[organizationId,caseId,template.id,payload.titulo||template.nombre,content,JSON.stringify(variables),userId]); return r.rows[0]; }
async function updateWriting(organizationId,caseId,id,payload){ const r=await pool.query(`UPDATE escritos_generados SET titulo=COALESCE($4,titulo),contenido=COALESCE($5,contenido),estado=COALESCE($6,estado),version=CASE WHEN $5::text IS NULL THEN version ELSE version+1 END,updated_at=NOW() WHERE organizacion_id=$1 AND causa_id=$2 AND id=$3 RETURNING *`,[organizationId,caseId,id,payload.titulo||null,payload.contenido||null,payload.estado||null]);return r.rows[0]||null; }

async function createPortalAccess(organizationId,userId,caseId,payload) { const token=crypto.randomBytes(32).toString("base64url"); const hash=hashToken(token); const r=await pool.query(`INSERT INTO accesos_portal_cliente(organizacion_id,causa_id,contacto_id,token_hash,etiqueta,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,causa_id,contacto_id,etiqueta,expires_at,created_at`,[organizationId,caseId,payload.contacto_id||null,hash,payload.etiqueta,payload.expires_at||null,userId]); return {...r.rows[0],token}; }
async function listPortalAccess(organizationId,caseId){const r=await pool.query(`SELECT a.id,a.causa_id,a.contacto_id,a.etiqueta,a.expires_at,a.ultimo_acceso_at,a.revocado_at,a.created_at,
  COALESCE((SELECT json_agg(json_build_object('id',m.id,'autor_tipo',m.autor_tipo,'contenido',m.contenido,'created_at',m.created_at) ORDER BY m.created_at) FROM mensajes_portal m WHERE m.acceso_id=a.id),'[]') AS mensajes
  FROM accesos_portal_cliente a WHERE a.organizacion_id=$1 AND a.causa_id=$2 ORDER BY a.created_at DESC`,[organizationId,caseId]);return r.rows;}
async function revokePortalAccess(organizationId,caseId,id){const r=await pool.query("UPDATE accesos_portal_cliente SET revocado_at=NOW() WHERE organizacion_id=$1 AND causa_id=$2 AND id=$3 RETURNING id",[organizationId,caseId,id]);return r.rows[0]||null;}
function hashToken(token){return crypto.createHash("sha256").update(String(token)).digest("hex");}
async function resolvePortal(token){const hash=hashToken(token);const r=await pool.query(`SELECT a.*,c.caratula,c.identificador,c.estado,co.nombre AS cliente_nombre FROM accesos_portal_cliente a JOIN causas c ON c.id=a.causa_id LEFT JOIN contactos co ON co.id=a.contacto_id WHERE a.token_hash=$1 AND a.revocado_at IS NULL AND (a.expires_at IS NULL OR a.expires_at>NOW())`,[hash]);if(!r.rowCount)return null;await pool.query("UPDATE accesos_portal_cliente SET ultimo_acceso_at=NOW() WHERE id=$1",[r.rows[0].id]);return r.rows[0];}
async function getPortalData(access){const [dates,documents,messages,tasks,uploads]=await Promise.all([
  pool.query("SELECT id,evento,fecha,fecha_texto,tipo FROM fechas_relevantes WHERE causa_id=$1 AND estado IN ('pendiente','en_seguimiento') ORDER BY fecha ASC NULLS LAST LIMIT 20",[access.causa_id]),
  pool.query("SELECT id,nombre_archivo,tipo_archivo,created_at FROM documentos WHERE causa_id=$1 AND visible_portal=TRUE ORDER BY created_at DESC",[access.causa_id]),
  pool.query("SELECT id,autor_tipo,contenido,created_at FROM mensajes_portal WHERE acceso_id=$1 ORDER BY created_at",[access.id]),
  pool.query("SELECT id,titulo,descripcion,fecha_limite,estado,requiere_confirmacion,confirmado_cliente_at FROM tareas_juridicas WHERE causa_id=$1 AND visible_portal=TRUE AND estado NOT IN ('cancelada') ORDER BY fecha_limite ASC NULLS LAST,created_at",[access.causa_id]),
  pool.query("SELECT id,nombre_archivo,descripcion,created_at FROM documentos_portal_cliente WHERE acceso_id=$1 ORDER BY created_at DESC",[access.id]),
]); return {case:{id:access.causa_id,caratula:access.caratula,identificador:access.identificador,estado:access.estado},cliente_nombre:access.cliente_nombre,fechas:dates.rows,documentos:documents.rows,mensajes:messages.rows,tareas:tasks.rows,archivos_enviados:uploads.rows};}
async function postPortalMessage(access,authorType,content,userId=null){const r=await pool.query("INSERT INTO mensajes_portal(acceso_id,causa_id,autor_tipo,autor_user_id,contenido) VALUES($1,$2,$3,$4,$5) RETURNING *",[access.id,access.causa_id,authorType,userId,content]);return r.rows[0];}
async function getPortalDocument(access,documentId){const r=await pool.query("SELECT id,nombre_archivo,mime_type,ruta_archivo FROM documentos WHERE id=$1 AND causa_id=$2 AND visible_portal=TRUE",[documentId,access.causa_id]);return r.rows[0]||null;}
async function setDocumentPortalVisibility(organizationId,caseId,documentId,visible){const r=await pool.query(`UPDATE documentos d SET visible_portal=$4,updated_at=NOW() FROM causas c WHERE d.causa_id=c.id AND c.organizacion_id=$1 AND c.id=$2 AND d.id=$3 RETURNING d.id,d.visible_portal`,[organizationId,caseId,documentId,visible]);return r.rows[0]||null;}
async function confirmPortalTask(access,taskId){const r=await pool.query("UPDATE tareas_juridicas SET confirmado_cliente_at=NOW(),updated_at=NOW() WHERE causa_id=$1 AND id=$2 AND visible_portal=TRUE AND requiere_confirmacion=TRUE RETURNING id,confirmado_cliente_at",[access.causa_id,taskId]);return r.rows[0]||null;}
async function savePortalUpload(access,file,description){const r=await pool.query(`INSERT INTO documentos_portal_cliente(acceso_id,organizacion_id,causa_id,nombre_archivo,mime_type,ruta_archivo,tamano_bytes,descripcion) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,nombre_archivo,descripcion,created_at`,[access.id,access.organizacion_id,access.causa_id,file.originalname,file.mimetype,file.path,file.size,description||null]);return r.rows[0];}
async function listPortalUploads(organizationId,caseId){const r=await pool.query(`SELECT d.id,d.nombre_archivo,d.mime_type,d.ruta_archivo,d.tamano_bytes,d.descripcion,d.created_at,a.etiqueta FROM documentos_portal_cliente d JOIN accesos_portal_cliente a ON a.id=d.acceso_id WHERE d.organizacion_id=$1 AND d.causa_id=$2 ORDER BY d.created_at DESC`,[organizationId,caseId]);return r.rows;}
async function getPortalUpload(organizationId,caseId,id){const r=await pool.query("SELECT * FROM documentos_portal_cliente WHERE organizacion_id=$1 AND causa_id=$2 AND id=$3",[organizationId,caseId,id]);return r.rows[0]||null;}

async function buildReviewSnapshot(organizationId,caseId){const r=await pool.query(`SELECT
    (SELECT COUNT(*)::int FROM tareas_juridicas WHERE causa_id=$2 AND estado NOT IN ('completada','cancelada')) AS tareas_pendientes,
    (SELECT COUNT(*)::int FROM tareas_juridicas WHERE causa_id=$2 AND estado NOT IN ('completada','cancelada') AND fecha_limite<NOW()) AS tareas_vencidas,
    (SELECT COUNT(*)::int FROM fechas_relevantes WHERE causa_id=$2 AND estado IN ('pendiente','en_seguimiento') AND fecha<NOW()) AS fechas_vencidas,
    (SELECT COUNT(*)::int FROM documentos WHERE causa_id=$2) AS documentos,
    (SELECT COUNT(*)::int FROM causa_contactos WHERE causa_id=$2) AS contactos,
    (SELECT COUNT(*)::int FROM comunicaciones WHERE causa_id=$2) AS comunicaciones,
    (SELECT COUNT(*)::int FROM audiencias WHERE causa_id=$2 AND estado='preparacion') AS audiencias_en_preparacion,
    (SELECT COUNT(*)::int FROM accesos_portal_cliente WHERE causa_id=$2 AND revocado_at IS NULL AND (expires_at IS NULL OR expires_at>NOW())) AS accesos_portal_activos
    FROM causas WHERE organizacion_id=$1 AND id=$2`,[organizationId,caseId]);return r.rows[0]||null;}
async function listReviews(organizationId,caseId){const r=await pool.query(`SELECT rv.*,u.name AS revisor_nombre FROM revisiones_causa rv LEFT JOIN "user" u ON u.id=rv.revisado_por WHERE rv.organizacion_id=$1 AND rv.causa_id=$2 ORDER BY rv.created_at DESC`,[organizationId,caseId]);return r.rows;}
async function createReview(organizationId,userId,caseId,payload){const snapshot=await buildReviewSnapshot(organizationId,caseId);const r=await pool.query("INSERT INTO revisiones_causa(organizacion_id,causa_id,estado,observaciones,snapshot_json,revisado_por) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING *",[organizationId,caseId,payload.estado||"observada",payload.observaciones||null,JSON.stringify(snapshot||{}),userId]);return r.rows[0];}

module.exports={addTaskComment,addTaskItem,applyChecklistTemplate,buildReviewSnapshot,confirmPortalTask,createCaseRecord,createChecklistTemplate,createContact,createPortalAccess,createReview,createTask,createWritingTemplate,deleteTask,findConflicts,generateWriting,getFinanceSummary,getPortalData,getPortalDocument,getPortalUpload,linkContact,listCaseRecords,listChecklistTemplates,listContacts,listMembers,listPortalAccess,listPortalUploads,listReviews,listTaskComments,listTasks,listWritingTemplates,listWritings,postPortalMessage,resolvePortal,revokePortalAccess,savePortalUpload,setDocumentPortalVisibility,updateCaseRecord,updateTask,updateTaskItem,updateWriting};
