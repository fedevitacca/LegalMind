const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { crearDocumentosDelContexto } = require("./contextoExpediente");

describe("contexto estructurado para RAG", () => {
  it("convierte gestion del expediente en fuentes recuperables", () => {
    const documentos = crearDocumentosDelContexto({
      tasks: [{ titulo: "Presentar prueba", estado: "pendiente", prioridad: "alta", fecha_limite: "2026-11-04" }],
      hearings: [{ titulo: "Audiencia preliminar", fecha: "2026-11-10", objetivo: "Ofrecer prueba" }],
      dates: [{ evento: "Vence traslado", fecha: "2026-11-04", requiere_alerta: true }],
      communications: [{ asunto: "Llamada con cliente", resumen: "Confirmo asistencia" }],
    });

    assert.equal(documentos.length, 4);
    assert.match(documentos.find((elemento) => elemento.id === "gestion-tareas").texto_extraido, /Presentar prueba/);
    assert.match(documentos.find((elemento) => elemento.id === "gestion-audiencias").texto_extraido, /Ofrecer prueba/);
  });

  it("excluye comunicaciones marcadas como privadas", () => {
    const documentos = crearDocumentosDelContexto({
      communications: [{ asunto: "Nota reservada", resumen: "Dato sensible", privada: true }],
    });
    assert.equal(documentos.length, 0);
  });
});
