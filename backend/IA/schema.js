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
        datos_generales: {
          type: "array",
          items: { type: "string" },
        },
        hechos_relevantes: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    imputados: {
      type: "array",
      items: {
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
          datos_asociados: {
            type: "array",
            items: { type: "string" },
          },
          imputaciones: {
            type: "array",
            items: { type: "string" },
          },
          hechos_vinculados: {
            type: "array",
            items: { type: "string" },
          },
          documentos_mencionados: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    fechas_relevantes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fecha", "evento", "tipo", "requiere_alerta"],
        properties: {
          fecha: { type: "string" },
          evento: { type: "string" },
          tipo: { type: "string" },
          requiere_alerta: { type: "boolean" },
        },
      },
    },
    categorias: {
      type: "array",
      items: { type: "string" },
    },
    actuaciones_pendientes: {
      type: "array",
      items: { type: "string" },
    },
    observaciones: {
      type: "array",
      items: { type: "string" },
    },
    nivel_confianza: {
      type: "string",
      enum: ["alto", "medio", "bajo", "muy_bajo"],
    },
  },
};

module.exports = {
  legalMindAnalysisSchema,
};
