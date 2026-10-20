const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, requireCaseAccess, requireRole, recordAudit } = require("../autenticacion/autorizacion");
const repo = require("../modelos/repositorioTrabajoJuridico");

const router = express.Router();
router.use(requireSession, attachSecurityContext);

const STATES = ["pendiente","en_curso","bloqueada","completada","cancelada"];
const PRIORITIES = ["baja","media","alta","urgente"];
const RECORDS = {
  audiencias: { required: "titulo", role: "asistente" },
  comunicaciones: { required: "asunto", role: "asistente" },
  movimientos: { required: "concepto", role: "abogado" },
  tiempos: { required: "descripcion", role: "asistente" },
};

router.get("/miembros", asyncHandler(async (req,res)=>res.json({members:await repo.listMembers(req.security.organizationId)})));
router.get("/tareas", asyncHandler(async (req,res)=>res.json({tasks:await repo.listTasks(req.security.organizationId,{
  caseId:positive(req.query.case_id), responsibleUserId:req.query.mias==="true"?req.user.id:text(req.query.responsable_user_id), status:text(req.query.estado), pendingOnly:req.query.pendientes==="true",
})})));
router.post("/tareas", requireRole("asistente"), asyncHandler(async(req,res)=>{
  const error=validateTask(req.body); if(error)return res.status(400).json({error});
  if(req.body.causa_id && !(await caseBelongs(req.security.organizationId,req.body.causa_id)))return res.status(404).json({error:"Caso no encontrado."});
  const task=await repo.createTask(req.security.organizationId,req.user.id,normalizeTask(req.body)); await audit(req,"tarea.creada","tarea",task.id,{causa_id:task.causa_id}); return res.status(201).json({task});
}));
router.put("/tareas/:taskId", requireRole("asistente"), asyncHandler(async(req,res)=>{const error=validateTask(req.body,true);if(error)return res.status(400).json({error});const task=await repo.updateTask(req.security.organizationId,positive(req.params.taskId),normalizeTask(req.body,true));if(!task)return res.status(404).json({error:"Tarea no encontrada."});await audit(req,"tarea.actualizada","tarea",task.id,{estado:task.estado});return res.json({task});}));
router.delete("/tareas/:taskId", requireRole("abogado"), asyncHandler(async(req,res)=>{const task=await repo.deleteTask(req.security.organizationId,positive(req.params.taskId));if(!task)return res.status(404).json({error:"Tarea no encontrada."});await audit(req,"tarea.eliminada","tarea",task.id);return res.status(204).send();}));
router.post("/tareas/:taskId/items", requireRole("asistente"), asyncHandler(async(req,res)=>{if(!text(req.body.texto))return res.status(400).json({error:"El texto del item es obligatorio."});const item=await repo.addTaskItem(req.security.organizationId,positive(req.params.taskId),text(req.body.texto));return item?res.status(201).json({item}):res.status(404).json({error:"Tarea no encontrada."});}));
router.put("/tareas/items/:itemId", requireRole("asistente"), asyncHandler(async(req,res)=>{const item=await repo.updateTaskItem(req.security.organizationId,positive(req.params.itemId),{completado:typeof req.body.completado==="boolean"?req.body.completado:null,texto:text(req.body.texto)},req.user.id);return item?res.json({item}):res.status(404).json({error:"Item no encontrado."});}));
router.get("/tareas/:taskId/comentarios", asyncHandler(async(req,res)=>res.json({comments:await repo.listTaskComments(req.security.organizationId,positive(req.params.taskId))})));
router.post("/tareas/:taskId/comentarios", requireRole("asistente"), asyncHandler(async(req,res)=>{const content=text(req.body.contenido);if(!content)return res.status(400).json({error:"El comentario es obligatorio."});const comment=await repo.addTaskComment(req.security.organizationId,positive(req.params.taskId),req.user.id,content);return comment?res.status(201).json({comment}):res.status(404).json({error:"Tarea no encontrada."});}));

