const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { analyzeLegalText } = require("./analizador");
const { legalMindAnalysisSchema } = require("./esquema");

function assertAnalysisContract(analysis) {
  for (const key of legalMindAnalysisSchema.required) {
    assert.ok(Object.hasOwn(analysis, key), `Falta el campo ${key}.`);
  }

  assert.equal(typeof analysis.resumen, "string");
  assert.equal(typeof analysis.tipo_documento, "string");
  assert.deepEqual(Object.keys(analysis.causa).sort(), ["datos_generales", "hechos_relevantes"]);
  assert.ok(Array.isArray(analysis.causa.datos_generales));
  assert.ok(Array.isArray(analysis.causa.hechos_relevantes));
  assert.ok(Array.isArray(analysis.imputados));
  assert.ok(Array.isArray(analysis.fechas_relevantes));
  assert.ok(Array.isArray(analysis.categorias));
  assert.ok(Array.isArray(analysis.actuaciones_pendientes));
  assert.ok(Array.isArray(analysis.observaciones));
  assert.ok(legalMindAnalysisSchema.properties.nivel_confianza.enum.includes(analysis.nivel_confianza));
}

describe("analyzeLegalText", () => {
  it("mantiene el contrato para texto vacio", () => {
    const analysis = analyzeLegalText("");

    assertAnalysisContract(analysis);
    assert.equal(analysis.tipo_documento, "desconocido");
    assert.equal(analysis.nivel_confianza, "bajo");
  });

  it("extrae causa, imputado, fechas y actuaciones de un escrito simulado", () => {
    const analysis = analyzeLegalText(`
      En el expte. nro 4567/26 se investiga el hecho ocurrido el 12/05/2026.
      El imputado Juan Perez fue citado a audiencia el 20 de mayo de 2026.
      Debera presentar documentacion antes del vencimiento del plazo.
    `);

    assertAnalysisContract(analysis);
    assert.match(analysis.causa.datos_generales[0], /4567\/26/);
    assert.equal(analysis.imputados[0].nombre, "Juan Perez");
    assert.deepEqual(
      analysis.fechas_relevantes.map(({ fecha }) => fecha),
      ["12/05/2026", "20 de mayo de 2026"]
    );
    assert.ok(analysis.fechas_relevantes.some(({ requiere_alerta }) => requiere_alerta));
    assert.ok(analysis.categorias.includes("imputacion"));
    assert.ok(analysis.categorias.includes("fechas_y_vencimientos"));
    assert.ok(analysis.actuaciones_pendientes.length > 0);
  });

  it("detecta identificadores de legajo", () => {
    const analysis = analyzeLegalText("Legajo N° MPF-123/2026. Se acompana informe pericial.");

    assertAnalysisContract(analysis);
    assert.deepEqual(analysis.causa.datos_generales, [
      "Identificador de causa o expediente: MPF-123/2026",
    ]);
  });
});
