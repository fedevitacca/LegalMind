const express = require("express");
const multer = require("multer");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, requireCaseAccess, requireRole } = require("../autenticacion/autorizacion");
const { enqueueDocumentJob, getDocumentJobs } = require("../modelos/repositorioTrabajosDocumentales");
const { getDocumentById } = require("../modelos/repositorioCasos");

const {
  actualizarCaso,
  actualizarDocumento,
  actualizarImputado,
  agregarDocumento,
  agregarImputado,
  crearCaso,
  descargarDocumento,
  eliminarCaso,
  eliminarDocumento,
  eliminarImputado,
  listarCasos,
  listarDocumentos,
  listarImputados,
  obtenerCaso,
} = require("../controladores/controladorCasos");

const router = express.Router();
const uploadRoot = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
const maxFileSize = Number(process.env.MAX_UPLOAD_SIZE_BYTES || 10 * 1024 * 1024);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const caseId = req.params.id || "sin-caso";
    const destination = path.join(uploadRoot, "causas", String(caseId));
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname || "");
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  limits: {
    fileSize: maxFileSize,
  },
  storage,
});

router.use(requireSession, attachSecurityContext);

router.get("/", listarCasos);
router.post("/", requireRole("abogado"), crearCaso);
router.get("/:id", requireCaseAccess, obtenerCaso);
router.put("/:id", requireCaseAccess, requireRole("abogado"), actualizarCaso);
router.delete("/:id", requireCaseAccess, requireRole("administrador"), eliminarCaso);

router.get("/:id/imputados", requireCaseAccess, listarImputados);
router.post("/:id/imputados", requireCaseAccess, requireRole("asistente"), agregarImputado);
router.put("/:id/imputados/:imputadoId", requireCaseAccess, requireRole("asistente"), actualizarImputado);
router.delete("/:id/imputados/:imputadoId", requireCaseAccess, requireRole("abogado"), eliminarImputado);

router.get("/:id/documentos", requireCaseAccess, listarDocumentos);
router.post("/:id/documentos", requireCaseAccess, requireRole("asistente"), upload.single("archivo"), agregarDocumento);
router.put("/:id/documentos/:documentoId", requireCaseAccess, requireRole("asistente"), actualizarDocumento);
router.get("/:id/documentos/:documentoId/download", requireCaseAccess, descargarDocumento);
router.delete("/:id/documentos/:documentoId", requireCaseAccess, requireRole("abogado"), eliminarDocumento);
router.get("/:id/documentos/:documentoId/procesamiento", requireCaseAccess, async (req,res,next)=>{try{return res.json({jobs:await getDocumentJobs(Number(req.params.documentoId),Number(req.params.id))});}catch(error){return next(error);}});
router.post("/:id/documentos/:documentoId/reintentar", requireCaseAccess, requireRole("asistente"), async (req,res,next)=>{try{const caseId=Number(req.params.id);const documentId=Number(req.params.documentoId);if(!await getDocumentById(caseId,documentId))return res.status(404).json({error:"Documento no encontrado para esta causa."});const job=await enqueueDocumentJob(documentId,caseId,{force:true});return res.status(202).json({job});}catch(error){return next(error);}});
router.post("/:id/documentos/:documentoId/ocr", requireCaseAccess, requireRole("asistente"), async (req,res,next)=>{try{const caseId=Number(req.params.id);const documentId=Number(req.params.documentoId);const document=await getDocumentById(caseId,documentId);if(!document)return res.status(404).json({error:"Documento no encontrado para esta causa."});if(!document.ruta_archivo)return res.status(400).json({error:"El documento no conserva un archivo original para OCR."});const job=await enqueueDocumentJob(documentId,caseId,{force:true,type:"ocr"});return res.status(202).json({job});}catch(error){return next(error);}});

module.exports = router;
