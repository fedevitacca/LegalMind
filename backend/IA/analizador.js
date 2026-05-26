const KEYWORD_CATEGORIES = [
  {
    name: "imputacion",
    keywords: [
      "imputado",
      "imputada",
      "imputacion",
      "acusado",
      "acusada",
      "procesado",
      "procesada",
    ],
  },
  {
    name: "prueba",
    keywords: [
      "prueba",
      "testigo",
      "testimonial",
      "pericia",
      "pericial",
      "informe",
      "documentacion",
      "allanamiento",
      "secuestro",
    ],
  },
  {
    name: "actuacion_procesal",
    keywords: [
      "audiencia",
      "resolucion",
      "presentacion",
      "recurso",
      "apelacion",
      "indagatoria",
      "notificacion",
      "citado",
      "citada",
    ],
  },
  {
    name: "fechas_y_vencimientos",
    keywords: ["fecha", "vencimiento", "plazo", "notificacion", "termino"],
  },
  {
    name: "detencion_y_medidas",
    keywords: [
      "detencion",
      "detenido",
      "detenida",
      "prision",
      "excarcelacion",
      "morigeracion",
      "cautelar",
      "prohibicion",
      "embargo",
    ],
  },
  {
    name: "personas_y_partes",
    keywords: ["defensa", "defensor", "fiscal", "victima", "querella", "damnificado"],
  },
];

const DATE_PATTERNS = [
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}\b/gi,
];

const IMPORTANT_FACT_PATTERN =
  /hecho|ocurr|investig|imput|acus|delito|audiencia|resolucion|informe|allanamiento|secuestro|deten|indagatoria/i;
const ACTION_PATTERN =
  /pendiente|debera|deber[aá]|debe|intimar|intimese|notificar|presentar|acompa[nñ]ar|audiencia|vencimiento|plazo|citar|citese|fijar/i;
const DOCUMENT_PATTERN =
  /informe|acta|resolucion|documento|escrito|pericia|pericial|declaracion|constancia|oficio/i;

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
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildSummary(sentences) {
  if (sentences.length === 0) {
    return "";
  }

  const selected = sentences
    .filter((sentence) => sentence.length > 35)
    .sort((a, b) => scoreSentence(b) - scoreSentence(a))
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

  if (lowerText.includes("acta") && lowerText.includes("audiencia")) {
    return "acta_de_audiencia";
  }

  if (lowerText.includes("audiencia")) {
    return "actuacion_de_audiencia";
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
  const uniqueDates = unique(rawDates);

  return uniqueDates.map((date) => {
    const eventSentence = sentences.find((sentence) => sentence.includes(date)) || "";
    const lowerEvent = eventSentence.toLowerCase();
    const isDeadline = /venc|plazo|termino|t[eé]rmino|antes de|hasta el/.test(lowerEvent);
    const isHearing = /audiencia|indagatoria|declaracion|declaraci[oó]n/.test(lowerEvent);

    return {
      fecha: date,
      evento: eventSentence,
      tipo: isDeadline ? "vencimiento" : isHearing ? "audiencia" : "fecha_mencionada",
      requiere_alerta: isDeadline || isHearing,
    };
  });
}

function extractPossiblePeople(text) {
  const matches =
    text.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b/g) ||
    [];
  const ignored = new Set([
    "LegalMind",
    "Defensoria Federal",
    "Codigo Penal",
    "Código Penal",
    "Ministerio Publico",
    "Ministerio Público",
  ]);

  return unique(matches)
    .filter((name) => !ignored.has(name))
    .slice(0, 12);
}

