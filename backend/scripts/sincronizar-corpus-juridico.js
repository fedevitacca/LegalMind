require("dotenv").config({ quiet: true });

const crypto = require("node:crypto");
const { pool } = require("../src/configuracion/baseDatos");
const { runMigrations } = require("../src/configuracion/migraciones");
const { embedTextsWithLocalAI, getLocalAIConfig } = require("../IA/analizadorLocal");

const OFFICIAL_SOURCES = [
  {
    key: "constitucion-nacional",
    type: "constitucion",
    title: "Constitución de la Nación Argentina",
    lawNumber: "Ley 24.430",
    body: "Honorable Congreso de la Nación Argentina",
    url: "https://www.argentina.gob.ar/normativa/nacional/ley-24430-804/texto",
    articleSlice: [0, 137],
  },
  {
    key: "codigo-penal-ley-11179",
    type: "legislacion",
    title: "Código Penal de la Nación Argentina",
    lawNumber: "Ley 11.179",
    body: "Honorable Congreso de la Nación Argentina",
    url: "https://www.argentina.gob.ar/normativa/nacional/ley-11179-16546/actualizacion",
  },
  {
    key: "codigo-procesal-penal-federal-ley-27063",
    type: "legislacion",
    title: "Código Procesal Penal Federal",
    lawNumber: "Ley 27.063",
    body: "Honorable Congreso de la Nación Argentina",
    url: "https://www.argentina.gob.ar/normativa/nacional/ley-27063-2014-239340/actualizacion",
    articleSlice: [9, 419],
  },
];

async function synchronizeLegalCorpus({ sources = OFFICIAL_SOURCES, fetchImpl = fetch, database = pool } = {}) {
  const summary = [];
  for (const source of sources) {
    const response = await fetchImpl(source.url, { headers: { "user-agent": "LegalMind/1.0 corpus juridico" } });
    if (!response.ok) throw new Error(`No se pudo descargar ${source.title}: HTTP ${response.status}.`);
    const html = await response.text();
    const text = htmlToText(html);
    const allFragments = splitLegalArticles(text);
    const fragments = source.articleSlice ? allFragments.slice(...source.articleSlice) : allFragments;
    if (fragments.length < 5) throw new Error(`La fuente ${source.title} no contiene suficientes artículos reconocibles.`);
    const checksum = crypto.createHash("sha256").update(fragments.map((item) => item.text).join("\n")).digest("hex");
    const embeddings = await embedFragments(fragments);
    const saved = await replaceSource(database, source, fragments, embeddings, checksum);
    summary.push(saved);
  }
  return summary;
}

async function embedFragments(fragments) {
  const embeddings = [];
  const batchSize = Math.max(1, Number(process.env.RAG_EMBEDDING_BATCH_SIZE) || 12);
  for (let start = 0; start < fragments.length; start += batchSize) {
    embeddings.push(...await embedTextsWithLocalAI(fragments.slice(start, start + batchSize).map((item) => item.text)));
  }
  if (embeddings.some((embedding) => embedding.length !== 768)) {
    throw new Error("El modelo de embeddings debe devolver vectores de 768 dimensiones.");
  }
  return embeddings;
}

async function replaceSource(database, source, fragments, embeddings, checksum) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`INSERT INTO fuentes_juridicas
      (clave,tipo,titulo,numero_norma,organismo,url_oficial,checksum,version_fuente,sincronizada_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$7,NOW())
      ON CONFLICT(clave) DO UPDATE SET tipo=EXCLUDED.tipo,titulo=EXCLUDED.titulo,
        numero_norma=EXCLUDED.numero_norma,organismo=EXCLUDED.organismo,url_oficial=EXCLUDED.url_oficial,
        checksum=EXCLUDED.checksum,version_fuente=EXCLUDED.version_fuente,sincronizada_at=NOW(),updated_at=NOW()
      RETURNING id`, [source.key, source.type, source.title, source.lawNumber, source.body, source.url, checksum]);
    const sourceId = result.rows[0].id;
    await client.query("DELETE FROM fragmentos_juridicos WHERE fuente_id=$1", [sourceId]);
    for (let index = 0; index < fragments.length; index += 1) {
      const fragment = fragments[index];
      await client.query(`INSERT INTO fragmentos_juridicos
        (fuente_id,orden,identificador,encabezado,texto,metadata_json,embedding,modelo_embedding)
        VALUES($1,$2,$3,$4,$5,$6,$7::vector,$8)`, [sourceId, fragment.order, fragment.identifier,
        fragment.heading, fragment.text, JSON.stringify({ official: true, jurisdiction: "nacional_federal" }),
        vectorLiteral(embeddings[index]), getLocalAIConfig().embeddingModel]);
    }
    await client.query("COMMIT");
    return { key: source.key, fragments: fragments.length, checksum };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function vectorLiteral(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function htmlToText(html) {
  return decodeEntities(String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function splitLegalArticles(text) {
  const marker = /\bART[IÍ]CULO\s+([0-9]+(?:\s*(?:bis|ter|qu[aá]ter|quinquies))?|[A-Z]+)(?:\s*[º°])?\s*(?:\.-|\.|-|—)/gi;
  const matches = [...String(text || "").matchAll(marker)];
  return matches.map((match, index) => {
    const end = matches[index + 1]?.index ?? text.length;
    const body = String(text.slice(match.index, end)).replace(/\s+/g, " ").trim();
    return {
      order: index,
      identifier: `Artículo ${match[1].replace(/\s+/g, " ")}`,
      heading: null,
      text: body.slice(0, 12000),
    };
  }).filter((fragment) => fragment.text.length >= 20);
}

function decodeEntities(value) {
  const entities = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

async function main() {
  await runMigrations();
  const summary = await synchronizeLegalCorpus();
  console.log(JSON.stringify({ synchronized: summary }, null, 2));
  await pool.end();
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = { OFFICIAL_SOURCES, embedFragments, htmlToText, splitLegalArticles, synchronizeLegalCorpus };