router.get("/checklists", asyncHandler(async(req,res)=>res.json({templates:await repo.listChecklistTemplates(req.security.organizationId)})));
router.post("/checklists", requireRole("abogado"), asyncHandler(async(req,res)=>{if(!text(req.body.nombre)||!Array.isArray(req.body.items)||!req.body.items.length)return res.status(400).json({error:"Nombre e items son obligatorios."});const template=await repo.createChecklistTemplate(req.security.organizationId,req.user.id,{...req.body,nombre:text(req.body.nombre),items:req.body.items.map(text).filter(Boolean)});return res.status(201).json({template});}));

router.get("/contactos", asyncHandler(async(req,res)=>res.json({contacts:await repo.listContacts(req.security.organizationId,positive(req.query.case_id))})));
router.post("/contactos", requireRole("asistente"), asyncHandler(async(req,res)=>{if(!text(req.body.nombre))return res.status(400).json({error:"El nombre es obligatorio."});const contact=await repo.createContact(req.security.organizationId,req.user.id,{...req.body,nombre:text(req.body.nombre)});if(req.body.causa_id)await repo.linkContact(req.security.organizationId,positive(req.body.causa_id),contact.id,{rol:req.body.rol,es_cliente:req.body.es_cliente});return res.status(201).json({contact});}));
router.get("/conflictos", asyncHandler(async(req,res)=>{const query=text(req.query.q);if(!query||query.length<3)return res.status(400).json({error:"Ingrese al menos 3 caracteres."});return res.json({matches:await repo.findConflicts(req.security.organizationId,query)});}));

router.get("/plantillas-escritos", asyncHandler(async(req,res)=>res.json({templates:await repo.listWritingTemplates(req.security.organizationId)})));
router.post("/plantillas-escritos", requireRole("abogado"), asyncHandler(async(req,res)=>{if(!text(req.body.nombre)||!text(req.body.contenido))return res.status(400).json({error:"Nombre y contenido son obligatorios."});const template=await repo.createWritingTemplate(req.security.organizationId,req.user.id,{...req.body,nombre:text(req.body.nombre),contenido:text(req.body.contenido)});return res.status(201).json({template});}));

router.use("/casos/:caseId", requireCaseAccess);
router.get("/casos/:caseId/resumen", asyncHandler(async(req,res)=>{const caseId=positive(req.params.caseId);const [tasks,contacts,audiences,communications,movements,times,templates,writings,portalAccess,portalUploads,reviews,snapshot,members,checklists,finance]=await Promise.all([
  repo.listTasks(req.security.organizationId,{caseId}),repo.listContacts(req.security.organizationId,caseId),repo.listCaseRecords("audiencias",req.security.organizationId,caseId),repo.listCaseRecords("comunicaciones",req.security.organizationId,caseId),repo.listCaseRecords("movimientos",req.security.organizationId,caseId),repo.listCaseRecords("tiempos",req.security.organizationId,caseId),repo.listWritingTemplates(req.security.organizationId),repo.listWritings(req.security.organizationId,caseId),repo.listPortalAccess(req.security.organizationId,caseId),repo.listPortalUploads(req.security.organizationId,caseId),repo.listReviews(req.security.organizationId,caseId),repo.buildReviewSnapshot(req.security.organizationId,caseId),repo.listMembers(req.security.organizationId),repo.listChecklistTemplates(req.security.organizationId),repo.getFinanceSummary(req.security.organizationId,caseId),
]);return res.json({tasks,contacts,audiences,communications,movements,times,writing_templates:templates,writings,portal_access:portalAccess,portal_uploads:portalUploads,reviews,review_snapshot:snapshot,members,checklist_templates:checklists,finance});}));
router.post("/casos/:caseId/checklists/aplicar", requireRole("asistente"), asyncHandler(async(req,res)=>{if(!req.body.plantilla_id)return res.status(400).json({error:"Seleccione una plantilla."});const task=await repo.applyChecklistTemplate(req.security.organizationId,req.user.id,positive(req.params.caseId),req.body);return task?res.status(201).json({task}):res.status(404).json({error:"Plantilla no encontrada."});}));
router.post("/casos/:caseId/contactos/:contactId", requireRole("asistente"), asyncHandler(async(req,res)=>{const link=await repo.linkContact(req.security.organizationId,positive(req.params.caseId),positive(req.params.contactId),req.body);return link?res.status(201).json({link}):res.status(404).json({error:"Contacto no encontrado."});}));

