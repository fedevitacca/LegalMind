const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { construirResultadoRapido, seleccionarPasajes } = require("./respuestaRapida");

describe("respuesta rápida para herramientas", () => {
  const fragmentos = [
    { document_name: "Acta.pdf", text: "La audiencia fue fijada para el 12/08/2026. La defensa fue notificada.", score: 0.9 },
    { document_name: "Informe.pdf", text: "El peritaje no identifica al imputado en la imagen analizada.", score: 0.7 },
  ];

  it("prioriza oraciones relacionadas con la consulta", () => {
    const pasajes = seleccionarPasajes(fragmentos, "¿Cuándo es la audiencia?", 2);
    assert.match(pasajes[0].text, /audiencia/i);
  });

  it("devuelve el mismo contrato de resultado que las herramientas", () => {
    const resultado = construirResultadoRapido({
      toolId: "consulta_rag",
      chunks: fragmentos,
      query: "¿Cuándo es la audiencia?",
      scopeLabel: "los documentos del expediente",
    });
    assert.match(resultado.conclusion, /12\/08\/2026/);
    assert.ok(resultado.puntos_clave.length > 0);
    assert.equal(resultado.desarrollo.length, 2);
    assert.ok(resultado.limitaciones.length > 0);
  });
});
