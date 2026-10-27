const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { buildGroundedLegalAnswer } = require("./respuestaJuridicaExtractiva");

describe("respuestaJuridicaExtractiva", () => {
  it("separa evidencia del expediente y normativa sin usar un modelo generativo", () => {
    const result = buildGroundedLegalAnswer({
      question: "¿Hay peligro de fuga para ordenar prisión preventiva?",
      caseChunks: [{ document_name: "Acta", text: "El imputado intentó abandonar el país.", score: 0.8 }],
      legalChunks: [{ document_name: "Código Procesal Penal Federal", text: "Las restricciones sólo podrán fundarse en peligro real de fuga.", score: 0.9, metadata: { article: "Artículo 17" } }],
    });
    assert.equal(result.confidence, "alto");
    assert.match(result.answer, /Según el expediente/);
    assert.match(result.answer, /Marco normativo nacional y federal/);
    assert.match(result.answer, /Artículo 17/);
  });

  it("declara falta de evidencia en lugar de inventar", () => {
    const result = buildGroundedLegalAnswer({ question: "consulta" });
    assert.equal(result.confidence, "bajo");
    assert.match(result.answer, /No se encontró evidencia suficiente/);
  });
});

