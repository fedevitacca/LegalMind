const PRIORITY_ORDER = ["baja", "media", "alta", "urgente"];

const FEATURE_DEFINITIONS = [
  {
    key: "audiencia",
    label: "Audiencia o acto procesal",
    keywords: ["audiencia", "indagatoria", "debate", "comparecer", "comparendo"],
  },
  {
    key: "vencimiento",
    label: "Vencimiento o plazo",
    keywords: ["vencimiento", "plazo", "vence", "hasta el", "termino", "debera presentar"],
  },
  {
    key: "libertad",
    label: "Libertad o detencion",
    keywords: ["detenido", "detencion", "prision preventiva", "excarcelacion", "libertad"],
  },
  {
    key: "resolucion",
    label: "Resolucion o sentencia",
    keywords: ["sentencia", "resolucion", "procesamiento", "sobreseimiento", "condena"],
  },
  {
    key: "recurso",
    label: "Recurso o impugnacion",
    keywords: ["apelacion", "recurso", "casacion", "impugnacion", "agravio"],
  },
  {
    key: "prueba",
    label: "Prueba o pericia",
    keywords: ["pericia", "informe pericial", "allanamiento", "testigo", "declaracion"],
  },
  {
    key: "administrativo",
    label: "Movimiento administrativo",
    keywords: ["copias", "digitalizacion", "agreguese", "archivo", "constancia", "cedula"],
  },
  {
    key: "fechas",
    label: "Fechas detectadas",
    matcher: (text) => (text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || []).length,
  },
];

const TRAINING_EXAMPLES = [
  ["Se fija audiencia de indagatoria para manana y el imputado se encuentra detenido.", "urgente"],
  ["Vence el plazo para interponer recurso de apelacion contra la resolucion.", "urgente"],
  ["Prision preventiva. Se solicita revisar excarcelacion por vencimiento de plazo.", "urgente"],
  ["Audiencia de debate fijada para el 12/08/2026 con comparecencia obligatoria.", "alta"],
  ["Se notifica procesamiento y se abre plazo para recurso.", "alta"],
  ["Informe pericial incorporado. La defensa debera presentar observaciones.", "alta"],
  ["Se agrega declaracion testimonial y acta de allanamiento para analisis.", "media"],
  ["Se incorpora pericia contable al expediente sin plazo expreso.", "media"],
  ["Resolucion simple que ordena correr vista a las partes.", "media"],
  ["Se agregan copias digitales al legajo para consulta interna.", "baja"],
  ["Constancia de digitalizacion y archivo provisorio de documentacion.", "baja"],
  ["Cedula administrativa sin audiencia, vencimiento ni medida restrictiva.", "baja"],
];

let cachedForest;

function triageLegalDocumentWithRandomForest(text, options = {}) {
  const forest = options.forest || getDefaultForest();
  const features = vectorizeLegalText(text);
  const votes = forest.trees.map((tree) => predictTree(tree, features));
  const voteSummary = summarizeVotes(votes);
  const votedPriority = choosePriority(voteSummary);
  const priority = applyOperationalPriorityFloor(votedPriority, features);
  const confidenceVotes = voteSummary[priority] || voteSummary[votedPriority] || 0;

  return {
    prioridad: priority,
    confianza: Number((confidenceVotes / votes.length).toFixed(4)),
    prioridad_votada: votedPriority,
    votos: voteSummary,
    senales_detectadas: buildDetectedSignals(features),
    recomendacion: buildRecommendation(priority),
    modelo: {
      algoritmo: "random_forest_local",
      arboles: forest.trees.length,
      ejemplos_entrenamiento: forest.trainingSize,
    },
  };
}

function applyOperationalPriorityFloor(priority, features) {
  if (features.libertad > 0 && features.vencimiento > 0) {
    return "urgente";
  }

  if (features.audiencia > 0 && features.fechas > 0 && priorityRank(priority) < priorityRank("alta")) {
    return "alta";
  }

  if (features.recurso > 0 && features.vencimiento > 0 && priorityRank(priority) < priorityRank("alta")) {
    return "alta";
  }

  return priority;
}

function getDefaultForest() {
  if (!cachedForest) {
    cachedForest = trainRandomForest(TRAINING_EXAMPLES, {
      maxDepth: 4,
      seed: 42,
      treeCount: 17,
    });
  }

  return cachedForest;
}

function trainRandomForest(examples, options = {}) {
  const seed = Number(options.seed) || 1;
  const random = createSeededRandom(seed);
  const rows = examples.map(([text, label]) => ({
    features: vectorizeLegalText(text),
    label,
  }));
  const treeCount = Math.max(3, Number(options.treeCount) || 15);
  const trees = [];

  for (let index = 0; index < treeCount; index += 1) {
    const sample = bootstrapSample(rows, random);
    const featureKeys = pickFeatureSubset(random);
    trees.push(buildTree(sample, featureKeys, {
      maxDepth: Number(options.maxDepth) || 4,
      random,
    }));
  }

  return {
    trainingSize: rows.length,
    trees,
  };
}

