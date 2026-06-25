const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");

const {
  analyzeLegalTextWithOpenAI,
  resetOpenAIClientFactoryForTests,
  searchLegalTextWithOpenAI,
  setOpenAIClientFactoryForTests,
} = require("./analizadorOpenAI");
const {
  legalMindAnalysisSchema,
  legalMindRagSearchSchema,
} = require("./esquema");

describe("OpenAI legal analyzer", () => {
  afterEach(() => {
    resetOpenAIClientFactoryForTests();
  });

  it("analiza texto usando OpenAI Structured Outputs", async () => {
    let request;
    setOpenAIClientFactoryForTests(() => ({
      responses: {
        create: async (payload) => {
          request = payload;
          return { output_text: JSON.stringify(createSampleAnalysis()) };
        },
      },
    }));

    const analysis = await analyzeLegalTextWithOpenAI(
      "En el legajo nro 789/26 la imputada Ana Gomez fue citada a audiencia."
    );

    assert.equal(request.text.format.type, "json_schema");
    assert.equal(request.text.format.name, "legalmind_analysis");
    assert.deepEqual(request.text.format.schema.required, legalMindAnalysisSchema.required);
    assert.equal(analysis.entidades_juridicas.imputados[0].nombre, "Ana Gomez");
    assert.equal(analysis.rag_juridico.indice_vectorial.proveedor, "openai_responses_api");
  });

  it("ejecuta busqueda RAG usando OpenAI Structured Outputs", async () => {
    let request;
    setOpenAIClientFactoryForTests(() => ({
      responses: {
        create: async (payload) => {
          request = payload;
          return { output_text: JSON.stringify(createSampleRagSearch()) };
        },
      },
    }));

    const result = await searchLegalTextWithOpenAI({
      query: "audiencia Ana Gomez",
      text: "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
    });

    assert.equal(request.text.format.type, "json_schema");
    assert.equal(request.text.format.name, "legalmind_rag_search");
    assert.deepEqual(request.text.format.schema.required, legalMindRagSearchSchema.required);
    assert.equal(result.results[0].id, "fragmento-1");
    assert.match(result.answer.respuesta, /audiencia/i);
  });

  it("exige OPENAI_API_KEY cuando no hay cliente de test", async () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await assert.rejects(
      () => analyzeLegalTextWithOpenAI("Texto juridico."),
      /OPENAI_API_KEY/
    );

    if (previousApiKey) {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
  });
});

function createSampleAnalysis() {
  return {
    resumen: "Se detecto una citacion a audiencia vinculada a Ana Gomez.",
    tipo_documento: "actuacion_de_audiencia",
    causa: {
      datos_generales: ["Identificador de causa o expediente: 789/26"],
      hechos_relevantes: [
        "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
      ],
    },
    imputados: [
      {
        nombre: "Ana Gomez",
        datos_asociados: [
          "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
        ],
        imputaciones: [],
        hechos_vinculados: [],
        documentos_mencionados: [],
      },
    ],
    fechas_relevantes: [
      {
        fecha: "21/05/2026",
        fecha_normalizada: "2026-05-21",
        evento: "Audiencia de Ana Gomez.",
        tipo: "audiencia",
        requiere_alerta: true,
      },
    ],
    categorias: ["imputacion", "actuacion_procesal"],
    actuaciones_pendientes: ["Preparar audiencia de Ana Gomez."],
    observaciones: ["Resultado generado con OpenAI y sujeto a revision profesional."],
    nivel_confianza: "medio",
    entidades_juridicas: {
      causas: [
        {
          id: "causa:789-26",
          identificador: "789/26",
          caratula: null,
          organos_intervinientes: [],
          datos_generales: ["Identificador de causa o expediente: 789/26"],
        },
      ],
      imputados: [
        {
          id: "imputado:ana-gomez",
          nombre: "Ana Gomez",
          rol: "imputado",
          datos_asociados: [
            "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
          ],
          imputaciones: [],
          hechos_vinculados: [],
          documentos_mencionados: [],
        },
      ],
      victimas: [],
      delitos: [],
      organismos: [],
      documentos: [],
      fechas: [
        {
          id: "fecha:audiencia-2026-05-21",
          fecha: "21/05/2026",
          fecha_normalizada: "2026-05-21",
          evento: "Audiencia de Ana Gomez.",
          tipo: "audiencia",
          requiere_alerta: true,
        },
      ],
      actuaciones: [
        {
          id: "actuacion:preparar-audiencia",
          descripcion: "Preparar audiencia de Ana Gomez.",
          estado: "pendiente",
          fuente: "ia",
        },
      ],
    },
    grafo_conocimiento: {
      nodos: [
        {
          id: "causa:789-26",
          tipo: "causa",
          etiqueta: "789/26",
          datos: { referencia: "789/26" },
        },
      ],
      relaciones: [
        {
          id: "relacion:ana-gomez-causa",
          origen: "imputado:ana-gomez",
          destino: "causa:789-26",
          tipo: "imputado_asociado_a_causa",
          evidencia: "La imputada Ana Gomez fue citada a audiencia.",
        },
      ],
    },
    rag_juridico: {
      fragmentos: [
        {
          id: "fragmento-1",
          orden: 1,
          texto: "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
          caracteres_inicio: 0,
          caracteres_fin: 65,
          categorias: ["actuacion_procesal"],
          entidades: ["Ana Gomez"],
          embedding_id: "openai:fragmento-1",
          tokens_estimados: 10,
          relevancia_base: 0.9,
        },
      ],
      indice_vectorial: {
        proveedor: "openai_responses_api",
        dimensiones: 0,
        fragmentos_indexados: 1,
        persistencia: "respuesta_http_y_postgresql_opcional",
      },
      consultas_sugeridas: ["Que actuaciones siguen pendientes?"],
    },
    analisis_estrategico: {
      inconsistencias: [],
      puntos_revision: [
        {
          tipo: "actuacion_pendiente",
          descripcion: "Preparar audiencia de Ana Gomez.",
          prioridad: "alta",
        },
      ],
      cronologia: [
        {
          fecha: "21/05/2026",
          fecha_normalizada: "2026-05-21",
          tipo: "audiencia",
          evento: "Audiencia de Ana Gomez.",
        },
      ],
      omisiones_posibles: [],
    },
    alertas: [
      {
        id: "alerta:audiencia-ana-gomez",
        tipo: "audiencia_proxima",
        titulo: "Audiencia detectada",
        descripcion: "Audiencia de Ana Gomez.",
        fecha: "21/05/2026",
        fecha_normalizada: "2026-05-21",
        prioridad: "alta",
        fuente: "openai",
        estado: "pendiente",
      },
    ],
    scoring_confianza: {
      puntaje: 70,
      nivel: "medio",
      factores: ["Identificador e imputada detectados."],
      requiere_revision: true,
    },
  };
}

function createSampleRagSearch() {
  return {
    query: "audiencia Ana Gomez",
    results: [
      {
        id: "fragmento-1",
        orden: 1,
        texto: "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
        categorias: ["actuacion_procesal"],
        entidades: ["Ana Gomez"],
        score: 0.92,
      },
    ],
    answer: {
      respuesta: "El texto menciona una audiencia vinculada a Ana Gomez.",
      fundamentos: [
        {
          fragmento_id: "fragmento-1",
          texto: "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
          score: 0.92,
        },
      ],
      requiere_revision: true,
    },
  };
}
