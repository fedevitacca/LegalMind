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
  matriz_evidencia: {
    label: "Matriz de evidencia",
    description: "Relaciona hechos, evidencia, fuente, contradicciones y fuerza probatoria.",
    inputs: 1,
    family: "probatoria", resultView: "matrix", accent: "green",
    fields: ["hipotesis", "estandar", "parte_analizada"],
    instruction: "Construye una matriz de hechos y evidencia. Para cada hecho indica evidencia favorable y adversa, fuente, contradicciones, vacios y fuerza estimada sin decidir culpabilidad.",
  },
  detectar_riesgos: {
    label: "Detector de riesgos y omisiones",
    description: "Busca inconsistencias, plazos, vacíos documentales y puntos de revisión.",
    inputs: 1,
    family: "auditoria", resultView: "risk", accent: "red",
    fields: ["rol", "fecha_corte", "nivel_conservador"],
    instruction: "Audita el material buscando plazos, inconsistencias, omisiones, ambiguedades, datos sin respaldo y riesgos procesales. Prioriza cada hallazgo y explica su evidencia.",
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
  contradicciones_multifuente: {
    label: "Radar de contradicciones",
    description: "Cruza declaraciones o piezas y localiza divergencias materiales y explicables.",
    inputs: 2, family: "consistencia", resultView: "contradictions", accent: "orange",
    fields: ["tipo_fuente_a", "tipo_fuente_b", "umbral_materialidad"],
    instruction: "Alinea afirmaciones comparables de ambas fuentes. Clasifica contradicciones en materiales, temporales, nominales o aparentes; cita evidencia de ambos lados y evita tratar como contradiccion una mera ausencia.",
  },
  auditor_citas: {
    label: "Auditor de citas y respaldo",
    description: "Verifica si las afirmaciones de un escrito están respaldadas por el material citado.",
    inputs: 2, family: "verificacion", resultView: "citations", accent: "cyan",
    fields: ["tipo_escrito", "nivel_exigencia", "jurisdiccion"],
    instruction: "Toma Fuente A como escrito o afirmaciones y Fuente B como material de respaldo. Verifica afirmacion por afirmacion si existe apoyo total, parcial, contradictorio o inexistente. No verifiques validez externa de normas no aportadas.",
  },
  borrador_juridico: {
    label: "Asistente de borrador",
    description: "Produce una estructura argumental editable basada exclusivamente en fuentes aportadas.",
    inputs: 1, family: "redaccion", resultView: "draft", accent: "rose",
    fields: ["tipo_escrito", "destinatario", "pretension"],
    instruction: "Prepara un borrador estructurado y prudente con objeto, antecedentes, argumentos respaldados, petitorio sugerido y marcadores visibles para datos faltantes. No inventes citas ni datos formales.",
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
