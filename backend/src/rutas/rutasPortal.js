const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const multer = require("multer");
const repo = require("../modelos/repositorioTrabajoJuridico");

const router=express.Router();
const uploadRoot=path.resolve(process.env.UPLOADS_DIR||path.join(process.cwd(),"uploads"));
const upload=multer({limits:{fileSize:Number(process.env.PORTAL_MAX_UPLOAD_SIZE_BYTES||5*1024*1024)},storage:multer.memoryStorage()});
router.get("/:token",asyncHandler(async(req,res)=>{const access=await repo.resolvePortal(req.params.token);if(!access)return res.status(404).json({error:"El acceso no existe, vencio o fue revocado."});return res.json(await repo.getPortalData(access));}));
router.post("/:token/mensajes",asyncHandler(async(req,res)=>{const access=await repo.resolvePortal(req.params.token);if(!access)return res.status(404).json({error:"El acceso no existe, vencio o fue revocado."});const content=typeof req.body.contenido==="string"?req.body.contenido.trim():"";if(!content)return res.status(400).json({error:"El mensaje es obligatorio."});return res.status(201).json({message:await repo.postPortalMessage(access,"cliente",content)});}));
router.post("/:token/tareas/:taskId/confirmar",asyncHandler(async(req,res)=>{const access=await repo.resolvePortal(req.params.token);if(!access)return res.status(404).json({error:"El acceso no existe, vencio o fue revocado."});const task=await repo.confirmPortalTask(access,Number(req.params.taskId));return task?res.json({task}):res.status(404).json({error:"Tarea no disponible para confirmar."});}));
router.post("/:token/documentos",upload.single("archivo"),asyncHandler(async(req,res)=>{const access=await repo.resolvePortal(req.params.token);if(!access)return res.status(404).json({error:"El acceso no existe, vencio o fue revocado."});if(!req.file)return res.status(400).json({error:"Seleccione un archivo."});const document=await repo.savePortalUpload(access,req.file,typeof req.body.descripcion==="string"?req.body.descripcion.trim():"");return res.status(201).json({document});}));
router.get("/:token/documentos/:documentId",asyncHandler(async(req,res)=>{const access=await repo.resolvePortal(req.params.token);if(!access)return res.status(404).json({error:"El acceso no existe, vencio o fue revocado."});const document=await repo.getPortalDocument(access,Number(req.params.documentId));if(!document?.ruta_archivo)return res.status(404).json({error:"Documento no disponible."});const resolved=path.resolve(document.ruta_archivo);const relative=path.relative(uploadRoot,resolved);if(relative.startsWith("..")||path.isAbsolute(relative)||!fs.existsSync(resolved))return res.status(404).json({error:"Archivo no disponible."});return res.download(resolved,document.nombre_archivo);}));
function asyncHandler(handler){return(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);}
module.exports=router;
