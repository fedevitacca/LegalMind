const DOCUMENT_PROCESSING_STATES = Object.freeze({
  ANALYZED: "analizado",
  ERROR: "error",
  PENDING: "pendiente",
  PROCESSING: "procesando",
  OCR_REQUIRED: "requiere_ocr",
  TEXT_EXTRACTED: "texto_extraido",
});

const DOCUMENT_JOB_STATES = Object.freeze({
  COMPLETED: "completado",
  ERROR: "error",
  OCR_REQUIRED: "requiere_ocr",
  PENDING: "pendiente",
  PROCESSING: "procesando",
});

const ALLOWED_DOCUMENT_PROCESSING_STATES = Object.freeze(
  Object.values(DOCUMENT_PROCESSING_STATES)
);

const ALLOWED_DOCUMENT_JOB_STATES = Object.freeze(
  Object.values(DOCUMENT_JOB_STATES)
);

function isValidDocumentProcessingState(value) {
  return ALLOWED_DOCUMENT_PROCESSING_STATES.includes(value);
}

module.exports = {
  ALLOWED_DOCUMENT_JOB_STATES,
  ALLOWED_DOCUMENT_PROCESSING_STATES,
  DOCUMENT_JOB_STATES,
  DOCUMENT_PROCESSING_STATES,
  isValidDocumentProcessingState,
};
