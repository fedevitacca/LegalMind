const path = require("node:path");

const MAX_TEXT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isTxtFile(file) {
  return path.extname(file.originalname || "").toLowerCase() === ".txt";
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

module.exports = {
  MAX_TEXT_FILE_SIZE_BYTES,
  extractTextFromTxtFile,
  isTxtFile,
};
