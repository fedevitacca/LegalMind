const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");
const { listTools, toolResultSchema } = require("./motorHerramientas");
const {
  resetLocalAIClientFactoryForTests,
  runLegalToolWithLocalAI,
  setLocalAIClientFactoryForTests,
} = require("./analizadorLocal");

describe("motorHerramientas", () => {
  afterEach(() => resetLocalAIClientFactoryForTests());

  it("solicita un informe desarrollado y específico para cada herramienta", async () => {
    const payloads = [];
    setLocalAIClientFactoryForTests(() => ({
      chat: async (payload) => {
        payloads.push(payload);
        return JSON.stringify(sampleExpandedResult());
      },
    }));

    for (const tool of listTools()) {
      const result = await runLegalToolWithLocalAI({
        toolId: tool.id,
        primaryText: "Documento jurídico de prueba.",
        secondaryText: tool.inputs === 2 ? "Segundo documento jurídico de prueba." : "",
        query: "Preparar una revisión profesional.",
        context: ["[fuente:0] Pasaje documental pertinente."],
      });

      assert.equal(result.desarrollo.length, 2);
      assert.equal(result.puntos_clave.length, 3);
      assert.equal(result.acciones_sugeridas.length, 2);
      assert.equal(result.limitaciones.length, 1);
    }

    assert.equal(payloads.length, listTools().length);
    payloads.forEach((payload, index) => {
      assert.equal(payload.maxOutputTokens, listTools()[index].maxOutputTokens);
      assert.match(payload.messages[0].content, new RegExp(escapeRegExp(listTools()[index].instruction.slice(0, 35)), "i"));
      assert.match(payload.messages[1].content, /PASAJES DOCUMENTALES SELECCIONADOS POR PERTINENCIA/);
    });
    assert.ok(toolResultSchema.required.includes("desarrollo"));
    assert.ok(toolResultSchema.required.includes("acciones_sugeridas"));
    assert.ok(toolResultSchema.required.includes("limitaciones"));
  });
});

function sampleExpandedResult() {
  return {
    titulo: "Informe jurídico de prueba",
    conclusion: "La documentación permite una conclusión preliminar fundada. Deben verificarse los extremos que la fuente no desarrolla.",
    puntos_clave: ["Primer punto relevante.", "Segundo punto relevante.", "Tercer punto relevante."],
    desarrollo: [
      { titulo: "Antecedentes", contenido: "La fuente presenta los antecedentes necesarios para orientar la revisión." },
      { titulo: "Lectura práctica", contenido: "El contenido permite identificar una línea de trabajo sujeta a verificación profesional." },
    ],
    acciones_sugeridas: ["Controlar la documentación relacionada.", "Confirmar los datos pendientes."],
    limitaciones: ["La fuente de prueba tiene alcance acotado."],
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