for(const [kind,config] of Object.entries(RECORDS)){
  router.get(`/casos/:caseId/${kind}`,asyncHandler(async(req,res)=>res.json({items:await repo.listCaseRecords(kind,req.security.organizationId,positive(req.params.caseId))})));
  router.post(`/casos/:caseId/${kind}`,requireRole(config.role),asyncHandler(async(req,res)=>{if(!text(req.body[config.required]))return res.status(400).json({error:`El campo '${config.required}' es obligatorio.`});if(kind==="movimientos"&&(!Number.isFinite(Number(req.body.monto))||Number(req.body.monto)<0))return res.status(400).json({error:"El monto debe ser valido."});if(kind==="tiempos"&&(!positive(req.body.minutos)))return res.status(400).json({error:"Los minutos deben ser mayores a cero."});const item=await repo.createCaseRecord(kind,req.security.organizationId,req.user.id,positive(req.params.caseId),normalizeRecord(kind,req.body));await audit(req,`${kind}.creado`,kind,item.id,{causa_id:req.params.caseId});return res.status(201).json({item});}));
  if(["audiencias"].includes(kind))router.put(`/casos/:caseId/${kind}/:recordId`,requireRole(config.role),asyncHandler(async(req,res)=>{const item=await repo.updateCaseRecord(kind,req.security.organizationId,positive(req.params.caseId),positive(req.params.recordId),normalizeRecord(kind,req.body));return item?res.json({item}):res.status(404).json({error:"Registro no encontrado."});}));
}

router.get("/casos/:caseId/escritos",asyncHandler(async(req,res)=>res.json({writings:await repo.listWritings(req.security.organizationId,positive(req.params.caseId))})));
router.post("/casos/:caseId/escritos",requireRole("abogado"),asyncHandler(async(req,res)=>{if(!positive(req.body.plantilla_id))return res.status(400).json({error:"Seleccione una plantilla."});const writing=await repo.generateWriting(req.security.organizationId,req.user.id,positive(req.params.caseId),req.body);return writing?res.status(201).json({writing}):res.status(404).json({error:"Plantilla no encontrada."});}));
router.put("/casos/:caseId/escritos/:writingId",requireRole("abogado"),asyncHandler(async(req,res)=>{const writing=await repo.updateWriting(req.security.organizationId,positive(req.params.caseId),positive(req.params.writingId),req.body);return writing?res.json({writing}):res.status(404).json({error:"Escrito no encontrado."});}));

router.post("/casos/:caseId/portal",requireRole("abogado"),asyncHandler(async(req,res)=>{if(!text(req.body.etiqueta))return res.status(400).json({error:"La etiqueta es obligatoria."});const access=await repo.createPortalAccess(req.security.organizationId,req.user.id,positive(req.params.caseId),{...req.body,etiqueta:text(req.body.etiqueta)});await audit(req,"portal.acceso_creado","portal_acceso",access.id,{causa_id:req.params.caseId},"sensible");return res.status(201).json({access});}));
router.delete("/casos/:caseId/portal/:accessId",requireRole("abogado"),asyncHandler(async(req,res)=>{const item=await repo.revokePortalAccess(req.security.organizationId,positive(req.params.caseId),positive(req.params.accessId));return item?res.status(204).send():res.status(404).json({error:"Acceso no encontrado."});}));
router.put("/casos/:caseId/documentos/:documentId/portal",requireRole("abogado"),asyncHandler(async(req,res)=>{const document=await repo.setDocumentPortalVisibility(req.security.organizationId,positive(req.params.caseId),positive(req.params.documentId),Boolean(req.body.visible));return document?res.json({document}):res.status(404).json({error:"Documento no encontrado."});}));
router.post("/casos/:caseId/portal/:accessId/mensajes",requireRole("asistente"),asyncHandler(async(req,res)=>{const content=text(req.body.contenido);if(!content)return res.status(400).json({error:"El mensaje es obligatorio."});const accesses=await repo.listPortalAccess(req.security.organizationId,positive(req.params.caseId));const found=accesses.find(item=>Number(item.id)===positive(req.params.accessId)&&!item.revocado_at);if(!found)return res.status(404).json({error:"Acceso no encontrado."});const access=await repo.resolvePortal(req.body.token||"");if(!access){const fake={id:found.id,causa_id:positive(req.params.caseId)};return res.status(201).json({message:await repo.postPortalMessage(fake,"estudio",content,req.user.id)});}return res.status(201).json({message:await repo.postPortalMessage(access,"estudio",content,req.user.id)});}));
router.get("/casos/:caseId/portal-archivos/:uploadId",asyncHandler(async(req,res)=>{const file=await repo.getPortalUpload(req.security.organizationId,positive(req.params.caseId),positive(req.params.uploadId));if(!file)return res.status(404).json({error:"Archivo no encontrado."});const uploadRoot=path.resolve(process.env.UPLOADS_DIR||path.join(process.cwd(),"uploads"));const resolved=path.resolve(file.ruta_archivo);const relative=path.relative(uploadRoot,resolved);if(relative.startsWith("..")||path.isAbsolute(relative)||!fs.existsSync(resolved))return res.status(404).json({error:"Archivo no disponible."});return res.download(resolved,file.nombre_archivo);}));

