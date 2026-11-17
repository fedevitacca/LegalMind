const rutasDeArchivos = require("node:path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

const MAXIMO_BYTES_ARCHIVO_TEXTO = 15 * 1024 * 1024;

function esArchivoDeTexto(archivo) {
  return [".txt", ".md", ".csv"].includes(rutasDeArchivos.extname(archivo.originalname || "").toLowerCase());
}

function esArchivoPdf(archivo) {
  return rutasDeArchivos.extname(archivo.originalname || "").toLowerCase() === ".pdf";
}

function esArchivoDocx(archivo) { return rutasDeArchivos.extname(archivo.originalname || "").toLowerCase() === ".docx"; }

function extraerTextoPlano(archivo) {
  if (!archivo || !Buffer.isBuffer(archivo.buffer)) {
    throw new Error("No se recibio un archivo TXT para analizar.");
  }

  if (!esArchivoDeTexto(archivo)) {
    throw new Error("Por ahora solo se admiten archivos .txt.");
  }

  const texto = archivo.buffer.toString("utf8").replace(/^\uFEFF/, "").trim();

  if (!texto) {
    throw new Error("El archivo TXT no contiene texto para analizar.");
  }

  return texto;
}

async function extraerTextoDePdf(archivo) {
  if (!archivo || !Buffer.isBuffer(archivo.buffer)) {
    throw new Error("No se recibio un archivo PDF para analizar.");
  }

  if (!esArchivoPdf(archivo)) {
    throw new Error("Por ahora solo se admiten archivos .pdf para esta extraccion.");
  }

  const lectorPdf = new PDFParse({ data: archivo.buffer });
  const interpretado = await lectorPdf.getText();
  await lectorPdf.destroy();
  const texto = String(interpretado.text || "").trim();

  if (!texto) {
    throw new Error("El archivo PDF no contiene texto extraible.");
  }

  return texto;
}

async function extraerTextoDeArchivo(archivo) {
  if (esArchivoDeTexto(archivo)) {
    return extraerTextoPlano(archivo);
  }

  if (esArchivoPdf(archivo)) {
    return extraerTextoDePdf(archivo);
  }

  if (esArchivoDocx(archivo)) {
    const interpretado = await mammoth.extractRawText({ buffer: archivo.buffer });
    const texto = String(interpretado.value || "").replace(/\n{3,}/g, "\n\n").trim();
    if (!texto) throw new Error("El archivo DOCX no contiene texto extraible.");
    return texto;
  }

  throw new Error("Se admiten archivos .pdf, .docx, .txt, .md o .csv.");
}

function esDocumentoCompatible(archivo) { return esArchivoDeTexto(archivo) || esArchivoPdf(archivo) || esArchivoDocx(archivo); }

module.exports = {
  MAXIMO_BYTES_ARCHIVO_TEXTO,
  extraerTextoDePdf,
  extraerTextoDeArchivo,
  extraerTextoPlano,
  esArchivoPdf,
  esArchivoDocx,
  esDocumentoCompatible,
  esArchivoDeTexto,
};
