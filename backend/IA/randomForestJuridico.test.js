const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  triageLegalDocumentWithRandomForest,
  vectorizeLegalText,
} = require("./randomForestJuridico");

describe("randomForestJuridico", () => {
  it("prioriza como urgente documentos con vencimiento y libertad comprometida", () => {
    const result = triageLegalDocumentWithRandomForest(
      "Vence manana el plazo para apelar la prision preventiva del imputado detenido."
    );

    assert.equal(result.prioridad, "urgente");
    assert.ok(result.confianza > 0);
    assert.ok(result.senales_detectadas.some((signal) => signal.clave === "vencimiento"));
    assert.ok(result.senales_detectadas.some((signal) => signal.clave === "libertad"));
  });

  it("detecta movimientos administrativos como baja prioridad", () => {
    const result = triageLegalDocumentWithRandomForest(
      "Se agregan copias digitales y constancia de archivo para consulta interna."
    );

    assert.equal(result.prioridad, "baja");
    assert.ok(result.senales_detectadas.some((signal) => signal.clave === "administrativo"));
  });

  it("vectoriza senales juridicas relevantes", () => {
    const features = vectorizeLegalText(
      "Audiencia de indagatoria el 12/08/2026 con informe pericial agregado."
    );

    assert.ok(features.audiencia > 0);
    assert.ok(features.fechas > 0);
    assert.ok(features.prueba > 0);
  });
});
