const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { buildConversationAwareQuery, fuseRankings, handleConversationalIntent, normalizeSourceMarkers } = require("./servicioChatExpediente");

describe("chat conversacional del expediente", () => {
  it("incorpora preguntas anteriores cuando el mensaje depende del contexto", () => {
    const query = buildConversationAwareQuery("¿Y cuándo vence eso?", [
      { role: "usuario", content: "¿Cuándo se notificó la resolución?" },
      { role: "asistente", content: "La resolución fue notificada el 3 de mayo." },
    ]);
    assert.match(query, /notificó la resolución/i);
    assert.match(query, /cuándo vence/i);
  });

  it("fusiona resultados léxicos y vectoriales sin duplicar fragmentos", () => {
    const lexical = [{ document_id: 8, chunk_index: 0, text: "Audiencia", score: 0.8 }];
    const semantic = [
      { document_id: 8, chunk_index: 0, text: "Audiencia", score: 0.9, semantic_score: 0.9 },
      { document_id: 9, chunk_index: 1, text: "Vencimiento", score: 0.7, semantic_score: 0.7 },
    ];
    const result = fuseRankings(lexical, semantic, 5);
    assert.equal(result.length, 2);
    assert.equal(result[0].document_id, 8);
    assert.ok(result[0].score > result[1].score);
  });

  it("resuelve saludos sin consultar documentos y valida marcadores de fuente", () => {
    assert.match(handleConversationalIntent("Hola").answer, /revisar los documentos/i);
    assert.equal(normalizeSourceMarkers("Dato [FUENTE 1] y otro [FUENTE 9]", 2), "Dato [1] y otro [fuente no verificada]");
  });
});
