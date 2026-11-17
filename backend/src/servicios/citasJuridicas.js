const crypto = require("node:crypto");

function construirCitasJuridicas(fragmentos = [], { caseId: idExpediente } = {}) {
  return fragmentos.map((fragmento, indice) => {
    const idDocumento = String(fragmento.document_id ?? fragmento.documento_id ?? "fuente");
    const ordenDelFragmento = Number(fragmento.chunk_index ?? fragmento.orden ?? indice);
    const pagina = leerEnteroPositivo(fragmento.page ?? fragmento.pagina);
    const texto = String(fragmento.text ?? fragmento.texto ?? "").trim();
    const puntaje = acotarPuntaje(fragmento.score);
    const articulo = fragmento.metadata?.article ?? fragmento.metadata_json?.article ?? null;
    const urlFuente = fragmento.source_url ?? fragmento.metadata?.source_url ?? null;
    const huella = crypto.createHash("sha256")
      .update(`${idDocumento}:${pagina || 0}:${ordenDelFragmento}:${texto}`)
      .digest("hex").slice(0, 16);
    return {
      citation_id: `CIT-${huella}`,
      document_id: idDocumento,
      document_name: String(fragmento.document_name ?? fragmento.nombre_archivo ?? `Documento ${idDocumento}`),
      page: pagina,
      fragment_index: ordenDelFragmento,
      chunk_index: ordenDelFragmento,
      text: texto,
      score: puntaje,
      lexical_score: leerPuntajeOpcional(fragmento.lexical_score),
      semantic_score: leerPuntajeOpcional(fragmento.semantic_score ?? fragmento.embedding_score),
      characters_start: leerNumeroOpcional(fragmento.caracteres_inicio ?? fragmento.start),
      characters_end: leerNumeroOpcional(fragmento.caracteres_fin ?? fragmento.end),
      section: fragmento.metadata?.section ?? fragmento.metadata_json?.section ?? null,
      article: articulo,
      source_type: fragmento.source_type ?? "expediente",
      location_label: articulo || (pagina ? `Página ${pagina} · fragmento ${ordenDelFragmento + 1}` : `Fragmento ${ordenDelFragmento + 1}`),
      document_url: urlFuente || (idExpediente && /^\d+$/.test(idDocumento)
        ? `/casos/${idExpediente}/documentos?documento=${idDocumento}${pagina ? `&pagina=${pagina}` : ""}`
        : null),
    };
  });
}

function evaluarEvidencia(citas) {
  const citasUtiles = citas.filter((cita) => cita.text.length >= 20 && cita.score >= 0.15);
  const promedio = citasUtiles.length ? citasUtiles.reduce((suma, cita) => suma + cita.score, 0) / citasUtiles.length : 0;
  return {
    status: citasUtiles.length >= 2 && promedio >= 0.35 ? "respaldado" : citasUtiles.length ? "parcial" : "sin_respaldo",
    requires_human_review: citasUtiles.length < 2 || promedio < 0.35,
    citations_count: citas.length,
    usable_citations: citasUtiles.length,
    average_score: Number(promedio.toFixed(4)),
  };
}

function verificarAfirmacionesDelResultado(resultado, citas) {
  const afirmaciones = [
    ...(resultado?.hallazgos || []).map((hallazgo, indice) => ({ claim_id: `H-${indice + 1}`, type: "hallazgo",
      text: [hallazgo.titulo, hallazgo.detalle, hallazgo.evidencia].filter(Boolean).join(". ") })),
    ...(resultado?.conclusion ? [{ claim_id: "CONCLUSION", type: "conclusion", text: resultado.conclusion }] : []),
    ...(resultado?.puntos_clave || []).map((punto, indice) => ({ claim_id: `P-${indice + 1}`, type: "punto_clave", text: punto })),
    ...(resultado?.desarrollo || []).map((seccion, indice) => ({ claim_id: `D-${indice + 1}`, type: "desarrollo",
      text: [seccion.titulo, seccion.contenido].filter(Boolean).join(". ") })),
  ];
  const afirmacionesVerificadas = afirmaciones.map((afirmacion) => {
    const coincidencias = citas.map((cita) => ({ citation_id: cita.citation_id,
      overlap: medirCoincidenciaLexica(afirmacion.text, cita.text), score: cita.score }))
      .filter((coincidencia) => coincidencia.overlap >= 0.12)
      .sort((primero, segundo) => (segundo.overlap * segundo.score) - (primero.overlap * primero.score)).slice(0, 3);
    const mejor = coincidencias[0];
    const estado = mejor && mejor.overlap >= 0.28 ? "respaldada" : mejor ? "debil" : "sin_respaldo";
    return { ...afirmacion, status: estado, citation_ids: coincidencias.map((coincidencia) => coincidencia.citation_id),
      support_score: Number((mejor ? mejor.overlap * (0.5 + 0.5 * mejor.score) : 0).toFixed(4)) };
  });
  const respaldadas = afirmacionesVerificadas.filter((afirmacion) => afirmacion.status === "respaldada").length;
  const debiles = afirmacionesVerificadas.filter((afirmacion) => afirmacion.status === "debil").length;
  return { claims: afirmacionesVerificadas, total_claims: afirmacionesVerificadas.length, supported_claims: respaldadas, weak_claims: debiles,
    unsupported_claims: afirmacionesVerificadas.length - respaldadas - debiles,
    coverage: afirmacionesVerificadas.length ? Number((respaldadas / afirmacionesVerificadas.length).toFixed(4)) : 0,
    requires_human_review: afirmacionesVerificadas.some((afirmacion) => afirmacion.status !== "respaldada") };
}

function medirCoincidenciaLexica(izquierda, derecha) {
  const fuente = new Set(terminos(izquierda)); const objetivo = new Set(terminos(derecha));
  if (!fuente.size || !objetivo.size) return 0;
  let cantidadComun = 0; for (const token of fuente) if (objetivo.has(token)) cantidadComun += 1;
  return cantidadComun / fuente.size;
}
function terminos(valor) { return String(valor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .match(/[a-z0-9]{4,}/g)?.filter((token) => !PALABRAS_IGNORADAS.has(token)) || []; }
const PALABRAS_IGNORADAS = new Set(["para", "como", "esta", "este", "entre", "sobre", "desde", "hasta", "tiene", "debe", "puede", "documento", "fuente"]);

function acotarPuntaje(valor) { return Math.max(0, Math.min(1, Number(valor) || 0)); }
function leerPuntajeOpcional(valor) { return valor == null ? null : acotarPuntaje(valor); }
function leerEnteroPositivo(valor) { const numero = Number(valor); return Number.isInteger(numero) && numero > 0 ? numero : null; }
function leerNumeroOpcional(valor) { return Number.isFinite(Number(valor)) ? Number(valor) : null; }

module.exports = { evaluarEvidencia, construirCitasJuridicas, verificarAfirmacionesDelResultado };
