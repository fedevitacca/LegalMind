const { seleccionarOracionesConEvidencia } = require("../../IA/respuestaJuridicaExtractiva");

const columnasPorHerramienta = {
  cronologia: ["Fecha y hora", "Actuación", "Responsable", "Estado", "Fuente"],
  comparar_documentos: ["Punto", "Documento A", "Documento B", "Diferencia", "Fuentes"],
  comparar_imputados: ["Aspecto", "Persona A", "Persona B", "Qué falta verificar", "Fuentes"],
  comparar_jurisprudencia: ["Cuestión", "Criterio del fallo A", "Criterio del fallo B", "Relevancia para el caso", "Fuentes"],
  resumen_expediente: ["Aspecto", "Resumen", "Fuente"],
  teoria_del_caso: ["Punto", "Evidencia a favor", "Evidencia en contra", "Qué falta verificar", "Fuentes"],
};

function obtenerColumnasDeTabla(idHerramienta) {
  return columnasPorHerramienta[idHerramienta] || ["Aspecto", "Respuesta", "Fuente"];
}

function leerTablaChat(respuestaRedactada) {
  const lineas = respuestaRedactada.split(/\r?\n/);
  const indiceSeparador = lineas.findIndex((linea, indice) => indice > 0 &&
    linea.includes("|") && dividirFila(linea).every((celda) => /^:?-{3,}:?$/.test(celda)));
  if (indiceSeparador < 1) return null;

  const columnas = dividirFila(lineas[indiceSeparador - 1]);
  if (columnas.length < 2 || columnas.length > 6 || columnas.some((columna) => !columna) ||
    columnas.length !== dividirFila(lineas[indiceSeparador]).length) return null;

  const filas = [];
  for (const linea of lineas.slice(indiceSeparador + 1)) {
    if (!linea.includes("|") || filas.length >= 12) break;
    const celdas = dividirFila(linea);
    if (celdas.length !== columnas.length) return null;
    if (celdas.some(Boolean)) filas.push(celdas);
  }
  return filas.length ? { columns: columnas, rows: filas } : null;
}

function dividirFila(linea) {
  return linea.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/).map((celda) => celda.trim().replace(/\\\|/g, "|"));
}

function construirTablaDeEvidencia(pregunta, fragmentos, citas) {
  const filas = seleccionarOracionesConEvidencia(pregunta, fragmentos, 6).map(({ sentence: oracion, chunkIndex: indiceFragmento }) => {
    const cita = citas[indiceFragmento];
    return [`[${indiceFragmento + 1}] ${cita.document_name}`, cita.location_label, oracion];
  });
  return filas.length ? { columns: ["Fuente", "Ubicación", "Pasaje"], rows: filas, caption: "Fragmentos recuperados" } : null;
}

module.exports = { construirTablaDeEvidencia, obtenerColumnasDeTabla, leerTablaChat };
