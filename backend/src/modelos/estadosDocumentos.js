const DOCUMENT_PROCESSING_STATES = Object.freeze({
  ANALYZED: "analizado",
  ERROR: "error",
  PENDING: "pendiente",
  TEXT_EXTRACTED: "texto_extraido",
});

const ALLOWED_DOCUMENT_PROCESSING_STATES = Object.freeze(
  Object.values(DOCUMENT_PROCESSING_STATES)
);

function isValidDocumentProcessingState(value) {
  return ALLOWED_DOCUMENT_PROCESSING_STATES.includes(value);
}

module.exports = {
  ALLOWED_DOCUMENT_PROCESSING_STATES,
  DOCUMENT_PROCESSING_STATES,
  isValidDocumentProcessingState,
};
