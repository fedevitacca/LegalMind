const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { evaluarEvidencia, construirCitasJuridicas, verificarAfirmacionesDelResultado } = require("./citasJuridicas");

describe("citas jurídicas verificables", () => {
  it("construye una referencia estable con página y enlace interno", () => {
    const [cita] = construirCitasJuridicas([{ document_id: 8, document_name: "fallo.pdf", page: 4,
      chunk_index: 2, text: "La medida exige riesgos procesales concretos.", score: 0.81 }], { caseId: 3 });
    assert.match(cita.citation_id, /^CIT-[a-f0-9]{16}$/);
    assert.equal(cita.location_label, "Página 4 · fragmento 3");
    assert.equal(cita.document_url, "/casos/3/documentos?documento=8&pagina=4");
  });
  it("marca respaldo insuficiente cuando sólo hay un pasaje débil", () => {
    const evaluacion = evaluarEvidencia(construirCitasJuridicas([{ text: "Texto breve pero verificable.", score: 0.2 }]));
    assert.equal(evaluacion.status, "parcial");
    assert.equal(evaluacion.requires_human_review, true);
  });
  it("vincula afirmaciones con citas y detecta conclusiones sin respaldo", () => {
    const citas = construirCitasJuridicas([{ text: "Existe peligro concreto de fuga y entorpecimiento de la investigación.", score: 0.8 }]);
    const verificacion = verificarAfirmacionesDelResultado({ hallazgos: [{ titulo: "Riesgo de fuga", detalle: "Existe peligro concreto de fuga.", evidencia: "" }],
      conclusion: "El imputado confesó el hecho." }, citas);
    assert.equal(verificacion.claims[0].status, "respaldada");
    assert.equal(verificacion.claims[1].status, "sin_respaldo");
    assert.equal(verificacion.requires_human_review, true);
  });
});
