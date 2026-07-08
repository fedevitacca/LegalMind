const {
  addDefendantToCase,
  createDocument,
  createCase,
  deleteCase,
  deleteDocument,
  deleteDefendantFromCase,
  getDocumentById,
  getCaseById,
  listCases,
  listDocumentsByCase,
  listDefendantsByCase,
  updateCase,
  updateDocument,
  updateDefendantInCase,
} = require("../modelos/repositorioCasos");
const {
  ALLOWED_DOCUMENT_PROCESSING_STATES,
  isValidDocumentProcessingState,
} = require("../modelos/estadosDocumentos");
const fs = require("node:fs/promises");

async function listarCasos(req, res, next) {
  try {
    const cases = await listCases();
    res.json({ cases });
  } catch (error) {
    next(error);
  }
}

async function obtenerCaso(req, res, next) {
  try {
    const id = parseNumericId(req.params.id);
    const legalCase = await getCaseById(id);

    if (!legalCase) {
      return res.status(404).json({ error: "Caso no encontrado." });
    }

    return res.json({ case: legalCase });
  } catch (error) {
    return next(error);
  }
}

async function crearCaso(req, res, next) {
  try {
    const validationError = validateCreateCase(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const legalCase = await createCase(req.body);
    return res.status(201).json({ case: legalCase });
  } catch (error) {
    return next(error);
  }
}

async function actualizarCaso(req, res, next) {
  try {
    const id = parseNumericId(req.params.id, "caso");
    const validationError = validateUpdateCase(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const legalCase = await updateCase(id, req.body);

    if (!legalCase) {
      return res.status(404).json({ error: "Caso no encontrado." });
    }

    return res.json({ case: legalCase });
  } catch (error) {
    return next(error);
  }
}

async function eliminarCaso(req, res, next) {
  try {
    const id = parseNumericId(req.params.id, "caso");
    const result = await deleteCase(id);

    if (!result.deleted) {
      return res.status(404).json({ error: "Caso no encontrado." });
    }

    await Promise.all(result.filePaths.map(removeStoredFile));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listarImputados(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const imputados = await listDefendantsByCase(caseId);
    return res.json({ imputados });
  } catch (error) {
    return next(error);
  }
}

async function agregarImputado(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateDefendant(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const imputado = await addDefendantToCase(caseId, req.body);
    return res.status(201).json({ imputado });
  } catch (error) {
    return next(error);
  }
}

async function actualizarImputado(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const defendantId = parseNumericId(req.params.imputadoId, "imputado");
    const validationError = validateDefendant(req.body, { partial: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const imputado = await updateDefendantInCase(caseId, defendantId, req.body);

    if (!imputado) {
      return res.status(404).json({ error: "Imputado no encontrado para esta causa." });
    }

    return res.json({ imputado });
  } catch (error) {
    return next(error);
  }
}

async function eliminarImputado(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const defendantId = parseNumericId(req.params.imputadoId, "imputado");
    const deleted = await deleteDefendantFromCase(caseId, defendantId);

    if (!deleted) {
      return res.status(404).json({ error: "Imputado no encontrado para esta causa." });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listarDocumentos(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const documentos = await listDocumentsByCase(caseId);
    return res.json({ documentos });
  } catch (error) {
    return next(error);
  }
}

async function agregarDocumento(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateDocument(req.body, req.file);

    if (validationError) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ error: validationError });
    }

    const documento = await createDocument(caseId, {
      ...req.body,
      archivo: req.file,
    });

    return res.status(201).json({ documento });
  } catch (error) {
    await removeUploadedFile(req.file);
    return next(error);
  }
}

async function actualizarDocumento(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const documentId = parseNumericId(req.params.documentoId, "documento");
    const validationError = validateDocument(req.body, null, { partial: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const documento = await updateDocument(caseId, documentId, req.body);

    if (!documento) {
      return res.status(404).json({ error: "Documento no encontrado para esta causa." });
    }

    return res.json({ documento });
  } catch (error) {
    return next(error);
  }
}

async function descargarDocumento(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const documentId = parseNumericId(req.params.documentoId, "documento");
    const documento = await getDocumentById(caseId, documentId);

    if (!documento) {
      return res.status(404).json({ error: "Documento no encontrado para esta causa." });
    }

    if (!documento.ruta_archivo) {
      return res.status(404).json({ error: "El documento no tiene archivo fisico asociado." });
    }

    return res.download(documento.ruta_archivo, documento.nombre_archivo);
  } catch (error) {
    return next(error);
  }
}

async function eliminarDocumento(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const documentId = parseNumericId(req.params.documentoId, "documento");
    const deletedDocument = await deleteDocument(caseId, documentId);

    if (!deletedDocument) {
      return res.status(404).json({ error: "Documento no encontrado para esta causa." });
    }

    await removeStoredFile(deletedDocument.ruta_archivo);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

function parseNumericId(value, entityName = "caso") {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`El id del ${entityName} debe ser numerico.`);
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function validateCreateCase(body) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  if (typeof body.caratula !== "string" || !body.caratula.trim()) {
    return "El campo 'caratula' es obligatorio.";
  }

  if (body.estado && !["activa", "archivada", "cerrada"].includes(body.estado)) {
    return "El campo 'estado' debe ser 'activa', 'archivada' o 'cerrada'.";
  }

  if (body.imputados && !Array.isArray(body.imputados)) {
    return "El campo 'imputados' debe ser una lista.";
  }

  if (body.documentos && !isTextList(body.documentos)) {
    return "El campo 'documentos' debe ser texto o una lista.";
  }

  if (body.jurisprudencia && !isTextList(body.jurisprudencia)) {
    return "El campo 'jurisprudencia' debe ser texto o una lista.";
  }

  return null;
}

function validateUpdateCase(body) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  const allowedFields = ["caratula", "descripcion", "estado", "identificador"];
  const fields = Object.keys(body).filter((field) => allowedFields.includes(field));

  if (!fields.length) {
    return "Debe enviar al menos un campo editable.";
  }

  if ("caratula" in body && (typeof body.caratula !== "string" || !body.caratula.trim())) {
    return "El campo 'caratula' no puede estar vacio.";
  }

  if ("estado" in body && !["activa", "archivada", "cerrada"].includes(body.estado)) {
    return "El campo 'estado' debe ser 'activa', 'archivada' o 'cerrada'.";
  }

  return null;
}

