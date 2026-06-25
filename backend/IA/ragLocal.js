const STOP_WORDS = new Set([
  "a",
  "al",
  "ante",
  "con",
  "de",
  "del",
  "e",
  "el",
  "en",
  "es",
  "la",
  "las",
  "lo",
  "los",
  "para",
  "por",
  "que",
  "se",
  "sin",
  "su",
  "un",
  "una",
  "y",
]);

function retrieveRelevantChunks(documents, question, topK = 5) {
  const chunks = documents.flatMap((document) => buildChunks(document));
  const queryVector = vectorize(question);

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, vectorize(chunk.text)),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function buildExtractiveAnswer(question, chunks) {
  if (!chunks.length) {
    return {
      answer:
        "No se encontraron fragmentos suficientes en los documentos de la causa para responder con respaldo.",
      confidence: "bajo",
    };
  }

  const selectedSentences = chunks
    .flatMap((chunk) => splitSentences(chunk.text).slice(0, 2))
    .slice(0, 4);

  return {
    answer: selectedSentences.join(" "),
    confidence: chunks[0].score >= 0.35 ? "medio" : "bajo",
    question,
  };
}

function buildChunks(document) {
  const sentences = splitSentences(document.texto_extraido || "");
  const chunks = [];

  for (let index = 0; index < sentences.length; index += 4) {
    const text = sentences.slice(index, index + 4).join(" ");

    if (text.trim()) {
      chunks.push({
        document_id: document.id,
        document_name: document.nombre_archivo,
        chunk_index: chunks.length,
        text,
      });
    }
  }

  return chunks;
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;:])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function vectorize(text) {
  return tokenize(text).reduce((vector, token) => {
    vector[token] = (vector[token] || 0) + 1;
    return vector;
  }, {});
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]{3,}/g)
    ?.filter((token) => !STOP_WORDS.has(token)) || [];
}

function cosineSimilarity(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (!leftKeys.length || !rightKeys.length) {
    return 0;
  }

  const dot = leftKeys.reduce((score, key) => score + (left[key] || 0) * (right[key] || 0), 0);
  const leftNorm = Math.sqrt(leftKeys.reduce((sum, key) => sum + left[key] ** 2, 0));
  const rightNorm = Math.sqrt(rightKeys.reduce((sum, key) => sum + right[key] ** 2, 0));

  return dot / (leftNorm * rightNorm);
}

module.exports = {
  buildExtractiveAnswer,
  retrieveRelevantChunks,
};
