const TOOL_DEFINITIONS = {
  resumen_expediente: {
    label: "Resumen del expediente",
    description: "Sintetiza partes, hechos, estado, fechas y próximos pasos.",
    inputs: 1,
    family: "extraccion", resultView: "dossier", accent: "teal",
    fields: ["expediente", "jurisdiccion", "objetivo"],
    instruction: [
      "Prepará un informe ejecutivo del expediente, con suficiente desarrollo para que otro abogado comprenda el asunto sin releer toda la fuente.",
      "Organizá el desarrollo en: identificación y objeto; partes y roles; hechos relevantes; estado procesal; fechas o plazos; y lectura práctica.",
      "Diferenciá expresamente lo que surge del documento de lo que requiere verificación. Omití únicamente los apartados para los que no exista información.",
    ].join(" "),
  },
  comparar_documentos: {
    label: "Comparar documentos",
    description: "Marca coincidencias, diferencias y contradicciones relevantes.",
    inputs: 2,
    family: "comparacion", resultView: "diff", accent: "blue",
    fields: ["tipo_documento_a", "tipo_documento_b", "criterio_comparacion"],
    instruction: [
      "Prepará una comparación jurídica razonada de ambas fuentes.",
      "Desarrollá: objeto y alcance de cada documento; coincidencias; diferencias relevantes; contradicciones u omisiones; y posible impacto procesal o probatorio.",
      "Atribuí cada afirmación a Fuente A o Fuente B y no conviertas diferencias de redacción en contradicciones materiales.",
    ].join(" "),
  },
  comparar_jurisprudencia: {
    label: "Comparar fallos",
    description: "Contrasta hechos, criterios y utilidad de dos decisiones.",
    inputs: 2,
    family: "jurisprudencia", resultView: "precedents", accent: "violet",
    fields: ["problema_juridico", "jurisdiccion", "posicion_procesal"],
    instruction: [
      "Compará los fallos con enfoque práctico y argumentativo.",
      "Desarrollá: hechos jurídicamente relevantes; cuestión debatida; criterio o regla aplicada; semejanzas y diferencias determinantes; aplicabilidad al caso; y límites del paralelo.",
      "No atribuyas carácter vinculante ni identifiques doctrina legal si eso no surge de las fuentes.",
    ].join(" "),
  },
  cronologia: {
    label: "Fechas y vencimientos",
    description: "Ordena actuaciones, audiencias y plazos que requieren atención.",
    inputs: 1,
    family: "temporal", resultView: "timeline", accent: "amber",
    fields: ["fecha_corte", "incluir_inferidas"],
    instruction: [
      "Reconstruí la secuencia temporal y explicá por qué importa cada hito.",
      "Desarrollá: antecedentes; actuaciones cumplidas; situación actual; próximos hitos; y plazos o dependencias que requieren control.",
      "Distinguí fechas expresas, fechas inferidas y plazos que no pueden calcularse con certeza. No calcules vencimientos sin punto de inicio y regla aplicable.",
    ].join(" "),
  },
  consulta_rag: {
    label: "Preguntar sobre documentos",
    description: "Responde con información del expediente y muestra las fuentes utilizadas.",
    inputs: 1,
    family: "busqueda", resultView: "answer", accent: "slate",
    fields: ["modo_citas"],
    instruction: [
      "Respondé la pregunta de manera directa y luego desarrollá el razonamiento documental.",
      "Organizá el desarrollo en: respuesta encontrada; elementos que la sostienen; relación entre documentos o pasajes; y vacíos o aspectos no acreditados.",
      "Usá exclusivamente los pasajes seleccionados, identificá el documento que respalda cada punto y explicá con claridad cuando el corpus no permita responder.",
    ].join(" "),
  },
  teoria_del_caso: {
    label: "Teoría del caso",
    description: "Ordena la postura, la prueba disponible y sus puntos débiles.",
    inputs: 1, family: "estrategia", resultView: "theory", accent: "indigo",
    fields: ["parte_representada", "hipotesis_central", "etapa_procesal"],
    instruction: [
      "Prepará una teoría del caso provisional, concreta y contrastable.",
      "Desarrollá: hipótesis central; proposiciones fácticas; evidencia favorable; evidencia adversa o explicaciones alternativas; debilidades; y comprobaciones pendientes.",
      "Separá hechos acreditados, inferencias e hipótesis de trabajo. No inventes normas, prueba ni objetivos procesales que no hayan sido indicados.",
    ].join(" "),
  },
};

const toolResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "conclusion", "puntos_clave", "desarrollo", "acciones_sugeridas", "limitaciones"],
  properties: {
    titulo: { type: "string", maxLength: 120 },
    conclusion: { type: "string", maxLength: 1800 },
    puntos_clave: { type: "array", minItems: 3, maxItems: 6, items: { type: "string", maxLength: 500 } },
    desarrollo: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "contenido"],
        properties: {
          titulo: { type: "string", maxLength: 90 },
          contenido: { type: "string", maxLength: 1200 },
        },
      },
    },
    acciones_sugeridas: { type: "array", maxItems: 4, items: { type: "string", maxLength: 420 } },
    limitaciones: { type: "array", maxItems: 3, items: { type: "string", maxLength: 420 } },
  },
};

function listTools() {
  return Object.entries(TOOL_DEFINITIONS).map(([id, value]) => ({ id, ...value }));
}

function getTool(id) {
  return TOOL_DEFINITIONS[id] || null;
}

module.exports = { getTool, listTools, toolResultSchema };
