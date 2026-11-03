const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { buildConversationAwareQuery, fuseRankings, handleConversationalIntent, normalizeSourceMarkers,
  prepareToolInput } = require("./servicioChatExpediente");

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

  it("prepara comparaciones documentales con dos fuentes del expediente", () => {
    const input = prepareToolInput({ toolId: "comparar_documentos",
      toolParameters: { document_ids: [1, 2] }, question: "contradicciones",
      documents: [
        { id: 1, nombre_archivo: "Declaracion A", texto_extraido: "La audiencia fue el 3 de mayo." },
        { id: 2, nombre_archivo: "Declaracion B", texto_extraido: "La audiencia fue el 4 de mayo." },
      ], defendants: [], jurisprudence: [] });
    assert.match(input.primaryText, /3 de mayo/);
    assert.match(input.secondaryText, /4 de mayo/);
    assert.ok(input.chunks.some((chunk) => chunk.document_id === 1));
    assert.ok(input.chunks.some((chunk) => chunk.document_id === 2));
  });

  it("rechaza comparaciones incompletas o con elementos ajenos al expediente", () => {
    assert.throws(() => prepareToolInput({ toolId: "comparar_imputados",
      toolParameters: { defendant_ids: [7, 7] }, question: "comparar", documents: [],
      defendants: [{ id: 7, nombre: "Persona A" }], jurisprudence: [] }), /distintos/i);
    assert.throws(() => prepareToolInput({ toolId: "comparar_jurisprudencia",
      toolParameters: { jurisprudence_ids: [3, 9] }, question: "comparar", documents: [], defendants: [],
      jurisprudence: [{ id: 3, titulo: "Fallo A" }] }), /expediente/i);
  });
});
