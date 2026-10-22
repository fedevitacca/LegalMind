const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { buildStructuredCaseDocuments } = require("./contextoExpediente");

describe("contexto estructurado para RAG", () => {
  it("convierte gestion del expediente en fuentes recuperables", () => {
    const documents = buildStructuredCaseDocuments({
      tasks: [{ titulo: "Presentar prueba", estado: "pendiente", prioridad: "alta", fecha_limite: "2026-11-04" }],
      hearings: [{ titulo: "Audiencia preliminar", fecha: "2026-11-10", objetivo: "Ofrecer prueba" }],
      dates: [{ evento: "Vence traslado", fecha: "2026-11-04", requiere_alerta: true }],
      communications: [{ asunto: "Llamada con cliente", resumen: "Confirmo asistencia" }],
    });

    assert.equal(documents.length, 4);
    assert.match(documents.find((item) => item.id === "gestion-tareas").texto_extraido, /Presentar prueba/);
    assert.match(documents.find((item) => item.id === "gestion-audiencias").texto_extraido, /Ofrecer prueba/);
  });

  it("excluye comunicaciones marcadas como privadas", () => {
    const documents = buildStructuredCaseDocuments({
      communications: [{ asunto: "Nota reservada", resumen: "Dato sensible", privada: true }],
    });
    assert.equal(documents.length, 0);
  });
});
