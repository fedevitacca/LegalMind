function construirRespuestaConEvidencia({ question: pregunta, caseChunks: fragmentosExpediente = [],
  legalChunks: fragmentosNormativa = [], libraryChunks: fragmentosBiblioteca = [] }) {
  if (!fragmentosExpediente.length && !fragmentosNormativa.length && !fragmentosBiblioteca.length) {
    return {
      answer: "No se encontró evidencia suficiente en el expediente ni en la biblioteca jurídica nacional y federal.",
      confidence: "bajo",
      requires_human_review: true,
    };
  }

  const secciones = [];
  const evidenciaDelExpediente = seleccionarOracionesConEvidencia(pregunta, fragmentosExpediente, 3);
  const evidenciaNormativa = seleccionarOracionesConEvidencia(pregunta, fragmentosNormativa, 4);
  const evidenciaBiblioteca = seleccionarOracionesConEvidencia(pregunta, fragmentosBiblioteca, 4);
  if (evidenciaDelExpediente.length) secciones.push(`Según el expediente:\n${formatearEvidencia(evidenciaDelExpediente)}`);
  if (evidenciaNormativa.length) secciones.push(`Marco normativo nacional y federal:\n${formatearEvidencia(evidenciaNormativa)}`);
  if (evidenciaBiblioteca.length) secciones.push(`Biblioteca jurídica del estudio:\n${formatearEvidencia(evidenciaBiblioteca)}`);
  secciones.push("Conclusión: la respuesta se limita a los fragmentos citados. Debe verificarse su vigencia y aplicación al caso concreto.");

  return {
    answer: secciones.join("\n\n"),
    confidence: evidenciaDelExpediente.length && evidenciaNormativa.length ? "alto" : "medio",
    requires_human_review: true,
  };
}

function seleccionarOracionesConEvidencia(pregunta, fragmentos, limite) {
  const terminosConsulta = terminos(pregunta);
  return fragmentos.flatMap((fragmento, indiceFragmento) => separarOraciones(fragmento.text).map((oracion) => ({
    sentence: oracion,
    chunk: fragmento,
    chunkIndex: indiceFragmento,
    relevance: calcularCoincidencia(terminosConsulta, terminos(oracion)) + (Number(fragmento.score) || 0),
  })))
    .filter((elemento) => elemento.sentence.length >= 20)
    .sort((izquierda, derecha) => derecha.relevance - izquierda.relevance)
    .filter((elemento, indice, elementos) => elementos.findIndex((candidato) => normalizar(candidato.sentence) === normalizar(elemento.sentence)) === indice)
    .slice(0, limite);
}

function formatearEvidencia(elementos) {
  return elementos.map(({ sentence: oracion, chunk: fragmento }) => {
    const articulo = fragmento.metadata?.article ? `, ${fragmento.metadata.article}` : "";
    return `- ${oracion} [${fragmento.document_name}${articulo}]`;
  }).join("\n");
}

function separarOraciones(valor) {
  return String(valor || "").replace(/\s+/g, " ").split(/(?<=[.!?;:])\s+/).map((elemento) => elemento.trim()).filter(Boolean);
}
function terminos(valor) { return new Set(normalizar(valor).match(/[a-z0-9]{3,}/g) || []); }
function normalizar(valor) { return String(valor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function calcularCoincidencia(izquierda, derecha) { if (!izquierda.size) return 0; let cantidadComun = 0; for (const token of izquierda) if (derecha.has(token)) cantidadComun += 1; return cantidadComun / izquierda.size; }

module.exports = { construirRespuestaConEvidencia, seleccionarOracionesConEvidencia };

