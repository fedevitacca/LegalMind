const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { assessEvidence, buildLegalCitations } = require("./citasJuridicas");

describe("citas jurídicas verificables", () => {
  it("construye una referencia estable con página y enlace interno", () => {
    const [citation] = buildLegalCitations([{ document_id: 8, document_name: "fallo.pdf", page: 4,
      chunk_index: 2, text: "La medida exige riesgos procesales concretos.", score: 0.81 }], { caseId: 3 });
    assert.match(citation.citation_id, /^CIT-[a-f0-9]{16}$/);
    assert.equal(citation.location_label, "Página 4 · fragmento 3");
    assert.equal(citation.document_url, "/casos/3/documentos?documento=8&pagina=4");
  });
  it("marca respaldo insuficiente cuando sólo hay un pasaje débil", () => {
    const assessment = assessEvidence(buildLegalCitations([{ text: "Texto breve pero verificable.", score: 0.2 }]));
    assert.equal(assessment.status, "parcial");
    assert.equal(assessment.requires_human_review, true);
  });
});
