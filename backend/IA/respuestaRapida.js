const TITLES = {
  resumen_expediente: "Resumen rápido del expediente",
  comparar_documentos: "Comparación documental",
  comparar_imputados: "Pasajes de las fichas de imputados",
  comparar_jurisprudencia: "Comparación de fallos",
  cronologia: "Cronología y fechas relevantes",
  consulta_rag: "Respuesta basada en el expediente",
  teoria_del_caso: "Teoría del caso provisional",
  preparar_audiencia: "Guía para la audiencia",
};

function buildFastToolResult({ toolId, chunks = [], query = "", scopeLabel = "las fuentes seleccionadas" }) {
  const passages = toolId.startsWith("comparar_")
    ? [...new Set(chunks.map((chunk) => chunk.document_id))].flatMap((id) => selectPassages(chunks.filter((chunk) => chunk.document_id === id), query, 2))
    : selectPassages(chunks, query, toolId === "cronologia" ? 6 : 5);
  const points = passages.map((item) => `${item.documentName}: ${item.text}`);
  const emptyMessage = `No se encontró información suficiente en ${scopeLabel} para responder con respaldo.`;

  if (!points.length) {
    return {
      titulo: TITLES[toolId] || "Análisis documental",
      conclusion: emptyMessage,
      puntos_clave: [emptyMessage],
      desarrollo: [
        { titulo: "Resultado de la búsqueda", contenido: emptyMessage },
        { titulo: "Alcance", contenido: "No se agregaron datos externos ni se completaron vacíos por inferencia." },
      ],
      acciones_sugeridas: ["Reformular la consulta o incorporar documentación con texto extraíble."],
      limitaciones: ["La respuesta se limita al material disponible."],
    };
  }

  const conclusion = buildConclusion(toolId, passages, scopeLabel);
  return {
    titulo: TITLES[toolId] || "Análisis documental",
    conclusion,
    puntos_clave: points.slice(0, 5),
    desarrollo: buildSections(toolId, passages, query),
    acciones_sugeridas: buildActions(toolId),
    limitaciones: [
      "Respuesta extractiva rápida: verifique los pasajes citados antes de incorporarla a una presentación.",
    ],
  };
}

function selectPassages(chunks, query, limit) {
  const queryTerms = tokenize(query);
  const candidates = [];

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      if (sentence.length < 18) continue;
      const sentenceTerms = tokenize(sentence);
      const overlap = queryTerms.filter((term) => sentenceTerms.includes(term)).length;
      const dateBonus = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}\b/i.test(sentence) ? 0.25 : 0;
      candidates.push({
        documentName: chunk.document_name || "Fuente",
        text: limitText(sentence, 52),
        score: Number(chunk.score || 0) + overlap * 0.35 + dateBonus,
      });
    }
  }

  return candidates
    .sort((left, right) => right.score - left.score)
    .filter((item, index, items) => items.findIndex((other) => normalize(other.text) === normalize(item.text)) === index)
    .slice(0, limit);
}

function buildConclusion(toolId, passages, scopeLabel) {
  const first = passages[0];
  const second = passages.find((item) => item.documentName !== first.documentName) || passages[1];
  const joined = [first, second]
    .filter(Boolean)
    .map((item) => `${item.documentName} indica que ${lowercaseStart(item.text)}`)
    .join(" ");

  if (toolId === "consulta_rag") return `Según ${scopeLabel}, ${lowercaseStart(joined)}`;
  if (toolId === "cronologia") return `Se localizaron ${passages.length} referencias temporales o procesales relevantes. ${joined}`;
  if (toolId.startsWith("comparar_")) {
    return `La comparación rápida identificó los siguientes pasajes centrales. ${joined}`;
  }
  if (toolId === "teoria_del_caso") return `Como base provisional de trabajo, ${lowercaseStart(joined)}`;
  if (toolId === "preparar_audiencia") return `Para preparar la audiencia, los pasajes centrales indican que ${lowercaseStart(joined)}`;
  return `La síntesis de ${scopeLabel} muestra que ${lowercaseStart(joined)}`;
}

function buildSections(toolId, passages, query) {
  if (toolId.startsWith("comparar_")) {
    return [
      ...[...new Set(passages.map((item) => item.documentName))].map((name) => ({
        titulo: name,
        contenido: passages.filter((item) => item.documentName === name).map((item) => item.text).join("\n"),
      })),
      { titulo: "Alcance de la extracción", contenido: "Estos son pasajes de ambas fuentes. La extracción no determina por sí sola coincidencias, contradicciones ni conclusiones jurídicas." },
    ];
  }
  const midpoint = Math.max(1, Math.ceil(passages.length / 2));
  const first = passages.slice(0, midpoint).map(formatPassage).join("\n");
  const second = passages.slice(midpoint).map(formatPassage).join("\n") || "No surgieron otros pasajes distintos con igual nivel de pertinencia.";
  const labels = toolId === "cronologia"
    ? ["Hitos localizados", "Controles temporales"]
    : toolId.startsWith("comparar_")
      ? ["Fuente y coincidencias", "Diferencias para revisar"]
      : toolId === "teoria_del_caso"
        ? ["Base fáctica", "Aspectos por contrastar"]
        : toolId === "preparar_audiencia"
          ? ["Ejes para la audiencia", "Preguntas y controles"]
        : toolId === "consulta_rag"
          ? ["Respuesta documental", "Contexto relacionado"]
          : ["Información central", "Contexto complementario"];

  return [
    { titulo: labels[0], contenido: first },
    { titulo: labels[1], contenido: second + (query ? `\nConsulta aplicada: ${limitText(query, 35)}` : "") },
  ];
}

function buildActions(toolId) {
  if (toolId === "cronologia") return ["Confirmar cada fecha contra la actuación original y controlar el punto de inicio de los plazos."];
  if (toolId.startsWith("comparar_")) return ["Revisar ambas fuentes completas antes de calificar una diferencia como contradicción material."];
  if (toolId === "teoria_del_caso") return ["Separar hechos acreditados, inferencias e hipótesis al definir la estrategia."];
  if (toolId === "preparar_audiencia") return ["Confirmar la documentación, las personas intervinientes y el resultado buscado antes de la audiencia."];
  return ["Abrir las fuentes citadas y comprobar el contexto completo de los pasajes relevantes."];
}

function formatPassage(item) {
  return `${item.documentName}: ${item.text}`;
}

function splitSentences(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [];
}

function tokenize(value) {
  return normalize(value).split(/[^a-z0-9áéíóúñ]+/).filter((term) => term.length > 2);
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function limitText(value, maximumWords) {
  const words = String(value || "").trim().split(/\s+/);
  return words.length <= maximumWords ? words.join(" ") : `${words.slice(0, maximumWords).join(" ")}…`;
}

function lowercaseStart(value) {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

module.exports = { buildFastToolResult, selectPassages };
