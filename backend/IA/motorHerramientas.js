const DEFINICIONES_HERRAMIENTAS = {
  resumen_expediente: {
    label: "Resumen del expediente",
    description: "Sintetiza partes, hechos, estado, fechas y próximos pasos.",
    inputs: 1,
    family: "extraccion", resultView: "dossier", accent: "teal",
    fields: ["expediente", "jurisdiccion", "objetivo"],
    maxOutputTokens: 720,
    maxContextChunks: 6,
    chatInstruction: "Resumí el caso: empezá por el hecho que originó la investigación, luego explicá cómo está hoy y cuál es el próximo paso. Incluí cifras y fechas clave si están respaldadas.",
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
    maxOutputTokens: 780,
    maxContextChunks: 6,
    chatInstruction: "Compará los dos documentos elegidos. Empezá por la diferencia o coincidencia más importante y explicá qué sostiene cada uno. Citá ambos y distinguí las contradicciones de las omisiones.",
    instruction: [
      "Prepará una comparación jurídica razonada de ambas fuentes.",
      "Desarrollá: objeto y alcance de cada documento; coincidencias; diferencias relevantes; contradicciones u omisiones; y posible impacto procesal o probatorio.",
      "Atribuí cada afirmación a Fuente A o Fuente B y no conviertas diferencias de redacción en contradicciones materiales.",
    ].join(" "),
  },
  comparar_imputados: {
    label: "Comparar imputados",
    description: "Contrasta las fichas de dos imputados del mismo expediente.",
    inputs: 2,
    family: "comparacion", resultView: "diff", accent: "blue",
    fields: ["criterio_comparacion"],
    maxOutputTokens: 780,
    maxContextChunks: 6,
    chatInstruction: "Compará las fichas de las dos personas elegidas. Indicá qué está registrado para cada una, qué coincide y qué queda por verificar. Tratá las fichas como registros, sin inferir culpabilidad.",
    instruction: [
      "Compará las fichas registradas de los dos imputados del expediente.",
      "Identificá a cada persona y desarrollá roles, hechos registrados, coincidencias, diferencias y datos pendientes de verificación.",
      "Atribuí los datos a la ficha de cada persona. No confundas notas del expediente con hechos acreditados ni infieras culpabilidad, participación o contradicciones cuando las fichas no aportan sustento.",
      "Aclarar que el alcance son las fichas seleccionadas y no la totalidad de la prueba documental del caso.",
    ].join(" "),
  },
  comparar_jurisprudencia: {
    label: "Comparar fallos",
    description: "Contrasta hechos, criterios y utilidad de dos decisiones.",
    inputs: 2,
    family: "jurisprudencia", resultView: "precedents", accent: "violet",
    fields: ["problema_juridico", "jurisdiccion", "posicion_procesal"],
    maxOutputTokens: 780,
    maxContextChunks: 6,
    chatInstruction: "Compará los dos fallos elegidos. Señalá sus criterios, la diferencia decisiva y qué utilidad tendría cada uno para la pregunta. Aclaralo si las fuentes no permiten establecer su aplicabilidad.",
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
    maxOutputTokens: 680,
    maxContextChunks: 6,
    chatInstruction: "Ordená las fechas relevantes. Si la pregunta es por lo próximo, empezá por el primer plazo o audiencia vigente. Indicá qué fechas quedaron sin efecto y quién debe actuar si consta.",
    instruction: [
      "Reconstruí la secuencia temporal y explicá por qué importa cada hito.",
      "Desarrollá: antecedentes; actuaciones cumplidas; situación actual; próximos hitos; y plazos o dependencias que requieren control.",
      "Distinguí fechas expresas, fechas inferidas y plazos que no pueden calcularse con certeza. No calcules vencimientos sin punto de inicio y regla aplicable.",
    ].join(" "),
  },
  consulta_rag: {
    label: "Preguntar al expediente",
    description: "Consulta documentos, la visión general del expediente o un imputado individual y muestra las fuentes utilizadas.",
    inputs: 1,
    family: "busqueda", resultView: "answer", accent: "slate",
    fields: ["alcance", "imputado", "modo_citas"],
    scopes: ["documents", "case", "defendant"],
    maxOutputTokens: 600,
    maxContextChunks: 5,
    instruction: [
      "Respondé la pregunta de manera directa y luego desarrollá el razonamiento documental.",
      "Organizá el desarrollo en: respuesta encontrada; elementos que la sostienen; relación entre documentos o pasajes; y vacíos o aspectos no acreditados.",
      "Usá exclusivamente los pasajes seleccionados, identificá el documento que respalda cada punto y explicá con claridad cuando el corpus no permita responder.",
      "Priorizá una respuesta breve: conclusión de hasta 90 palabras, 3 o 4 puntos clave, 2 apartados de desarrollo y no más de 2 acciones o limitaciones.",
    ].join(" "),
  },
  teoria_del_caso: {
    label: "Teoría del caso",
    description: "Ordena la postura, la prueba disponible y sus puntos débiles.",
    inputs: 1, family: "estrategia", resultView: "theory", accent: "indigo",
    fields: ["parte_representada", "hipotesis_central", "etapa_procesal"],
    maxOutputTokens: 780,
    maxContextChunks: 6,
    chatInstruction: "Explicá la hipótesis principal, la evidencia favorable, la evidencia que la debilita y qué conviene verificar. Presentá las hipótesis como provisionales y vinculá cada punto con fuentes.",
    instruction: [
      "Prepará una teoría del caso provisional, concreta y contrastable.",
      "Desarrollá: hipótesis central; proposiciones fácticas; evidencia favorable; evidencia adversa o explicaciones alternativas; debilidades; y comprobaciones pendientes.",
      "Separá hechos acreditados, inferencias e hipótesis de trabajo. No inventes normas, prueba ni objetivos procesales que no hayan sido indicados.",
    ].join(" "),
  },
};

const esquemaResultadoHerramienta = {
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

function listarHerramientas() {
  return Object.entries(DEFINICIONES_HERRAMIENTAS).map(([id, valor]) => ({ id, ...valor }));
}

function obtenerHerramienta(id) {
  return DEFINICIONES_HERRAMIENTAS[id] || null;
}

module.exports = { obtenerHerramienta, listarHerramientas, esquemaResultadoHerramienta };
