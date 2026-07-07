const path = require("node:path");
const { PDFParse } = require("pdf-parse");

const MAX_TEXT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isTxtFile(file) {
  return path.extname(file.originalname || "").toLowerCase() === ".txt";
}

function isPdfFile(file) {
  return path.extname(file.originalname || "").toLowerCase() === ".pdf";
}

function extractTextFromTxtFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error("No se recibio un archivo TXT para analizar.");
  }

  if (!isTxtFile(file)) {
    throw new Error("Por ahora solo se admiten archivos .txt.");
  }

  const text = file.buffer.toString("utf8").replace(/^\uFEFF/, "").trim();

  if (!text) {
    throw new Error("El archivo TXT no contiene texto para analizar.");
  }

  return text;
}

async function extractTextFromPdfFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error("No se recibio un archivo PDF para analizar.");
  }

  if (!isPdfFile(file)) {
    throw new Error("Por ahora solo se admiten archivos .pdf para esta extraccion.");
  }

  const parser = new PDFParse({ data: file.buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = String(parsed.text || "").trim();

  if (!text) {
    throw new Error("El archivo PDF no contiene texto extraible.");
  }

  return text;
}

async function extractTextFromSupportedFile(file) {
  if (isTxtFile(file)) {
    return extractTextFromTxtFile(file);
  }

  if (isPdfFile(file)) {
    return extractTextFromPdfFile(file);
  }

  throw new Error("Por ahora solo se admiten archivos .txt o .pdf.");
}

module.exports = {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromPdfFile,
  extractTextFromSupportedFile,
  extractTextFromTxtFile,
  isPdfFile,
  isTxtFile,
};
