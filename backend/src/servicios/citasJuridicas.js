const crypto = require("node:crypto");

function buildLegalCitations(chunks = [], { caseId } = {}) {
  return chunks.map((chunk, index) => {
    const documentId = String(chunk.document_id ?? chunk.documento_id ?? "fuente");
    const fragmentOrder = Number(chunk.chunk_index ?? chunk.orden ?? index);
    const page = positiveInteger(chunk.page ?? chunk.pagina);
    const text = String(chunk.text ?? chunk.texto ?? "").trim();
    const score = clampScore(chunk.score);
    const fingerprint = crypto.createHash("sha256")
      .update(`${documentId}:${page || 0}:${fragmentOrder}:${text}`)
      .digest("hex").slice(0, 16);
    return {
      citation_id: `CIT-${fingerprint}`,
      document_id: documentId,
      document_name: String(chunk.document_name ?? chunk.nombre_archivo ?? `Documento ${documentId}`),
      page,
      fragment_index: fragmentOrder,
      chunk_index: fragmentOrder,
      text,
      score,
      lexical_score: optionalScore(chunk.lexical_score),
      semantic_score: optionalScore(chunk.semantic_score ?? chunk.embedding_score),
      characters_start: nullableNumber(chunk.caracteres_inicio ?? chunk.start),
      characters_end: nullableNumber(chunk.caracteres_fin ?? chunk.end),
      section: chunk.metadata?.section ?? chunk.metadata_json?.section ?? null,
      location_label: page ? `Página ${page} · fragmento ${fragmentOrder + 1}` : `Fragmento ${fragmentOrder + 1}`,
      document_url: caseId && /^\d+$/.test(documentId)
        ? `/casos/${caseId}/documentos?documento=${documentId}${page ? `&pagina=${page}` : ""}`
        : null,
    };
  });
}

function assessEvidence(citations) {
  const usable = citations.filter((citation) => citation.text.length >= 20 && citation.score >= 0.15);
  const average = usable.length ? usable.reduce((sum, citation) => sum + citation.score, 0) / usable.length : 0;
  return {
    status: usable.length >= 2 && average >= 0.35 ? "respaldado" : usable.length ? "parcial" : "sin_respaldo",
    requires_human_review: usable.length < 2 || average < 0.35,
    citations_count: citations.length,
    usable_citations: usable.length,
    average_score: Number(average.toFixed(4)),
  };
}

function clampScore(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function optionalScore(value) { return value == null ? null : clampScore(value); }
function positiveInteger(value) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : null; }
function nullableNumber(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }

module.exports = { assessEvidence, buildLegalCitations };
