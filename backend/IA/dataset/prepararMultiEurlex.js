const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const outputPath = path.join(__dirname, "dataset_multieurlex_es.csv");
const sourceFile = process.env.MULTIEURLEX_SOURCE_FILE;
const sampleSize = Number(process.env.MULTIEURLEX_SAMPLE_SIZE || 1000);
const split = process.env.MULTIEURLEX_SPLIT || "train";
const dataset = process.env.MULTIEURLEX_HF_DATASET || "coastalcph/multi_eurlex";
const config = process.env.MULTIEURLEX_CONFIG || "es";

async function main() {
  const examples = sourceFile
    ? readLocalExamples(sourceFile)
    : await downloadExamplesFromHuggingFace();

  const normalized = examples
    .map((example, index) => normalizeExample(example, index + 1))
    .filter((example) => example.texto.length > 80)
    .slice(0, sampleSize);

  if (!normalized.length) {
    throw new Error("No se pudieron preparar ejemplos de MultiEURLEX.");
  }

  writeCsv(normalized);
  console.log(`Dataset preparado: ${outputPath}`);
  console.log(`Ejemplos: ${normalized.length}`);
}

function readLocalExamples(filePath) {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, "utf8");

  if (absolutePath.endsWith(".jsonl")) {
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  if (absolutePath.endsWith(".json")) {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.rows || parsed.data || [];
  }

  if (absolutePath.endsWith(".csv")) {
    return parseSimpleCsv(content);
  }

  throw new Error("Formato no soportado. Usar JSONL, JSON o CSV.");
}

async function downloadExamplesFromHuggingFace() {
  const url =
    "https://datasets-server.huggingface.co/rows" +
    `?dataset=${encodeURIComponent(dataset)}` +
    `&config=${encodeURIComponent(config)}` +
    `&split=${encodeURIComponent(split)}` +
    `&offset=0&length=${Math.min(sampleSize, 100)}`;
  const body = await requestJson(url);
  const rows = body.rows || [];

  return rows.map((row) => row.row || row);
}

function normalizeExample(example, id) {
  const text = pickText(example);
  const labels = pickLabels(example);

  return {
    id,
    texto: text,
    etiquetas_eurovoc: labels.join("|"),
    cantidad_etiquetas: labels.length,
    fuente: "MultiEURLEX",
    split,
  };
}

function pickText(example) {
  if (typeof example.text === "string") return example.text;
  if (typeof example.texto === "string") return example.texto;
  if (typeof example.title === "string" && typeof example.main_body === "string") {
    return `${example.title}\n\n${example.main_body}`;
  }
  if (typeof example.header === "string" && typeof example.recitals === "string") {
    return `${example.header}\n\n${example.recitals}\n\n${example.main_body || ""}`;
  }

  return Object.values(example)
    .filter((value) => typeof value === "string")
    .sort((a, b) => b.length - a.length)[0] || "";
}

function pickLabels(example) {
  const candidates = [
    example.labels,
    example.label,
    example.eurovoc_concepts,
    example.concepts,
    example.tags,
  ];
  const found = candidates.find((candidate) => Array.isArray(candidate) || typeof candidate === "string");

  if (Array.isArray(found)) {
    return found.map(String).filter(Boolean);
  }

  if (typeof found === "string") {
    return found.split(/[|,;]/).map((label) => label.trim()).filter(Boolean);
  }

  return [];
}

function writeCsv(rows) {
  const header = ["id", "texto", "etiquetas_eurovoc", "cantidad_etiquetas", "fuente", "split"];
  const lines = [header, ...rows.map((row) => header.map((key) => row[key]))].map(toCsvRow);

  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
}

function toCsvRow(row) {
  return row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
}

function parseSimpleCsv(content) {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(headerLine);

  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`No se pudo descargar MultiEURLEX: HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

main().catch((error) => {
  console.error(error.message);
  console.error(
    "Si la red local bloquea Hugging Face, descargar el dataset manualmente y ejecutar con MULTIEURLEX_SOURCE_FILE."
  );
  process.exit(1);
});