function validateDefendant(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  if (!partial || "nombre" in body) {
    if (typeof body.nombre !== "string" || !body.nombre.trim()) {
      return "El campo 'nombre' del imputado es obligatorio.";
    }
  }

  if (
    "datos_contexto" in body &&
    (typeof body.datos_contexto !== "object" || body.datos_contexto === null)
  ) {
    return "El campo 'datos_contexto' debe ser un objeto.";
  }

  return null;
}

function validateDocument(body, file, { partial = false } = {}) {
  if (!partial && !file && (!body?.nombre_archivo || !body?.texto_extraido)) {
    return "Debe enviar un archivo o nombre_archivo junto con texto_extraido.";
  }

  if ("nombre_archivo" in (body || {})) {
    if (typeof body.nombre_archivo !== "string" || !body.nombre_archivo.trim()) {
      return "El campo 'nombre_archivo' debe ser texto y no puede estar vacio.";
    }
  }

  if ("texto_extraido" in (body || {}) && typeof body.texto_extraido !== "string") {
    return "El campo 'texto_extraido' debe ser texto.";
  }

  if ("estado_procesamiento" in (body || {}) && !body.estado_procesamiento) {
    return "El campo 'estado_procesamiento' no puede estar vacio.";
  }

  if (
    "estado_procesamiento" in (body || {}) &&
    !isValidDocumentProcessingState(body.estado_procesamiento)
  ) {
    return `El campo 'estado_procesamiento' debe ser uno de: ${ALLOWED_DOCUMENT_PROCESSING_STATES.join(", ")}.`;
  }

  if ("tipo_archivo" in (body || {}) && typeof body.tipo_archivo !== "string") {
    return "El campo 'tipo_archivo' debe ser texto.";
  }

  if ("mime_type" in (body || {}) && typeof body.mime_type !== "string") {
    return "El campo 'mime_type' debe ser texto.";
  }

  return null;
}

async function removeUploadedFile(file) {
  if (file?.path) {
    await removeStoredFile(file.path);
  }
}

async function removeStoredFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function isTextList(value) {
  return (
    typeof value === "string" ||
    (Array.isArray(value) &&
      value.every((item) => typeof item === "string" || typeof item === "object"))
  );
}

module.exports = {
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
};
