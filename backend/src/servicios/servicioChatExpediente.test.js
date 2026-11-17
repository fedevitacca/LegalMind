const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { construirConsultaConHistorial, fusionarResultados, responderIntencionConversacional, normalizarReferencias,
  prepararEntradaHerramienta } = require("./servicioChatExpediente");

describe("chat conversacional del expediente", () => {
  it("incorpora preguntas anteriores cuando el mensaje depende del contexto", () => {
    const consulta = construirConsultaConHistorial("¿Y cuándo vence eso?", [
      { role: "usuario", content: "¿Cuándo se notificó la resolución?" },
      { role: "asistente", content: "La resolución fue notificada el 3 de mayo." },
    ]);
    assert.match(consulta, /notificó la resolución/i);
    assert.match(consulta, /cuándo vence/i);
  });

  it("fusiona resultados léxicos y vectoriales sin duplicar fragmentos", () => {
    const lexico = [{ document_id: 8, chunk_index: 0, text: "Audiencia", score: 0.8 }];
    const semantico = [
      { document_id: 8, chunk_index: 0, text: "Audiencia", score: 0.9, semantic_score: 0.9 },
      { document_id: 9, chunk_index: 1, text: "Vencimiento", score: 0.7, semantic_score: 0.7 },
    ];
    const resultado = fusionarResultados(lexico, semantico, 5);
    assert.equal(resultado.length, 2);
    assert.equal(resultado[0].document_id, 8);
    assert.ok(resultado[0].score > resultado[1].score);
  });

  it("resuelve saludos sin consultar documentos y valida marcadores de fuente", () => {
    assert.match(responderIntencionConversacional("Hola").respuesta, /revisar los documentos/i);
    assert.equal(normalizarReferencias("Dato [FUENTE 1] y otro [FUENTE 9]", 2), "Dato [1] y otro [fuente no verificada]");
  });

  it("prepara comparaciones documentales con dos fuentes del expediente", () => {
    const entrada = prepararEntradaHerramienta({ idHerramienta: "comparar_documentos",
      parametrosHerramienta: { document_ids: [1, 2] }, pregunta: "contradicciones",
      documentos: [
        { id: 1, nombre_archivo: "Declaracion A", texto_extraido: "La audiencia fue el 3 de mayo." },
        { id: 2, nombre_archivo: "Declaracion B", texto_extraido: "La audiencia fue el 4 de mayo." },
      ], imputados: [], jurisprudencia: [] });
    assert.match(entrada.textoPrincipal, /3 de mayo/);
    assert.match(entrada.textoSecundario, /4 de mayo/);
    assert.ok(entrada.fragmentos.some((fragmento) => fragmento.document_id === 1));
    assert.ok(entrada.fragmentos.some((fragmento) => fragmento.document_id === 2));
  });

  it("rechaza comparaciones incompletas o con elementos ajenos al expediente", () => {
    assert.throws(() => prepararEntradaHerramienta({ idHerramienta: "comparar_imputados",
      parametrosHerramienta: { defendant_ids: [7, 7] }, pregunta: "comparar", documentos: [],
      imputados: [{ id: 7, nombre: "Persona A" }], jurisprudencia: [] }), /distintos/i);
    assert.throws(() => prepararEntradaHerramienta({ idHerramienta: "comparar_jurisprudencia",
      parametrosHerramienta: { jurisprudence_ids: [3, 9] }, pregunta: "comparar", documentos: [], imputados: [],
      jurisprudencia: [{ id: 3, titulo: "Fallo A" }] }), /expediente/i);
  });
});
