const express = require("express");
const multer = require("multer");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");

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

router.get("/", listarCasos);
router.post("/", crearCaso);
router.get("/:id", obtenerCaso);
router.put("/:id", actualizarCaso);
router.delete("/:id", eliminarCaso);

router.get("/:id/imputados", listarImputados);
router.post("/:id/imputados", agregarImputado);
router.put("/:id/imputados/:imputadoId", actualizarImputado);
router.delete("/:id/imputados/:imputadoId", eliminarImputado);

router.get("/:id/documentos", listarDocumentos);
router.post("/:id/documentos", upload.single("archivo"), agregarDocumento);
router.put("/:id/documentos/:documentoId", actualizarDocumento);
router.get("/:id/documentos/:documentoId/download", descargarDocumento);
router.delete("/:id/documentos/:documentoId", eliminarDocumento);

module.exports = router;
