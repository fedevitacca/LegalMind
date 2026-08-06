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
  if (!chunks.length) return [];
  const queryTokens = tokenize(question);
  const documentTokens = chunks.map((chunk) => tokenize(chunk.text));
  const averageLength = documentTokens.reduce((sum, tokens) => sum + tokens.length, 0) / chunks.length;
  const scored = chunks.map((chunk, index) => {
    const lexical = bm25(queryTokens, documentTokens[index], documentTokens, averageLength);
    const semantic = trigramSimilarity(question, chunk.text);
    return { ...chunk, lexical_score: lexical, semantic_score: semantic, score: lexical * 0.65 + semantic * 0.35 };
  }).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score);

  // Maximal Marginal Relevance evita devolver fragmentos casi duplicados.
  const selected = [];
  while (selected.length < Math.max(1, topK) && scored.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    scored.forEach((candidate, index) => {
      const redundancy = selected.length ? Math.max(...selected.map((item) => trigramSimilarity(candidate.text, item.text))) : 0;
      const mmr = 0.78 * candidate.score - 0.22 * redundancy;
      if (mmr > bestScore) { bestScore = mmr; bestIndex = index; }
    });
    selected.push({ ...scored.splice(bestIndex, 1)[0], mmr_score: Math.max(0, bestScore) });
  }
  const max = Math.max(...selected.map((item) => item.score), 1);
  return selected.map((item) => ({ ...item, score: Math.min(1, item.score / max) }));
}

function bm25(query, document, corpus, averageLength, k1 = 1.5, b = 0.75) {
  if (!query.length || !document.length) return 0;
  return [...new Set(query)].reduce((score, term) => {
    const frequency = document.filter((token) => token === term).length;
    if (!frequency) return score;
    const containing = corpus.filter((tokens) => tokens.includes(term)).length;
    const idf = Math.log(1 + (corpus.length - containing + 0.5) / (containing + 0.5));
    return score + idf * (frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * document.length / Math.max(averageLength, 1)));
  }, 0);
}

function trigramSimilarity(left, right) {
  const build = (value) => new Set(`  ${normalizeWhitespace(value).toLowerCase()}  `.match(/.{1,3}/g) || []);
  const a = build(left); const b = build(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return (2 * intersection) / (a.size + b.size);
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

function extractSimpleCaseData(text) {
  const normalizedText = normalizeWhitespace(text);
  const defendants = extractPeopleByRole(normalizedText, [
    "imputado",
    "imputada",
    "procesado",
    "procesada",
    "acusado",
    "acusada",
  ]);
  const victims = extractPeopleByRole(normalizedText, [
    "victima",
    "damnificado",
    "damnificada",
  ]);
  const dates = extractDates(normalizedText);
  const hearings = findSentencesByKeywords(normalizedText, ["audiencia", "indagatoria", "debate"]);
  const deadlines = findSentencesByKeywords(normalizedText, ["vencimiento", "plazo", "debera presentar", "hasta el"]);

  return {
    numero_causa: firstMatch(normalizedText, [
      /\b(?:causa|expediente|legajo)\s*(?:n(?:ro|o|um|\.|º)?\.?|numero)?\s*[:#-]?\s*([A-Z]?\s*\d{1,8}(?:[/-]\d{2,4})?)/i,
      /\b(?:n(?:ro|o|um|\.|º)?\.?|numero)\s*[:#-]?\s*([A-Z]?\s*\d{1,8}(?:[/-]\d{2,4})?)/i,
    ]),
    caratula: firstMatch(normalizedText, [
      /\bcaratula\s*[:#-]\s*([^.\n;]+)/i,
      /\bautos\s*[:#-]\s*([^.\n;]+)/i,
    ]),
    tribunal: firstMatch(normalizedText, [
      /\b((?:juzgado|tribunal|camara|fiscalia|unidad fiscal|secretaria)\s+[^.\n;]+)/i,
    ]),
    cantidad_imputados: defendants.length,
    imputados: defendants,
    victimas: victims,
    delitos: extractCrimes(normalizedText),
    fechas_relevantes: dates,
    audiencias_o_actos: hearings,
    vencimientos_o_plazos: deadlines,
    documentos_mencionados: extractMentionedDocuments(normalizedText),
    confianza: buildSimpleExtractionConfidence({
      dates,
      defendants,
      normalizedText,
    }),
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

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return null;
}

function extractPeopleByRole(text, roles) {
  const rolePattern = roles.join("|");
  const patterns = [
    new RegExp(`\\b(?:${rolePattern})\\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,3})`, "gi"),
    new RegExp(`\\b([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){1,3})\\s*,?\\s*(?:${rolePattern})\\b`, "gi"),
  ];

  return uniqueValues(patterns.flatMap((pattern) => collectMatches(text, pattern)))
    .map(cleanPersonName)
    .filter(Boolean);
}

function extractDates(text) {
  const numericDates = collectMatches(text, /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g);
  const namedDates = collectMatches(
    text,
    /\b(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})\b/gi
  );

  return uniqueValues([...numericDates, ...namedDates]);
}

function extractCrimes(text) {
  return uniqueValues(collectMatches(
    text,
    /\b(?:delito de|por|por el delito de|se le atribuye el delito de)\s+([a-záéíóúñ ]{4,60}?)(?:\.|,|;|\s+y\s+|\s+en\s+)/gi
  )).map(cleanValue);
}

function extractMentionedDocuments(text) {
  return uniqueValues(collectMatches(
    text,
    /\b((?:informe|acta|pericia|oficio|declaracion|resolucion|sentencia|requerimiento|dictamen)[^.;]{0,80})/gi
  )).map(cleanValue);
}

function findSentencesByKeywords(text, keywords) {
  return splitSentences(text).filter((sentence) =>
    keywords.some((keyword) => sentence.toLowerCase().includes(keyword))
  );
}

function collectMatches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]).filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.map(cleanValue).filter(Boolean))];
}

function cleanValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\s-]+|[,;:\s-]+$/g, "")
    .trim();
}

function cleanPersonName(value) {
  const namePrefix = cleanValue(value).split(/\b(?:declaro|declaró|fue|debera|deberá|debe|comparecio|compareció|cito|citó)\b/i)[0];
  const stopWords = new Set([
    "citada",
    "citado",
    "debe",
    "debera",
    "fue",
    "imputada",
    "imputado",
    "la",
    "le",
    "el",
    "se",
  ]);
  const words = namePrefix
    .split(" ")
    .filter((word) => !stopWords.has(word.toLowerCase()));

  return cleanValue(words.join(" "));
}

function buildSimpleExtractionConfidence({ dates, defendants, normalizedText }) {
  const signals = [
    /\b(?:causa|expediente|legajo)\b/i.test(normalizedText),
    /\b(?:juzgado|tribunal|camara|fiscalia)\b/i.test(normalizedText),
    defendants.length > 0,
    dates.length > 0,
  ].filter(Boolean).length;

  if (signals >= 3) {
    return "medio";
  }

  if (signals >= 1) {
    return "bajo";
  }

  return "muy_bajo";
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
  extractSimpleCaseData,
  retrieveRelevantChunks,
};
