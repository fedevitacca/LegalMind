const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { assessEvidence, buildLegalCitations, verifyResultClaims } = require("./citasJuridicas");

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
  it("vincula afirmaciones con citas y detecta conclusiones sin respaldo", () => {
    const citations = buildLegalCitations([{ text: "Existe peligro concreto de fuga y entorpecimiento de la investigación.", score: 0.8 }]);
    const verification = verifyResultClaims({ hallazgos: [{ titulo: "Riesgo de fuga", detalle: "Existe peligro concreto de fuga.", evidencia: "" }],
      conclusion: "El imputado confesó el hecho." }, citations);
    assert.equal(verification.claims[0].status, "respaldada");
    assert.equal(verification.claims[1].status, "sin_respaldo");
    assert.equal(verification.requires_human_review, true);
  });
});
