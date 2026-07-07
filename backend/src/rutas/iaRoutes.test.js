const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const PDFDocument = require("pdfkit");

const app = require("../aplicacion");
const {
  resetLocalAIClientFactoryForTests,
  setLocalAIClientFactoryForTests,
} = require("../../IA/analizadorLocal");
const {
  resetRandomForestForTests,
} = require("../../IA/randomForestJuridico");

describe("IA file routes", () => {
  let baseUrl;
  let server;

  before(async () => {
    resetRandomForestForTests();

    setLocalAIClientFactoryForTests(() => ({
      chat: async (payload) => JSON.stringify(
        payload.messages.some((message) => message.content.includes("motor RAG juridico"))
          ? createSampleRagSearch()
          : createSampleLawyerBrief()
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
    resetRandomForestForTests();

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
    assert.match(analysis.informe_abogado.resumen_causa, /Ana Gomez/);
    assert.equal(analysis.datos_locales.numero_causa, "789/26");
    assert.deepEqual(analysis.datos_locales.imputados, ["Ana Gomez"]);
    assert.ok(["alta", "urgente"].includes(analysis.triage.prioridad));
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

  it("extrae datos simples desde texto enviado al RAG local", async () => {
    const response = await fetch(`${baseUrl}/api/ia/rag/extract`, {
      body: JSON.stringify({
        text:
          "Causa nro 4455/2026. Juzgado Federal N. 2. El imputado Martin Lopez fue citado a audiencia el 12/06/2026.",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body._metadata.engine, "local_rag_simple_extractor");
    assert.equal(body.datos_causa.numero_causa, "4455/2026");
    assert.match(body.datos_causa.tribunal, /Juzgado Federal/);
    assert.deepEqual(body.datos_causa.imputados, ["Martin Lopez"]);
  });

  it("extrae datos simples desde archivo TXT", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [
          "Expediente 7788/2026. Tribunal Oral Criminal N. 1. La imputada Ana Torres fue citada a audiencia el 03/07/2026.",
        ],
        "causa.txt",
        { type: "text/plain" }
      )
    );

    const response = await fetch(`${baseUrl}/api/ia/rag/extract`, {
      method: "POST",
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body._metadata.source_file.name, "causa.txt");
    assert.equal(body.datos_causa.numero_causa, "7788/2026");
    assert.deepEqual(body.datos_causa.imputados, ["Ana Torres"]);
  });

  it("extrae datos simples desde archivo PDF", async () => {
    const pdfBuffer = await createPdfBuffer(
      "Legajo 9911/2026. Fiscalia Penal N. 3. El imputado Carlos Diaz fue citado a audiencia el 15/08/2026."
    );
    const formData = new FormData();
    formData.set("file", new File([pdfBuffer], "legajo.pdf", { type: "application/pdf" }));

    const response = await fetch(`${baseUrl}/api/ia/rag/extract`, {
      method: "POST",
      body: formData,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body._metadata.source_file.name, "legajo.pdf");
    assert.equal(body.datos_causa.numero_causa, "9911/2026");
    assert.deepEqual(body.datos_causa.imputados, ["Carlos Diaz"]);
  });

  it("prioriza documentos con Random Forest juridico", async () => {
    const response = await fetch(`${baseUrl}/api/ia/random-forest/triage`, {
      body: JSON.stringify({
        text: "Vence el plazo para apelar la prision preventiva del imputado detenido.",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body._metadata.engine, "legalmind_random_forest_triage");
    assert.equal(body.triage.prioridad, "urgente");
    assert.ok(body.triage.senales_detectadas.some((signal) => signal.clave === "libertad"));
    assert.ok(body.triage.senales_detectadas.some((signal) => signal.clave === "vencimiento"));
  });
});

function createPdfBuffer(text) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.text(text);
    doc.end();
  });
}

function createSampleLawyerBrief() {
  return {
    resumen_causa: "Ana Gomez fue citada a audiencia en el legajo indicado.",
    explicacion_para_abogado:
      "El documento requiere revisar la citacion y preparar la comparecencia de la imputada.",
    lectura_juridica: [
      {
        tema: "Audiencia",
        explicacion: "La citacion puede requerir preparacion defensiva y control de agenda.",
      },
    ],
    puntos_de_atencion: [
      {
        prioridad: "alta",
        descripcion: "Verificar fecha de audiencia.",
        motivo: "La falta de comparecencia puede afectar la defensa.",
      },
    ],
    preguntas_utiles: ["Que documentacion debe preparar la defensa?"],
    limitaciones: ["El texto de prueba no informa delito ni tribunal."],
    nivel_confianza: "medio",
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
