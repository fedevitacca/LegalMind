const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

const app = require("../aplicacion");
const {
  resetLocalAIClientFactoryForTests,
  setLocalAIClientFactoryForTests,
} = require("../../IA/analizadorLocal");

describe("IA file routes", () => {
  let baseUrl;
  let server;

  before(async () => {
    setLocalAIClientFactoryForTests(() => ({
      chat: async (payload) => JSON.stringify(
        payload.messages.some((message) => message.content.includes("motor RAG juridico"))
          ? createSampleRagSearch()
          : createSampleAnalysis()
      ),
    }));

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    resetLocalAIClientFactoryForTests();

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("analiza un archivo TXT con la API local", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [
          "En el legajo nro 789/26 el imputado Ana Gomez fue citada a audiencia el 21/05/2026.",
        ],
        "legajo.txt",
        { type: "text/plain" }
      )
    );

    const response = await fetch(`${baseUrl}/api/ia/analyze-file`, {
      method: "POST",
      body: formData,
    });
    const analysis = await response.json();

    assert.equal(response.status, 200);
    assert.equal(analysis._metadata.engine, "local");
    assert.equal(analysis._metadata.source_file.name, "legajo.txt");
    assert.match(analysis.causa.datos_generales[0], /789\/26/);
    assert.equal(analysis.imputados[0].nombre, "Ana Gomez");
  });

  it("rechaza archivos sin extractor disponible", async () => {
    const formData = new FormData();
    formData.set("file", new File(["pdf"], "legajo.pdf", { type: "application/pdf" }));

    const response = await fetch(`${baseUrl}/api/ia/analyze-file`, {
      method: "POST",
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /solo se admiten archivos \.txt/);
  });

  it("rechaza el modo openai", async () => {
    const response = await fetch(`${baseUrl}/api/ia/analyze`, {
      body: JSON.stringify({
        mode: "openai",
        text: "Texto juridico.",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /Solo esta habilitada la API local/);
  });

  it("busca fragmentos juridicos con la API local", async () => {
    const response = await fetch(`${baseUrl}/api/ia/rag/search`, {
      body: JSON.stringify({
        query: "audiencia de Ana Gomez",
        text:
          "En el legajo nro 789/26 la imputada Ana Gomez fue citada a audiencia el 21/05/2026. Obra informe pericial.",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body._metadata.engine, "local");
    assert.ok(body.results.length > 0);
    assert.match(body.results[0].texto, /Ana Gomez|audiencia/);
    assert.ok(body.answer.fundamentos.length > 0);
  });
});

function createSampleAnalysis() {
  return {
    resumen: "Ana Gomez fue citada a audiencia.",
    tipo_documento: "actuacion_de_audiencia",
    causa: {
      datos_generales: ["Identificador de causa o expediente: 789/26"],
      hechos_relevantes: ["Ana Gomez fue citada a audiencia el 21/05/2026."],
    },
    imputados: [
      {
        nombre: "Ana Gomez",
        datos_asociados: ["Ana Gomez fue citada a audiencia el 21/05/2026."],
        imputaciones: [],
        hechos_vinculados: [],
        documentos_mencionados: [],
      },
    ],
    fechas_relevantes: [],
    categorias: [],
    actuaciones_pendientes: [],
    observaciones: [],
    nivel_confianza: "medio",
    entidades_juridicas: {
      causas: [],
      imputados: [],
      victimas: [],
      delitos: [],
      organismos: [],
      documentos: [],
      fechas: [],
      actuaciones: [],
    },
    grafo_conocimiento: {
      nodos: [],
      relaciones: [],
    },
    rag_juridico: {
      fragmentos: [],
      indice_vectorial: {
        proveedor: "ollama_local",
        dimensiones: 0,
        fragmentos_indexados: 0,
        persistencia: "respuesta_http_y_postgresql_opcional",
      },
      consultas_sugeridas: [],
    },
    analisis_estrategico: {
      inconsistencias: [],
      puntos_revision: [],
      cronologia: [],
      omisiones_posibles: [],
    },
    alertas: [],
    scoring_confianza: {
      puntaje: 70,
      nivel: "medio",
      factores: [],
      requiere_revision: true,
    },
  };
}

function createSampleRagSearch() {
  return {
    query: "audiencia de Ana Gomez",
    results: [
      {
        id: "fragmento-1",
        orden: 1,
        texto: "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
        categorias: ["actuacion_procesal"],
        entidades: ["Ana Gomez"],
        score: 0.91,
      },
    ],
    answer: {
      respuesta: "El texto menciona una audiencia de Ana Gomez.",
      fundamentos: [
        {
          fragmento_id: "fragmento-1",
          texto: "La imputada Ana Gomez fue citada a audiencia el 21/05/2026.",
          score: 0.91,
        },
      ],
      requiere_revision: true,
    },
  };
}
