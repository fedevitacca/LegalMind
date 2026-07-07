const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  buildExtractiveAnswer,
  extractSimpleCaseData,
  retrieveRelevantChunks,
} = require("./ragLocal");

describe("ragLocal", () => {
  it("recupera fragmentos relevantes de documentos de una causa", () => {
    const documents = [
      {
        id: 1,
        nombre_archivo: "audiencia.txt",
        texto_extraido:
          "Se fija audiencia de indagatoria para el 12/05/2026. El imputado Juan Perez debera comparecer con su defensa.",
      },
      {
        id: 2,
        nombre_archivo: "administrativo.txt",
        texto_extraido: "Se agregan copias digitales al legajo para consulta interna.",
      },
    ];

    const chunks = retrieveRelevantChunks(documents, "cuando es la audiencia del imputado", 2);

    assert.equal(chunks[0].document_id, 1);
    assert.match(chunks[0].text, /audiencia/);
  });

  it("genera respuesta extractiva con respaldo", () => {
    const answer = buildExtractiveAnswer("pregunta", [
      {
        score: 0.5,
        text: "La defensa debera presentar documentacion antes del 22/04/2026.",
      },
    ]);

    assert.equal(answer.confidence, "medio");
    assert.match(answer.answer, /documentacion/);
  });

  it("extrae datos simples de una causa desde texto juridico", () => {
    const data = extractSimpleCaseData(`
      Causa nro 9988/2026. Caratula: Perez Juan s/ robo agravado.
      Tribunal Oral Criminal N. 4.
      El imputado Juan Perez fue citado a audiencia el 18 de abril de 2026.
      La victima Laura Rios declaro en sede judicial.
      Se le atribuye el delito de robo agravado.
      La defensa debera presentar documentacion hasta el 22/04/2026.
    `);

    assert.equal(data.numero_causa, "9988/2026");
    assert.match(data.tribunal, /Tribunal Oral Criminal/);
    assert.equal(data.cantidad_imputados, 1);
    assert.deepEqual(data.imputados, ["Juan Perez"]);
    assert.deepEqual(data.victimas, ["Laura Rios"]);
    assert.ok(data.fechas_relevantes.includes("18 de abril de 2026"));
    assert.ok(data.fechas_relevantes.includes("22/04/2026"));
    assert.ok(data.audiencias_o_actos.some((sentence) => sentence.includes("audiencia")));
  });
});
