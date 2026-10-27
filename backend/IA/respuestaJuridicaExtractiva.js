function buildGroundedLegalAnswer({ question, caseChunks = [], legalChunks = [] }) {
  if (!caseChunks.length && !legalChunks.length) {
    return {
      answer: "No se encontró evidencia suficiente en el expediente ni en la biblioteca jurídica nacional y federal.",
      confidence: "bajo",
      requires_human_review: true,
    };
  }

  const sections = [];
  const caseEvidence = selectEvidenceSentences(question, caseChunks, 3);
  const legalEvidence = selectEvidenceSentences(question, legalChunks, 4);
  if (caseEvidence.length) sections.push(`Según el expediente:\n${formatEvidence(caseEvidence)}`);
  if (legalEvidence.length) sections.push(`Marco normativo nacional y federal:\n${formatEvidence(legalEvidence)}`);
  sections.push("Conclusión: la respuesta se limita a los fragmentos citados. Debe verificarse su vigencia y aplicación al caso concreto.");

  return {
    answer: sections.join("\n\n"),
    confidence: caseEvidence.length && legalEvidence.length ? "alto" : "medio",
    requires_human_review: true,
  };
}

function selectEvidenceSentences(question, chunks, limit) {
  const queryTokens = tokens(question);
  return chunks.flatMap((chunk, chunkIndex) => splitSentences(chunk.text).map((sentence) => ({
    sentence,
    chunk,
    chunkIndex,
    relevance: overlap(queryTokens, tokens(sentence)) + (Number(chunk.score) || 0),
  })))
    .filter((item) => item.sentence.length >= 20)
    .sort((left, right) => right.relevance - left.relevance)
    .filter((item, index, items) => items.findIndex((candidate) => normalize(candidate.sentence) === normalize(item.sentence)) === index)
    .slice(0, limit);
}

function formatEvidence(items) {
  return items.map(({ sentence, chunk }) => {
    const article = chunk.metadata?.article ? `, ${chunk.metadata.article}` : "";
    return `- ${sentence} [${chunk.document_name}${article}]`;
  }).join("\n");
}

function splitSentences(value) {
  return String(value || "").replace(/\s+/g, " ").split(/(?<=[.!?;:])\s+/).map((item) => item.trim()).filter(Boolean);
}
function tokens(value) { return new Set(normalize(value).match(/[a-z0-9]{3,}/g) || []); }
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function overlap(left, right) { if (!left.size) return 0; let common = 0; for (const token of left) if (right.has(token)) common += 1; return common / left.size; }

module.exports = { buildGroundedLegalAnswer, selectEvidenceSentences };

