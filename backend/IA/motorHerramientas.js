const TOOL_DEFINITIONS = {
  resumen_expediente: {
    label: "Resumen inteligente de expediente",
    description: "Extrae número, carátula, tribunal, fechas, partes y produce un resumen ejecutivo.",
    inputs: 1,
    family: "extraccion", resultView: "dossier", accent: "teal",
    fields: ["expediente", "jurisdiccion", "objetivo"],
    instruction: "Resume el expediente. Identifica numero de expediente, caratula, organismo, partes, fechas y actos procesales. Separa hechos, estado actual, riesgos y proximos pasos.",
  },
  comparar_documentos: {
    label: "Comparar documentos",
    description: "Contrasta escritos, resoluciones o cuadros y señala coincidencias y contradicciones.",
    inputs: 2,
    family: "comparacion", resultView: "diff", accent: "blue",
    fields: ["tipo_documento_a", "tipo_documento_b", "criterio_comparacion"],
    instruction: "Compara ambos documentos punto por punto. Detecta coincidencias, diferencias, contradicciones, datos faltantes y cambios con posible impacto juridico.",
  },
  comparar_jurisprudencia: {
    label: "Comparativa de jurisprudencia",
    description: "Compara hechos, normas, holding, criterios y aplicabilidad de dos fallos.",
    inputs: 2,
    family: "jurisprudencia", resultView: "precedents", accent: "violet",
    fields: ["problema_juridico", "jurisdiccion", "posicion_procesal"],
    instruction: "Compara los fallos como abogado. Identifica tribunal y fecha, hechos relevantes, cuestion juridica, normas, decision o holding, criterio, similitudes, diferencias y aplicabilidad al caso consultado.",
  },
  cronologia: {
    label: "Línea de tiempo procesal",
    description: "Ordena fechas, audiencias, vencimientos y actuaciones con alertas.",
    inputs: 1,
    family: "temporal", resultView: "timeline", accent: "amber",
    fields: ["fecha_corte", "incluir_inferidas"],
    instruction: "Construye una cronologia procesal ordenada. Distingue fecha cierta de fecha inferida, identifica vencimientos y marca eventos que requieren revision urgente.",
  },
  consulta_rag: {
    label: "Consulta documental RAG",
    description: "Responde preguntas únicamente con fragmentos recuperados del material.",
    inputs: 1,
    family: "busqueda", resultView: "answer", accent: "slate",
    fields: ["pregunta", "modo_citas"],
    instruction: "Responde la consulta solo con el material aportado. Cita los fragmentos por su identificador y explicita cuando no exista evidencia suficiente.",
  },
  teoria_del_caso: {
    label: "Constructor de teoría del caso",
    description: "Organiza proposiciones fácticas, teoría jurídica, prueba y debilidades de una postura.",
    inputs: 1, family: "estrategia", resultView: "theory", accent: "indigo",
    fields: ["parte_representada", "hipotesis_central", "etapa_procesal"],
    instruction: "Construye una teoria del caso provisional. Separa proposiciones facticas, encuadre juridico mencionado en las fuentes, evidencia de apoyo, evidencia adversa, vacios y lineas de investigacion. No inventes normas.",
  },
};

const toolResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "resumen", "hallazgos", "tabla", "alertas", "conclusion", "limitaciones"],
  properties: {
    titulo: { type: "string" },
    resumen: { type: "string" },
    hallazgos: { type: "array", items: { type: "object", properties: {
      titulo: { type: "string" }, detalle: { type: "string" }, evidencia: { type: "string" }, prioridad: { type: "string" },
    }}},
    tabla: { type: "array", items: { type: "object", properties: {
      aspecto: { type: "string" }, documento_a: { type: "string" }, documento_b: { type: "string" }, evaluacion: { type: "string" },
    }}},
    alertas: { type: "array", items: { type: "string" } },
    conclusion: { type: "string" },
    limitaciones: { type: "array", items: { type: "string" } },
  },
};

function listTools() {
  return Object.entries(TOOL_DEFINITIONS).map(([id, value]) => ({ id, ...value }));
}

function getTool(id) {
  return TOOL_DEFINITIONS[id] || null;
}

module.exports = { getTool, listTools, toolResultSchema };
