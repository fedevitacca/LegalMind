const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { buildFastToolResult, selectPassages } = require("./respuestaRapida");

describe("respuesta rápida para herramientas", () => {
  const chunks = [
    { document_name: "Acta.pdf", text: "La audiencia fue fijada para el 12/08/2026. La defensa fue notificada.", score: 0.9 },
    { document_name: "Informe.pdf", text: "El peritaje no identifica al imputado en la imagen analizada.", score: 0.7 },
  ];

  it("prioriza oraciones relacionadas con la consulta", () => {
    const passages = selectPassages(chunks, "¿Cuándo es la audiencia?", 2);
    assert.match(passages[0].text, /audiencia/i);
  });

  it("devuelve el mismo contrato de resultado que las herramientas", () => {
    const result = buildFastToolResult({
      toolId: "consulta_rag",
      chunks,
      query: "¿Cuándo es la audiencia?",
      scopeLabel: "los documentos del expediente",
    });
    assert.match(result.conclusion, /12\/08\/2026/);
    assert.ok(result.puntos_clave.length > 0);
    assert.equal(result.desarrollo.length, 2);
    assert.ok(result.limitaciones.length > 0);
  });
});
