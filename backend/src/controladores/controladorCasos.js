const {
  addDefendantToCase,
  createDateForCase,
  createDeadlineReminder,
  createInternalComparison,
  createDocument,
  createJurisprudenceForCase,
  createCase,
  deleteCase,
  deleteDocument,
  deleteDefendantFromCase,
  getDocumentById,
  getCaseById,
  getCaseRelations,
  linkActionToDefendant,
  linkDocumentToAction,
  linkDocumentToDefendant,
  listActionsByCase,
  listCases,
  listDatesByCase,
  listDeadlinesByOrganization,
  listInternalComparisons,
  listDocumentsByCase,
  listDefendantsByCase,
  listPendingReminders,
  updateCase,
  updateDateForCase,
  updateDocument,
  updateDefendantInCase,
  updateReminderStatus,
} = require("../modelos/repositorioCasos");
const { recordAudit } = require("../autenticacion/autorizacion");
const { JOB_TYPES, enqueueDocumentJob } = require("../modelos/repositorioTrabajosDocumentales");
const {
  ALLOWED_DOCUMENT_PROCESSING_STATES,
  isValidDocumentProcessingState,
} = require("../modelos/estadosDocumentos");
const fs = require("node:fs/promises");
const path = require("node:path");

const uploadRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));

async function listarCasos(req, res, next) {
  try {
    const cases = await listCases(req.security.organizationId, {
      expediente: getOptionalText(req.query.expediente || req.query.q),
    });
    res.json({ cases });
  } catch (error) {
    next(error);
  }
}

async function obtenerCaso(req, res, next) {
  try {
    const id = parseNumericId(req.params.id);
    const legalCase = await getCaseById(id, req.security.organizationId);

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

    const legalCase = await createCase(req.body, req.security);
    await recordAudit(req, { action: "causa.creada", resourceType: "causa", resourceId: legalCase.id });
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

    const legalCase = await updateCase(id, req.body, req.security.organizationId);

    if (!legalCase) {
      return res.status(404).json({ error: "Caso no encontrado." });
    }
    await recordAudit(req, { action: "causa.actualizada", resourceType: "causa", resourceId: id, metadata: { campos: Object.keys(req.body || {}) } });

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
    await recordAudit(req, { action: "causa.eliminada", resourceType: "causa", resourceId: id });
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
    await recordAudit(req, { action: "imputado.creado", resourceType: "imputado", resourceId: imputado.id, metadata: { causa_id: caseId } });
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
    await recordAudit(req, { action: "imputado.actualizado", resourceType: "imputado", resourceId: defendantId, metadata: { causa_id: caseId, campos: Object.keys(req.body || {}) } });

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
    await recordAudit(req, { action: "imputado.eliminado", resourceType: "imputado", resourceId: defendantId, metadata: { causa_id: caseId } });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listarDocumentos(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const filterError = validateDocumentFilters(req.query);

    if (filterError) {
      return res.status(400).json({ error: filterError });
    }

    const documentos = await listDocumentsByCase(caseId, parseDocumentFilters(req.query));
    return res.json({ documentos });
  } catch (error) {
    return next(error);
  }
}

async function listarVencimientos(req, res, next) {
  try {
    const validationError = validateDeadlineFilters(req.query);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const vencimientos = await listDeadlinesByOrganization(
      req.security.organizationId,
      parseDeadlineFilters(req.query, req.user.id)
    );
    return res.json({ vencimientos });
  } catch (error) {
    return next(error);
  }
}

async function listarActuaciones(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const filterError = validateActionFilters(req.query);

    if (filterError) {
      return res.status(400).json({ error: filterError });
    }

    const actuaciones = await listActionsByCase(caseId, parseActionFilters(req.query));
    return res.json({ actuaciones });
  } catch (error) {
    return next(error);
  }
}

async function listarRelaciones(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    return res.json({ relaciones: await getCaseRelations(caseId) });
  } catch (error) {
    return next(error);
  }
}

async function listarFechas(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateDateFilters(req.query);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const fechas = await listDatesByCase(caseId, parseDateFilters(req.query));
    return res.json({ fechas });
  } catch (error) {
    return next(error);
  }
}

