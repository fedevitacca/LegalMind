const stringArray = {
  type: "array",
  items: { type: "string" },
};

const defendantSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "nombre",
    "datos_asociados",
    "imputaciones",
    "hechos_vinculados",
    "documentos_mencionados",
  ],
  properties: {
    nombre: { type: "string" },
    datos_asociados: stringArray,
    imputaciones: stringArray,
    hechos_vinculados: stringArray,
    documentos_mencionados: stringArray,
  },
};

const dateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fecha", "fecha_normalizada", "evento", "tipo", "requiere_alerta"],
  properties: {
    fecha: { type: "string" },
    fecha_normalizada: {
      type: ["string", "null"],
      description: "Fecha ISO yyyy-mm-dd cuando se puede normalizar.",
    },
    evento: { type: "string" },
    tipo: { type: "string" },
    requiere_alerta: { type: "boolean" },
  },
};

const legalEntitiesSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "causas",
    "imputados",
    "victimas",
    "delitos",
    "organismos",
    "documentos",
    "fechas",
    "actuaciones",
  ],
  properties: {
    causas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "identificador",
          "caratula",
          "organos_intervinientes",
          "datos_generales",
        ],
        properties: {
          id: { type: "string" },
          identificador: { type: ["string", "null"] },
          caratula: { type: ["string", "null"] },
          organos_intervinientes: stringArray,
          datos_generales: stringArray,
        },
      },
    },
    imputados: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "nombre",
          "rol",
          "datos_asociados",
          "imputaciones",
          "hechos_vinculados",
          "documentos_mencionados",
        ],
        properties: {
          id: { type: "string" },
          nombre: { type: "string" },
          rol: { type: "string" },
          datos_asociados: stringArray,
          imputaciones: stringArray,
          hechos_vinculados: stringArray,
          documentos_mencionados: stringArray,
        },
      },
    },
    victimas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "nombre", "rol", "menciones"],
        properties: {
          id: { type: "string" },
          nombre: { type: "string" },
          rol: { type: "string" },
          menciones: stringArray,
        },
      },
    },
    delitos: {
      type: "array",
      items: namedEntitySchema(["id", "nombre", "fuente"]),
    },
    organismos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "tipo", "nombre", "detalle"],
        properties: {
          id: { type: "string" },
          tipo: { type: "string" },
          nombre: { type: "string" },
          detalle: { type: "string" },
        },
      },
    },
    documentos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "tipo", "nombre", "referencia"],
        properties: {
          id: { type: "string" },
          tipo: { type: "string" },
          nombre: { type: "string" },
          referencia: { type: "string" },
        },
      },
    },
    fechas: {
      type: "array",
      items: {
        ...dateSchema,
        required: ["id", ...dateSchema.required],
        properties: {
          id: { type: "string" },
          ...dateSchema.properties,
        },
      },
    },
    actuaciones: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "descripcion", "estado", "fuente"],
        properties: {
          id: { type: "string" },
          descripcion: { type: "string" },
          estado: { type: "string" },
          fuente: { type: "string" },
        },
      },
    },
  },
};

const graphSchema = {
  type: "object",
  additionalProperties: false,
  required: ["nodos", "relaciones"],
  properties: {
    nodos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "tipo", "etiqueta", "datos"],
        properties: {
          id: { type: "string" },
          tipo: { type: "string" },
          etiqueta: { type: "string" },
          datos: {
            type: "object",
            additionalProperties: false,
            required: ["referencia"],
            properties: {
              referencia: { type: "string" },
            },
          },
        },
      },
    },
    relaciones: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "origen", "destino", "tipo", "evidencia"],
        properties: {
          id: { type: "string" },
          origen: { type: "string" },
          destino: { type: "string" },
          tipo: { type: "string" },
          evidencia: { type: "string" },
        },
      },
    },
  },
};

const ragSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fragmentos", "indice_vectorial", "consultas_sugeridas"],
  properties: {
    fragmentos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "orden",
          "texto",
          "caracteres_inicio",
          "caracteres_fin",
          "categorias",
          "entidades",
          "embedding_id",
          "tokens_estimados",
          "relevancia_base",
        ],
        properties: {
          id: { type: "string" },
          orden: { type: "number" },
          texto: { type: "string" },
          caracteres_inicio: { type: "number" },
          caracteres_fin: { type: "number" },
          categorias: stringArray,
          entidades: stringArray,
          embedding_id: { type: "string" },
          tokens_estimados: { type: "number" },
          relevancia_base: { type: "number" },
        },
      },
    },
    indice_vectorial: {
      type: "object",
      additionalProperties: false,
      required: ["proveedor", "dimensiones", "fragmentos_indexados", "persistencia"],
      properties: {
        proveedor: { type: "string" },
        dimensiones: { type: "number" },
        fragmentos_indexados: { type: "number" },
        persistencia: { type: "string" },
      },
    },
    consultas_sugeridas: stringArray,
  },
};

const strategicAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["inconsistencias", "puntos_revision", "cronologia", "omisiones_posibles"],
  properties: {
    inconsistencias: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "descripcion", "evidencia", "severidad"],
        properties: {
          tipo: { type: "string" },
          descripcion: { type: "string" },
          evidencia: stringArray,
          severidad: { type: "string" },
        },
      },
    },
    puntos_revision: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "descripcion", "prioridad"],
        properties: {
          tipo: { type: "string" },
          descripcion: { type: "string" },
          prioridad: { type: "string" },
        },
      },
    },
    cronologia: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fecha", "fecha_normalizada", "tipo", "evento"],
        properties: {
          fecha: { type: "string" },
          fecha_normalizada: { type: "string" },
          tipo: { type: "string" },
          evento: { type: "string" },
        },
      },
    },
    omisiones_posibles: stringArray,
  },
};

const alertSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "tipo",
    "titulo",
    "descripcion",
    "fecha",
    "fecha_normalizada",
    "prioridad",
    "fuente",
    "estado",
  ],
  properties: {
    id: { type: "string" },
    tipo: { type: "string" },
    titulo: { type: "string" },
    descripcion: { type: "string" },
    fecha: { type: ["string", "null"] },
    fecha_normalizada: { type: ["string", "null"] },
    prioridad: { type: "string" },
    fuente: { type: "string" },
    estado: { type: "string" },
  },
};

const confidenceScoreSchema = {
  type: "object",
  additionalProperties: false,
  required: ["puntaje", "nivel", "factores", "requiere_revision"],
  properties: {
    puntaje: { type: "number" },
    nivel: {
      type: "string",
      enum: ["alto", "medio", "bajo", "muy_bajo"],
    },
    factores: stringArray,
    requiere_revision: { type: "boolean" },
  },
};

const legalMindRagSearchSchema = {
  type: "object",
  additionalProperties: false,
  required: ["query", "results", "answer"],
  properties: {
    query: { type: "string" },
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "orden", "texto", "categorias", "entidades", "score"],
        properties: {
          id: { type: "string" },
          orden: { type: "number" },
          texto: { type: "string" },
          categorias: stringArray,
          entidades: stringArray,
          score: { type: "number" },
        },
      },
    },
    answer: {
      type: "object",
      additionalProperties: false,
      required: ["respuesta", "fundamentos", "requiere_revision"],
      properties: {
        respuesta: { type: "string" },
        fundamentos: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["fragmento_id", "texto", "score"],
            properties: {
              fragmento_id: { type: "string" },
              texto: { type: "string" },
              score: { type: "number" },
            },
          },
        },
        requiere_revision: { type: "boolean" },
      },
    },
  },
};

function namedEntitySchema(required) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties: {
      id: { type: "string" },
      nombre: { type: "string" },
      fuente: { type: "string" },
    },
  };
}

const legalMindAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "resumen",
    "tipo_documento",
    "causa",
    "imputados",
    "fechas_relevantes",
    "categorias",
    "actuaciones_pendientes",
    "observaciones",
    "nivel_confianza",
    "entidades_juridicas",
    "grafo_conocimiento",
    "rag_juridico",
    "analisis_estrategico",
    "alertas",
    "scoring_confianza",
  ],
  properties: {
    resumen: {
      type: "string",
      description: "Resumen claro y breve del documento analizado.",
    },
    tipo_documento: {
      type: "string",
      description: "Tipo probable del documento juridico.",
    },
    causa: {
      type: "object",
      additionalProperties: false,
      required: ["datos_generales", "hechos_relevantes"],
      properties: {
        datos_generales: stringArray,
        hechos_relevantes: stringArray,
      },
    },
    imputados: {
      type: "array",
      items: defendantSchema,
    },
    fechas_relevantes: {
      type: "array",
      items: dateSchema,
    },
    categorias: stringArray,
    actuaciones_pendientes: stringArray,
    observaciones: stringArray,
    nivel_confianza: {
      type: "string",
      enum: ["alto", "medio", "bajo", "muy_bajo"],
    },
    entidades_juridicas: legalEntitiesSchema,
    grafo_conocimiento: graphSchema,
    rag_juridico: ragSchema,
    analisis_estrategico: strategicAnalysisSchema,
    alertas: {
      type: "array",
      items: alertSchema,
    },
    scoring_confianza: confidenceScoreSchema,
  },
};

module.exports = {
  legalMindAnalysisSchema,
  legalMindRagSearchSchema,
};
