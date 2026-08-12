const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { fragmentLegalDocument } = require("./fragmentadorJuridico");
const { indexDocument } = require("./indexadorRag");

describe("RAG vectorial documental", () => {
  it("conserva página, orden y sección jurídica", () => {
    const chunks = fragmentLegalDocument({ pages: [{ numero: 7, texto: "CONSIDERANDO\n" + "Hecho probado. ".repeat(100) }] }, { size: 600, overlap: 80 });
    assert.ok(chunks.length > 1);
    assert.equal(chunks[0].page, 7);
    assert.equal(chunks[0].order, 0);
    assert.equal(chunks[0].metadata.section, "CONSIDERANDO");
    assert.ok(chunks[1].start < chunks[0].end);
  });
  it("genera embeddings por lotes y persiste el índice", async () => {
    let saved;
    const document = { id: 4, causa_id: 2, organizacion_id: 1, version: 1, texto_extraido: "RESUELVE\nTexto suficiente para indexar." };
    await indexDocument({ documento_id: 4, causa_id: 2 }, { load: async () => document,
      fragment: () => [{ order: 0, page: 1, text: "Texto", start: 0, end: 5, metadata: {} }],
      embed: async () => [Array(768).fill(0.01)], save: async (...args) => { saved = args; return { fragments: 1 }; } });
    assert.equal(saved[1].length, 1);
    assert.equal(saved[2][0].length, 768);
    assert.equal(saved[3], "nomic-embed-text");
  });
});