function extractDefendants(text, people, sentences) {
  const lowerText = text.toLowerCase();
  const explicitDefendants = extractNamedPeopleByRole(text, [
    "imputado",
    "imputada",
    "acusado",
    "acusada",
    "procesado",
    "procesada",
    "detenido",
    "detenida",
  ]);
  const contextualDefendants = people.filter((person) => {
    const lowerPerson = person.toLowerCase();
    const index = lowerText.indexOf(lowerPerson);

    if (index < 0) {
      return false;
    }

    const context = lowerText.slice(Math.max(0, index - 80), index + lowerPerson.length + 80);

    return /imputad|acusad|procesad|detenid/.test(context);
  });
  const defendants = unique([...explicitDefendants, ...contextualDefendants]);

  return defendants.map((name) => {
    const linkedSentences = sentences.filter((sentence) => sentence.includes(name));

    return {
      nombre: name,
      datos_asociados: linkedSentences.slice(0, 3),
      imputaciones: linkedSentences.filter((sentence) => /imput|acus|hecho|delito|calific/i.test(sentence)),
      hechos_vinculados: linkedSentences.filter((sentence) => /ocurr|habria|habr[ií]a|hecho|particip|interv/i.test(sentence)),
      documentos_mencionados: linkedSentences.filter((sentence) => DOCUMENT_PATTERN.test(sentence)),
    };
  });
}

function extractGeneralData(text) {
  const data = [];
  const caseNumber = text.match(
    /\b(?:causa|expediente|expte\.?|legajo)\s*(?:nro\.?|numero|n[°ºo]|nÂ°)?\s*[:#-]?\s*([\w./-]+)/i
  );
  const court = text.match(/\b(?:juzgado|fiscalia|fiscalía|tribunal)\s+([^.;\n]+)/i);
  const caption = text.match(/\b(?:caratula|carátula)\s*[:#-]\s*([^.;\n]+)/i);
  const allegedCrime = text.match(/\b(?:delito de|calificado como|calificacion legal|calificación legal)\s+([^.;\n]+)/i);
  const victim = text.match(/\b(?:victima|víctima|damnificado|damnificada)\s+([A-ZÁÉÍÓÚÑ][^.;,\n]+)/);

  if (caseNumber) {
    data.push(`Identificador de causa o expediente: ${trimTrailingPunctuation(caseNumber[1])}`);
  }

  if (court) {
    data.push(`Organo interviniente: ${court[1].trim()}`);
  }

  if (caption) {
    data.push(`Caratula: ${caption[1].trim()}`);
  }

  if (allegedCrime) {
    data.push(`Delito o calificacion mencionada: ${allegedCrime[1].trim()}`);
  }

  if (victim) {
    data.push(`Victima o damnificado mencionado: ${victim[1].trim()}`);
  }

  return data;
}

function extractRelevantFacts(sentences) {
  return sentences
    .filter((sentence) => IMPORTANT_FACT_PATTERN.test(sentence))
    .sort((a, b) => scoreSentence(b) - scoreSentence(a))
    .slice(0, 8);
}

function extractPendingActions(sentences) {
  return sentences.filter((sentence) => ACTION_PATTERN.test(sentence)).slice(0, 6);
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
  if (text.length > 1000) score += 1;
  if (defendants.length > 0) score += 1;
  if (dates.length > 0) score += 1;
  if (categories.length > 0) score += 1;

  if (score >= 5) return "alto";
  if (score >= 3) return "medio";
  if (score >= 1) return "bajo";

  return "muy_bajo";
}

function extractNamedPeopleByRole(text, roleWords) {
  const rolePattern = roleWords.join("|");
  const regex = new RegExp(
    `\\b(?:${rolePattern})\\s+(?:a\\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\\b`,
    "g"
  );
  const matches = [];
  let match = regex.exec(text);

  while (match) {
    matches.push(match[1]);
    match = regex.exec(text);
  }

  return matches;
}

function scoreSentence(sentence) {
  let score = 0;

  if (/causa|expediente|expte|legajo/i.test(sentence)) score += 2;
  if (/imput|acus|proces|deten/i.test(sentence)) score += 3;
  if (/hecho|ocurr|delito|investig/i.test(sentence)) score += 2;
  if (/audiencia|vencimiento|plazo|debera|deber[aá]/i.test(sentence)) score += 2;
  if (DOCUMENT_PATTERN.test(sentence)) score += 1;

  return score;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function trimTrailingPunctuation(value) {
  return String(value).replace(/[.,;:]+$/, "");
}

module.exports = {
  analyzeLegalText,
};