router.get("/casos/:caseId/revisiones",asyncHandler(async(req,res)=>res.json({snapshot:await repo.buildReviewSnapshot(req.security.organizationId,positive(req.params.caseId)),reviews:await repo.listReviews(req.security.organizationId,positive(req.params.caseId))})));
router.post("/casos/:caseId/revisiones",requireRole("abogado"),asyncHandler(async(req,res)=>{if(req.body.estado&&!['aprobada','observada','requiere_accion'].includes(req.body.estado))return res.status(400).json({error:"Estado de revision invalido."});const review=await repo.createReview(req.security.organizationId,req.user.id,positive(req.params.caseId),req.body);await audit(req,"causa.revisada","revision_causa",review.id,{causa_id:req.params.caseId,estado:review.estado});return res.status(201).json({review});}));

function normalizeTask(body,partial=false){const out={};for(const field of ["titulo","descripcion","tipo","estado","prioridad","responsable_user_id","fecha_limite"]){if(Object.prototype.hasOwnProperty.call(body,field))out[field]=text(body[field]);}for(const field of ["causa_id","documento_id","estimacion_minutos"]){if(Object.prototype.hasOwnProperty.call(body,field))out[field]=positive(body[field]);}for(const field of ["visible_portal","requiere_confirmacion"]){if(Object.prototype.hasOwnProperty.call(body,field))out[field]=Boolean(body[field]);}if(!partial&&Array.isArray(body.items))out.items=body.items.map(text).filter(Boolean);return out;}
function validateTask(body,partial=false){if(!body||typeof body!=="object")return "El body debe ser un objeto.";if(!partial&&!text(body.titulo))return "El titulo es obligatorio.";if(body.estado&&!STATES.includes(body.estado))return "Estado de tarea invalido.";if(body.prioridad&&!PRIORITIES.includes(body.prioridad))return "Prioridad invalida.";return null;}
function normalizeRecord(kind,body){const out={...body};if(kind==="movimientos")out.monto=Number(body.monto);if(kind==="tiempos")out.minutos=positive(body.minutos);return out;}
async function caseBelongs(organizationId,caseId){const {pool}=require("../configuracion/baseDatos");const r=await pool.query("SELECT 1 FROM causas WHERE id=$1 AND organizacion_id=$2",[positive(caseId),organizationId]);return Boolean(r.rowCount);}
function positive(value){const number=Number(value);return Number.isInteger(number)&&number>0?number:null;}
function text(value){return typeof value==="string"&&value.trim()?value.trim():null;}
async function audit(req,action,type,id,metadata={},risk="normal"){await recordAudit(req,{action,resourceType:type,resourceId:id,metadata,risk});}
function asyncHandler(handler){return(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);}

module.exports=router;