function vectorizeLegalText(text) {
  const normalized = normalizeText(text);

  return FEATURE_DEFINITIONS.reduce((features, definition) => {
    features[definition.key] = definition.matcher
      ? definition.matcher(normalized)
      : definition.keywords.reduce(
          (count, keyword) => count + countOccurrences(normalized, normalizeText(keyword)),
          0
        );
    return features;
  }, {});
}

function buildTree(rows, featureKeys, context, depth = 0) {
  const majority = majorityLabel(rows);

  if (depth >= context.maxDepth || isPure(rows) || !featureKeys.length) {
    return {
      label: majority,
      type: "leaf",
    };
  }

  const split = findBestSplit(rows, featureKeys);

  if (!split) {
    return {
      label: majority,
      type: "leaf",
    };
  }

  return {
    feature: split.feature,
    left: buildTree(split.left, featureKeys, context, depth + 1),
    right: buildTree(split.right, featureKeys, context, depth + 1),
    threshold: split.threshold,
    type: "node",
  };
}

function findBestSplit(rows, featureKeys) {
  let bestSplit = null;
  let bestImpurity = Number.POSITIVE_INFINITY;

  for (const feature of featureKeys) {
    const values = [...new Set(rows.map((row) => row.features[feature]))].sort((a, b) => a - b);

    for (const value of values) {
      const left = rows.filter((row) => row.features[feature] <= value);
      const right = rows.filter((row) => row.features[feature] > value);

      if (!left.length || !right.length) {
        continue;
      }

      const impurity = weightedGini(left, right);

      if (impurity < bestImpurity) {
        bestImpurity = impurity;
        bestSplit = {
          feature,
          left,
          right,
          threshold: value,
        };
      }
    }
  }

  return bestSplit;
}

function predictTree(tree, features) {
  if (tree.type === "leaf") {
    return tree.label;
  }

  return predictTree(
    features[tree.feature] <= tree.threshold ? tree.left : tree.right,
    features
  );
}

function bootstrapSample(rows, random) {
  return rows.map(() => rows[Math.floor(random() * rows.length)]);
}

function pickFeatureSubset(random) {
  const shuffled = [...FEATURE_DEFINITIONS.map((definition) => definition.key)]
    .sort(() => random() - 0.5);
  const size = Math.max(2, Math.round(Math.sqrt(FEATURE_DEFINITIONS.length)));

  return shuffled.slice(0, size);
}

function weightedGini(left, right) {
  const total = left.length + right.length;

  return (left.length / total) * gini(left) + (right.length / total) * gini(right);
}

function gini(rows) {
  const counts = countLabels(rows.map((row) => row.label));
  const total = rows.length;

  return 1 - Object.values(counts).reduce((sum, count) => sum + (count / total) ** 2, 0);
}

function isPure(rows) {
  return new Set(rows.map((row) => row.label)).size === 1;
}

function majorityLabel(rows) {
  const counts = countLabels(rows.map((row) => row.label));

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || priorityRank(right[0]) - priorityRank(left[0]))[0][0];
}

function summarizeVotes(votes) {
  const counts = countLabels(votes);

  return PRIORITY_ORDER.reduce((summary, priority) => {
    summary[priority] = counts[priority] || 0;
    return summary;
  }, {});
}

function choosePriority(votes) {
  return Object.entries(votes)
    .sort((left, right) => right[1] - left[1] || priorityRank(right[0]) - priorityRank(left[0]))[0][0];
}

function priorityRank(priority) {
  return PRIORITY_ORDER.indexOf(priority);
}

function countLabels(labels) {
  return labels.reduce((counts, label) => {
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
}

function buildDetectedSignals(features) {
  return FEATURE_DEFINITIONS
    .filter((definition) => features[definition.key] > 0)
    .map((definition) => ({
      cantidad: features[definition.key],
      clave: definition.key,
      descripcion: definition.label,
    }));
}

function buildRecommendation(priority) {
  const recommendations = {
    urgente: "Revisar de inmediato: puede haber audiencia, vencimiento o afectacion de libertad.",
    alta: "Priorizar en la agenda del dia y verificar plazos o actos procesales.",
    media: "Revisar en el flujo normal del caso y contrastar con documentos previos.",
    baja: "Registrar como movimiento informativo salvo que el abogado detecte otro riesgo.",
  };

  return recommendations[priority];
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countOccurrences(text, keyword) {
  if (!keyword) {
    return 0;
  }

  return text.split(keyword).length - 1;
}

function createSeededRandom(seed) {
  let value = seed % 2147483647;

  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function resetRandomForestForTests() {
  cachedForest = undefined;
}

module.exports = {
  resetRandomForestForTests,
  trainRandomForest,
  triageLegalDocumentWithRandomForest,
  vectorizeLegalText,
};
