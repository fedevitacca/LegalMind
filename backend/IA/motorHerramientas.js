const TOOL_DEFINITIONS = {
  resumen_expediente: {
    label: "Resumen del expediente",
    description: "Sintetiza partes, hechos, estado, fechas y próximos pasos.",
    inputs: 1,
    family: "extraccion", resultView: "dossier", accent: "teal",
    fields: ["expediente", "jurisdiccion", "objetivo"],
    instruction: "Prepará un resumen breve del expediente. Indicá partes, hechos, estado actual, fechas y próximos pasos. Omití apartados sin información.",
  },
  comparar_documentos: {
    label: "Comparar documentos",
    description: "Marca coincidencias, diferencias y contradicciones relevantes.",
    inputs: 2,
    family: "comparacion", resultView: "diff", accent: "blue",
    fields: ["tipo_documento_a", "tipo_documento_b", "criterio_comparacion"],
    instruction: "Compará ambos documentos y conservá sólo las coincidencias, diferencias, contradicciones y omisiones que puedan importar en el caso.",
  },
  comparar_jurisprudencia: {
    label: "Comparar fallos",
    description: "Contrasta hechos, criterios y utilidad de dos decisiones.",
    inputs: 2,
    family: "jurisprudencia", resultView: "precedents", accent: "violet",
    fields: ["problema_juridico", "jurisdiccion", "posicion_procesal"],
    instruction: "Compará los fallos de forma práctica. Señalá criterio, similitudes, diferencias y utilidad para el caso. No desarrolles antecedentes que no cambien la comparación.",
  },
  cronologia: {
    label: "Fechas y vencimientos",
    description: "Ordena actuaciones, audiencias y plazos que requieren atención.",
    inputs: 1,
    family: "temporal", resultView: "timeline", accent: "amber",
    fields: ["fecha_corte", "incluir_inferidas"],
    instruction: "Ordená cronológicamente fechas y actuaciones. Distinguí fechas expresas de inferidas y resaltá sólo los vencimientos que requieren atención.",
  },
  consulta_rag: {
    label: "Preguntar sobre documentos",
    description: "Responde con información del expediente y muestra las fuentes utilizadas.",
    inputs: 1,
    family: "busqueda", resultView: "answer", accent: "slate",
    fields: ["modo_citas"],
    instruction: "Respondé directamente la pregunta usando sólo el material aportado. Mencioná el documento que respalda cada punto y decí con claridad cuando no haya información suficiente.",
  },
  teoria_del_caso: {
    label: "Teoría del caso",
    description: "Ordena la postura, la prueba disponible y sus puntos débiles.",
    inputs: 1, family: "estrategia", resultView: "theory", accent: "indigo",
    fields: ["parte_representada", "hipotesis_central", "etapa_procesal"],
    instruction: "Prepará una teoría del caso provisional y breve. Separá postura, hechos, prueba favorable, prueba adversa y puntos pendientes. No inventes normas.",
  },
};

const toolResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "conclusion", "puntos_clave"],
  properties: {
    titulo: { type: "string", maxLength: 90 },
    conclusion: { type: "string", maxLength: 900 },
    puntos_clave: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", maxLength: 320 } },
  },
};

function listTools() {
  return Object.entries(TOOL_DEFINITIONS).map(([id, value]) => ({ id, ...value }));
}

function getTool(id) {
  return TOOL_DEFINITIONS[id] || null;
}

module.exports = { getTool, listTools, toolResultSchema };