async function agregarFecha(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateDatePayload(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const fecha = await createDateForCase(caseId, normalizeDatePayload(req.body));
    await recordAudit(req, { action: "fecha.creada", resourceType: "fecha_relevante", resourceId: fecha.id, metadata: { causa_id: caseId, prioridad: fecha.prioridad } });
    return res.status(201).json({ fecha });
  } catch (error) {
    return next(error);
  }
}

async function actualizarFecha(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const dateId = parseNumericId(req.params.fechaId, "fecha");
    const validationError = validateDatePayload(req.body, { partial: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const fecha = await updateDateForCase(caseId, dateId, normalizeDatePayload(req.body));

    if (!fecha) {
      return res.status(404).json({ error: "Fecha relevante no encontrada para esta causa." });
    }

    await recordAudit(req, { action: "fecha.actualizada", resourceType: "fecha_relevante", resourceId: dateId, metadata: { causa_id: caseId, campos: Object.keys(req.body || {}) } });
    return res.json({ fecha });
  } catch (error) {
    return next(error);
  }
}

async function crearRecordatorio(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateReminderPayload(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const recordatorio = await createDeadlineReminder(caseId, normalizeReminderPayload(req.body));

    if (!recordatorio) {
      return res.status(404).json({ error: "Fecha relevante no encontrada para esta causa." });
    }

    await recordAudit(req, { action: "recordatorio.creado", resourceType: "recordatorio_vencimiento", resourceId: recordatorio.id, metadata: { causa_id: caseId, fecha_relevante_id: recordatorio.fecha_relevante_id } });
    return res.status(201).json({ recordatorio });
  } catch (error) {
    return next(error);
  }
}

async function listarRecordatorios(req, res, next) {
  try {
    const validationError = validateReminderFilters(req.query);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const recordatorios = await listPendingReminders(
      req.security.organizationId,
      parseReminderFilters(req.query)
    );
    return res.json({ recordatorios });
  } catch (error) {
    return next(error);
  }
}

async function actualizarRecordatorio(req, res, next) {
  try {
    const reminderId = parseNumericId(req.params.recordatorioId, "recordatorio");
    const validationError = validateReminderStatusPayload(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const recordatorio = await updateReminderStatus(req.security.organizationId, reminderId, req.body);

    if (!recordatorio) {
      return res.status(404).json({ error: "Recordatorio no encontrado." });
    }

    await recordAudit(req, { action: "recordatorio.actualizado", resourceType: "recordatorio_vencimiento", resourceId: reminderId, metadata: { estado: req.body.estado } });
    return res.json({ recordatorio });
  } catch (error) {
    return next(error);
  }
}

async function vincularDocumentoImputado(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateDocumentDefendantLink(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const relacion = await linkDocumentToDefendant(caseId, req.body);

    if (!relacion) {
      return res.status(404).json({ error: "Documento o imputado no encontrado para esta causa." });
    }

    await recordAudit(req, { action: "relacion.documento_imputado", resourceType: "relacion", metadata: { causa_id: caseId, documento_id: req.body.documento_id, imputado_id: req.body.imputado_id } });
    return res.status(201).json({ relacion });
  } catch (error) {
    return next(error);
  }
}

async function vincularActuacionImputado(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateActionDefendantLink(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const relacion = await linkActionToDefendant(caseId, req.body);

    if (!relacion) {
      return res.status(404).json({ error: "Actuacion o imputado no encontrado para esta causa." });
    }

    await recordAudit(req, { action: "relacion.actuacion_imputado", resourceType: "relacion", metadata: { causa_id: caseId, actuacion_id: req.body.actuacion_id, imputado_id: req.body.imputado_id } });
    return res.status(201).json({ relacion });
  } catch (error) {
    return next(error);
  }
}

async function vincularDocumentoActuacion(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateDocumentActionLink(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const relacion = await linkDocumentToAction(caseId, req.body);

    if (!relacion) {
      return res.status(404).json({ error: "Documento o actuacion no encontrada para esta causa." });
    }

    await recordAudit(req, { action: "relacion.documento_actuacion", resourceType: "relacion", metadata: { causa_id: caseId, documento_id: req.body.documento_id, actuacion_id: req.body.actuacion_id } });
    return res.status(201).json({ relacion });
  } catch (error) {
    return next(error);
  }
}

async function listarComparacionesInternas(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateComparisonFilters(req.query);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const comparaciones = await listInternalComparisons(caseId, parseComparisonFilters(req.query));
    return res.json({ comparaciones });
  } catch (error) {
    return next(error);
  }
}

async function prepararComparacionInterna(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateInternalComparison(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const comparacion = await createInternalComparison(caseId, normalizeComparisonPayload(req.body));
    await recordAudit(req, { action: "comparacion.preparada", resourceType: "comparacion_interna", resourceId: comparacion.id, metadata: { causa_id: caseId, tipo: comparacion.tipo } });
    return res.status(201).json({ comparacion });
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
    if (documento.estado === "pendiente") {
      await enqueueDocumentJob(documento.id, caseId, {
        type: req.file?.mimetype?.startsWith("image/")
          ? JOB_TYPES.OCR
          : JOB_TYPES.EXTRACT_TEXT,
      });
    }
    await recordAudit(req, { action: "documento.creado", resourceType: "documento", resourceId: documento.id, metadata: { causa_id: caseId, mime_type: documento.mime_type, tamano_bytes: documento.tamano_bytes } });

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
    await recordAudit(req, { action: "documento.actualizado", resourceType: "documento", resourceId: documentId, metadata: { causa_id: caseId, campos: Object.keys(req.body || {}) } });

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
    const safePath = resolveSafeStoredFilePath(documento.ruta_archivo);

    if (!safePath) {
      await recordAudit(req, { action: "documento.descarga_bloqueada", resourceType: "documento", resourceId: documentId, metadata: { causa_id: caseId, motivo: "ruta_fuera_de_uploads" }, risk: "alto" });
      return res.status(403).json({ error: "La ruta del archivo no es segura." });
    }

    await fs.access(safePath);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    await recordAudit(req, { action: "documento.descargado", resourceType: "documento", resourceId: documentId, metadata: { causa_id: caseId }, risk: "sensible" });

    return res.download(safePath, documento.nombre_archivo);
  } catch (error) {
    return next(error);
  }
}

async function agregarJurisprudencia(req, res, next) {
  try {
    const caseId = parseNumericId(req.params.id, "caso");
    const validationError = validateJurisprudencePayload(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const jurisprudencia = await createJurisprudenceForCase(
      caseId,
      normalizeJurisprudencePayload(req.body),
    );
    await recordAudit(req, {
      action: "jurisprudencia.creada",
      resourceType: "jurisprudencia",
      resourceId: jurisprudencia.id,
      metadata: { causa_id: caseId },
    });
    return res.status(201).json({ jurisprudencia });
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
    await recordAudit(req, { action: "documento.eliminado", resourceType: "documento", resourceId: documentId, metadata: { causa_id: caseId } });
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

  if ("estado_procesamiento" in (body || {}) && !String(body.estado_procesamiento).trim()) {
    return "El campo 'estado_procesamiento' no puede estar vacio.";
  }

  if (
    "estado_procesamiento" in (body || {}) &&
    !isValidDocumentProcessingState(String(body.estado_procesamiento).trim())
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

function validateDocumentFilters(query = {}) {
  return validateOptionalNumericQuery(query.imputado_id, "imputado_id");
}

function validateActionFilters(query = {}) {
  return (
    validateOptionalNumericQuery(query.imputado_id, "imputado_id") ||
    validateOptionalNumericQuery(query.documento_id, "documento_id")
  );
}

function validateComparisonFilters(query = {}) {
  if (query.tipo && !["documentos", "actuaciones", "mixta"].includes(query.tipo)) {
    return "El filtro 'tipo' debe ser 'documentos', 'actuaciones' o 'mixta'.";
  }

  return validateOptionalNumericQuery(query.imputado_id, "imputado_id");
}

function validateDocumentDefendantLink(body) {
  return (
    validateRequiredNumericBody(body, "documento_id") ||
    validateRequiredNumericBody(body, "imputado_id") ||
    validateOptionalTextBody(body, "tipo_relacion") ||
    validateOptionalTextBody(body, "evidencia")
  );
}

function validateActionDefendantLink(body) {
  return (
    validateRequiredNumericBody(body, "actuacion_id") ||
    validateRequiredNumericBody(body, "imputado_id") ||
    validateOptionalTextBody(body, "tipo_relacion") ||
    validateOptionalTextBody(body, "evidencia")
  );
}

function validateDocumentActionLink(body) {
  return (
    validateRequiredNumericBody(body, "documento_id") ||
    validateRequiredNumericBody(body, "actuacion_id") ||
    validateOptionalTextBody(body, "tipo_relacion") ||
    validateOptionalTextBody(body, "evidencia")
  );
}

function validateInternalComparison(body) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  const type = normalizeComparisonType(body.tipo, body.origen_tipo, body.destino_tipo);

  if (!["documentos", "actuaciones", "mixta"].includes(type)) {
    return "El campo 'tipo' debe ser 'documentos', 'actuaciones' o 'mixta'.";
  }

  if (!["documento", "actuacion"].includes(body.origen_tipo)) {
    return "El campo 'origen_tipo' debe ser 'documento' o 'actuacion'.";
  }

  if (!["documento", "actuacion"].includes(body.destino_tipo)) {
    return "El campo 'destino_tipo' debe ser 'documento' o 'actuacion'.";
  }

  return (
    validateRequiredNumericBody(body, "origen_id") ||
    validateRequiredNumericBody(body, "destino_id") ||
    validateOptionalNumericQuery(body.imputado_id, "imputado_id") ||
    validateOptionalTextBody(body, "criterio")
  );
}

function parseDocumentFilters(query) {
  return {
    categoria: getOptionalText(query.categoria),
    estado: getOptionalText(query.estado),
    expediente: getOptionalText(query.expediente),
    imputadoId: parseOptionalNumericId(query.imputado_id),
    q: getOptionalText(query.q),
  };
}

function parseActionFilters(query) {
  return {
    documentoId: parseOptionalNumericId(query.documento_id),
    estado: getOptionalText(query.estado),
    fuente: getOptionalText(query.fuente),
    imputadoId: parseOptionalNumericId(query.imputado_id),
    q: getOptionalText(query.q),
  };
}

function parseComparisonFilters(query) {
  return {
    imputadoId: parseOptionalNumericId(query.imputado_id),
    tipo: getOptionalText(query.tipo),
  };
}

function parseDeadlineFilters(query, userId) {
  const mineOnly = query.mias === "true" || query.mias === true;

  return {
    desde: getOptionalText(query.desde),
    estado: getOptionalText(query.estado),
    hasta: getOptionalText(query.hasta),
    limit: parseOptionalNumericId(query.limit) || 100,
    responsableUserId: mineOnly ? userId : getOptionalText(query.responsable_user_id),
  };
}

function parseDateFilters(query) {
  return {
    estado: getOptionalText(query.estado),
    tipo: getOptionalText(query.tipo),
  };
}

function parseReminderFilters(query) {
  return {
    estado: getOptionalText(query.estado),
    hasta: getOptionalText(query.hasta),
    limit: parseOptionalNumericId(query.limit) || 100,
  };
}

function normalizeComparisonPayload(body) {
  return {
    criterio: getOptionalText(body.criterio) || "comparacion_interna",
    destino_id: Number(body.destino_id),
    destino_tipo: body.destino_tipo,
    imputado_id: parseOptionalNumericId(body.imputado_id),
    metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
    origen_id: Number(body.origen_id),
    origen_tipo: body.origen_tipo,
    tipo: normalizeComparisonType(body.tipo, body.origen_tipo, body.destino_tipo),
  };
}

function normalizeDatePayload(body) {
  const normalized = {};

  for (const field of [
    "estado",
    "evento",
    "fecha",
    "fecha_texto",
    "prioridad",
    "recordatorio_at",
    "responsable_user_id",
    "tipo",
  ]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      normalized[field] = getOptionalText(body[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "metadata")) {
    normalized.metadata = body.metadata;
  }

  if (Object.prototype.hasOwnProperty.call(body, "requiere_alerta")) {
    normalized.requiere_alerta = Boolean(body.requiere_alerta);
  }

  return normalized;
}

function normalizeReminderPayload(body) {
  return {
    canal: getOptionalText(body.canal) || "app",
    destinatario_user_id: getOptionalText(body.destinatario_user_id),
    fecha_relevante_id: Number(body.fecha_relevante_id),
    mensaje: body.mensaje.trim(),
    metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
    programado_para: body.programado_para,
    titulo: body.titulo.trim(),
  };
}

function normalizeJurisprudencePayload(body) {
  return {
    anio: getOptionalText(body.anio),
    referencia: getOptionalText(body.referencia),
    resumen: getOptionalText(body.resumen),
    titulo: getOptionalText(body.titulo),
    tribunal: getOptionalText(body.tribunal),
  };
}

function normalizeComparisonType(type, originType, targetType) {
  if (type) {
    return type;
  }

  if (originType === "documento" && targetType === "documento") {
    return "documentos";
  }

  if (originType === "actuacion" && targetType === "actuacion") {
    return "actuaciones";
  }

  return "mixta";
}

function validateRequiredNumericBody(body, field) {
  if (!body || !Number.isInteger(Number(body[field])) || Number(body[field]) <= 0) {
    return `El campo '${field}' debe ser numerico.`;
  }

  return null;
}

function validateRequiredTextBody(body, field) {
  if (typeof body?.[field] !== "string" || !body[field].trim()) {
    return `El campo '${field}' es obligatorio.`;
  }

  return null;
}

function validateRequiredDateTimeBody(body, field) {
  if (typeof body?.[field] !== "string" || Number.isNaN(Date.parse(body[field]))) {
    return `El campo '${field}' debe ser una fecha valida.`;
  }

  return null;
}

function validateDeadlineFilters(query = {}) {
  return (
    validateOptionalDateQuery(query.desde, "desde") ||
    validateOptionalDateQuery(query.hasta, "hasta") ||
    validateOptionalDeadlineState(query.estado) ||
    validateOptionalNumericQuery(query.limit, "limit")
  );
}

function validateDateFilters(query = {}) {
  return validateOptionalDeadlineState(query.estado);
}

function validateDatePayload(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  if (!partial && !body.fecha && !body.fecha_texto) {
    return "Debe enviar 'fecha' o 'fecha_texto'.";
  }

  if ("fecha" in body && body.fecha && !isValidIsoDate(body.fecha)) {
    return "El campo 'fecha' debe tener formato YYYY-MM-DD.";
  }

  if ("fecha_texto" in body && body.fecha_texto && typeof body.fecha_texto !== "string") {
    return "El campo 'fecha_texto' debe ser texto.";
  }

  if (!partial || "evento" in body) {
    if (typeof body.evento !== "string" || !body.evento.trim()) {
      return "El campo 'evento' es obligatorio.";
    }
  }

  if ("estado" in body && !["pendiente", "en_seguimiento", "completada", "cancelada"].includes(body.estado)) {
    return "El campo 'estado' debe ser 'pendiente', 'en_seguimiento', 'completada' o 'cancelada'.";
  }

  if ("prioridad" in body && !["baja", "media", "alta", "urgente"].includes(body.prioridad)) {
    return "El campo 'prioridad' debe ser 'baja', 'media', 'alta' o 'urgente'.";
  }

  if ("responsable_user_id" in body && body.responsable_user_id && typeof body.responsable_user_id !== "string") {
    return "El campo 'responsable_user_id' debe ser texto.";
  }

  if ("recordatorio_at" in body && body.recordatorio_at && Number.isNaN(Date.parse(body.recordatorio_at))) {
    return "El campo 'recordatorio_at' debe ser una fecha valida.";
  }

  if ("metadata" in body && (typeof body.metadata !== "object" || body.metadata === null || Array.isArray(body.metadata))) {
    return "El campo 'metadata' debe ser un objeto.";
  }

  return null;
}

function validateReminderPayload(body) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  if (body.canal && !["app", "email"].includes(body.canal)) {
    return "El campo 'canal' debe ser 'app' o 'email'.";
  }

  if (body.canal === "email" && !body.destinatario_user_id) {
    return "Un recordatorio por email requiere 'destinatario_user_id'.";
  }

  return (
    validateRequiredNumericBody(body, "fecha_relevante_id") ||
    validateRequiredTextBody(body, "titulo") ||
    validateRequiredTextBody(body, "mensaje") ||
    validateRequiredDateTimeBody(body, "programado_para") ||
    validateOptionalTextBody(body, "destinatario_user_id") ||
    validateOptionalTextBody(body, "canal")
  );
}

function validateReminderFilters(query = {}) {
  if (query.estado && !["pendiente", "enviado", "leido", "cancelado", "error"].includes(query.estado)) {
    return "El filtro 'estado' no es valido.";
  }

  return (
    validateOptionalDateTimeQuery(query.hasta, "hasta") ||
    validateOptionalNumericQuery(query.limit, "limit")
  );
}

function validateReminderStatusPayload(body) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  if (!["pendiente", "enviado", "leido", "cancelado", "error"].includes(body.estado)) {
    return "El campo 'estado' debe ser 'pendiente', 'enviado', 'leido', 'cancelado' o 'error'.";
  }

  return validateOptionalTextBody(body, "error_detalle");
}

function validateJurisprudencePayload(body) {
  if (!getOptionalText(body.titulo)) {
    return "El campo 'titulo' es obligatorio.";
  }

  if (body.anio !== undefined && body.anio !== null && body.anio !== "") {
    const year = Number(body.anio);
    if (!Number.isInteger(year) || year < 1800 || year > 2200) {
      return "El campo 'anio' debe ser un anio valido.";
    }
  }

  return null;
}

function validateOptionalNumericQuery(value, field) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return `El campo '${field}' debe ser numerico.`;
  }

  return null;
}

function validateOptionalDateQuery(value, field) {
  if (!value) {
    return null;
  }

  if (!isValidIsoDate(value)) {
    return `El campo '${field}' debe tener formato YYYY-MM-DD.`;
  }

  return null;
}

function validateOptionalDateTimeQuery(value, field) {
  if (!value) {
    return null;
  }

  if (Number.isNaN(Date.parse(value))) {
    return `El campo '${field}' debe ser una fecha valida.`;
  }

  return null;
}

function validateOptionalDeadlineState(value) {
  if (!value) {
    return null;
  }

  if (!["pendiente", "en_seguimiento", "completada", "cancelada"].includes(value)) {
    return "El filtro 'estado' no es valido.";
  }

  return null;
}

function validateOptionalTextBody(body, field) {
  if (!(field in (body || {}))) {
    return null;
  }

  if (typeof body[field] !== "string") {
    return `El campo '${field}' debe ser texto.`;
  }

  return null;
}

function parseOptionalNumericId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getOptionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isValidIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function resolveSafeStoredFilePath(filePath) {
  const resolved = path.resolve(filePath);
  const relative = path.relative(uploadRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
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
  actualizarFecha,
  actualizarImputado,
  actualizarRecordatorio,
  agregarDocumento,
  agregarFecha,
  agregarImputado,
  agregarJurisprudencia,
  crearRecordatorio,
  crearCaso,
  descargarDocumento,
  eliminarCaso,
  eliminarDocumento,
  eliminarImputado,
  listarActuaciones,
  listarCasos,
  listarComparacionesInternas,
  listarDocumentos,
  listarFechas,
  listarImputados,
  listarRecordatorios,
  listarRelaciones,
  listarVencimientos,
  obtenerCaso,
  prepararComparacionInterna,
  vincularActuacionImputado,
  vincularDocumentoActuacion,
  vincularDocumentoImputado,
};
