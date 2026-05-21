const KEYWORD_CATEGORIES = [
  {
    name: "imputacion",
    keywords: ["imputado", "imputada", "imputacion", "acusado", "acusada", "procesado"],
  },
  {
    name: "prueba",
    keywords: ["prueba", "testigo", "pericia", "informe", "documentacion", "allanamiento"],
  },
  {
    name: "actuacion_procesal",
    keywords: ["audiencia", "resolucion", "presentacion", "recurso", "apelacion", "indagatoria"],
  },
  {
    name: "fechas_y_vencimientos",
    keywords: ["fecha", "vencimiento", "plazo", "notificacion", "termino"],
  },
  {
    name: "detencion_y_medidas",
    keywords: ["detencion", "prision", "excarcelacion", "morigeracion", "cautelar"],
  },
];

const DATE_PATTERNS = [
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}\b/gi,
];

function analyzeLegalText(text) {
  const cleanText = normalizeText(text);

  if (!cleanText) {
    return {
      resumen: "No se recibio texto para analizar.",
      tipo_documento: "desconocido",
      causa: {
        datos_generales: [],
        hechos_relevantes: [],
      },
      imputados: [],
      fechas_relevantes: [],
      categorias: [],
      actuaciones_pendientes: [],
      observaciones: ["El analisis requiere un texto de entrada."],
      nivel_confianza: "bajo",
    };
  }

  const sentences = splitSentences(cleanText);
  const categories = detectCategories(cleanText);
  const dates = extractDates(cleanText, sentences);
  const people = extractPossiblePeople(cleanText);
  const defendants = extractDefendants(cleanText, people, sentences);
  const pendingActions = extractPendingActions(sentences);
  const relevantFacts = extractRelevantFacts(sentences);

  return {
    resumen: buildSummary(sentences),
    tipo_documento: detectDocumentType(cleanText),
    causa: {
      datos_generales: extractGeneralData(cleanText),
      hechos_relevantes: relevantFacts,
    },
    imputados: defendants,
    fechas_relevantes: dates,
    categorias: categories,
    actuaciones_pendientes: pendingActions,
    observaciones: buildObservations(defendants, dates),
    nivel_confianza: calculateConfidence(cleanText, defendants, dates, categories),
  };
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildSummary(sentences) {
  if (sentences.length === 0) {
    return "";
  }

  const selected = sentences
    .filter((sentence) => sentence.length > 35)
    .slice(0, 3);

  return (selected.length > 0 ? selected : sentences.slice(0, 2)).join(" ");
}

function detectDocumentType(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("resuelve") || lowerText.includes("resolucion")) {
    return "resolucion";
  }

  if (lowerText.includes("informe")) {
    return "informe";
  }

  if (lowerText.includes("audiencia")) {
    return "acta_de_audiencia";
  }

  if (lowerText.includes("recurso") || lowerText.includes("apelacion")) {
    return "presentacion_o_recurso";
  }

  if (lowerText.includes("indagatoria")) {
    return "declaracion_indagatoria";
  }

  return "documento_juridico";
}

function detectCategories(text) {
  const lowerText = text.toLowerCase();

  return KEYWORD_CATEGORIES
    .filter((category) => category.keywords.some((keyword) => lowerText.includes(keyword)))
    .map((category) => category.name);
}

function extractDates(text, sentences) {
  const rawDates = DATE_PATTERNS.flatMap((pattern) => text.match(pattern) || []);
  const uniqueDates = [...new Set(rawDates)];

  return uniqueDates.map((date) => {
    const eventSentence = sentences.find((sentence) => sentence.includes(date)) || "";
    const lowerEvent = eventSentence.toLowerCase();

    return {
      fecha: date,
      evento: eventSentence,
      tipo: lowerEvent.includes("venc") || lowerEvent.includes("plazo") ? "vencimiento" : "fecha_mencionada",
      requiere_alerta: lowerEvent.includes("venc") || lowerEvent.includes("plazo") || lowerEvent.includes("audiencia"),
    };
  });
}

function extractPossiblePeople(text) {
  const matches = text.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b/g) || [];
  const ignored = new Set(["LegalMind", "Defensoria Federal", "Codigo Penal"]);

  return [...new Set(matches)]
    .filter((name) => !ignored.has(name))
    .slice(0, 12);
}

function extractDefendants(text, people, sentences) {
  const lowerText = text.toLowerCase();
  const explicitDefendants = people.filter((person) => {
    const lowerPerson = person.toLowerCase();
    const index = lowerText.indexOf(lowerPerson);
    const context = lowerText.slice(Math.max(0, index - 80), index + lowerPerson.length + 80);

    return /imputad|acusad|procesad|detenid/.test(context);
  });

  return explicitDefendants.map((name) => {
    const linkedSentences = sentences.filter((sentence) => sentence.includes(name));

    return {
      nombre: name,
      datos_asociados: linkedSentences.slice(0, 3),
      imputaciones: linkedSentences.filter((sentence) => /imput|acus|hecho|delito/i.test(sentence)),
      hechos_vinculados: linkedSentences.filter((sentence) => /ocurr|habria|hecho|particip/i.test(sentence)),
      documentos_mencionados: linkedSentences.filter((sentence) => /informe|acta|resolucion|documento|escrito/i.test(sentence)),
    };
  });
}

function extractGeneralData(text) {
  const data = [];
  const caseNumber = text.match(
    /\b(?:causa|expediente|expte\.?|legajo)\s*(?:nro\.?|numero|n[°o])?\s*[:#-]?\s*([\w/-]+)/i
  );

  if (caseNumber) {
    data.push(`Identificador de causa o expediente: ${caseNumber[1]}`);
  }

  return data;
}

function extractRelevantFacts(sentences) {
  return sentences
    .filter((sentence) => /hecho|ocurr|investig|imput|acus|delito|audiencia|resolucion|informe/i.test(sentence))
    .slice(0, 8);
}

function extractPendingActions(sentences) {
  return sentences
    .filter((sentence) => /pendiente|debera|debe|vencimiento|plazo|presentar|acompanar|audiencia/i.test(sentence))
    .slice(0, 6);
}

function buildObservations(defendants, dates) {
  const observations = [];

  if (defendants.length === 0) {
    observations.push("No se detectaron imputados de forma explicita. Puede requerir revision manual.");
  }

  if (dates.length === 0) {
    observations.push("No se detectaron fechas en formatos comunes.");
  }

  observations.push("Analisis inicial generado por reglas locales. Debe ser validado por un usuario.");

  return observations;
}

function calculateConfidence(text, defendants, dates, categories) {
  let score = 0;

  if (text.length > 300) score += 1;
  if (defendants.length > 0) score += 1;
  if (dates.length > 0) score += 1;
  if (categories.length > 0) score += 1;

  if (score >= 3) return "medio";
  if (score >= 1) return "bajo";

  return "muy_bajo";
}

module.exports = {
  analyzeLegalText,
};
