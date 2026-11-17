require("dotenv").config({ quiet: true });

const crypto = require("node:crypto");
const { pool } = require("../src/configuracion/baseDatos");
const { runMigrations } = require("../src/configuracion/migraciones");
const { generarEmbeddingsDeTextos, obtenerConfiguracionDeIA } = require("../IA/analizadorLocal");

const FUENTES_OFICIALES = [
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

async function sincronizarCorpusJuridico({ sources: fuentes = FUENTES_OFICIALES, fetchImpl = fetch, database = pool } = {}) {
  const summary = [];
  for (const fuente of fuentes) {
    const respuesta = await fetchImpl(fuente.url, { headers: { "user-agent": "LegalMind/1.0 corpus juridico" } });
    if (!respuesta.ok) throw new Error(`No se pudo descargar ${fuente.title}: HTTP ${respuesta.status}.`);
    const html = await respuesta.text();
    const texto = convertirHtmlEnTexto(html);
    const allFragments = separarArticulosJuridicos(texto);
    const fragmentos = fuente.articleSlice ? allFragments.slice(...fuente.articleSlice) : allFragments;
    if (fragmentos.length < 5) throw new Error(`La fuente ${fuente.title} no contiene suficientes artículos reconocibles.`);
    const checksum = crypto.createHash("sha256").update(fragmentos.map((elemento) => elemento.text).join("\n")).digest("hex");
    const embeddings = await generarEmbeddingsDeFragmentos(fragmentos);
    const intercambioGuardado = await reemplazarFuente(database, fuente, fragmentos, embeddings, checksum);
    summary.push(intercambioGuardado);
  }
  return summary;
}

async function generarEmbeddingsDeFragmentos(fragmentos) {
  const embeddings = [];
  const batchSize = Math.max(1, Number(process.env.RAG_EMBEDDING_BATCH_SIZE) || 12);
  for (let inicio = 0; inicio < fragmentos.length; inicio += batchSize) {
    embeddings.push(...await generarEmbeddingsDeTextos(fragmentos.slice(inicio, inicio + batchSize).map((elemento) => elemento.text)));
  }
  if (embeddings.some((embedding) => embedding.length !== 768)) {
    throw new Error("El modelo de embeddings debe devolver vectores de 768 dimensiones.");
  }
  return embeddings;
}

async function reemplazarFuente(database, fuente, fragmentos, embeddings, checksum) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const resultado = await client.query(`INSERT INTO fuentes_juridicas
      (clave,tipo,titulo,numero_norma,organismo,url_oficial,checksum,version_fuente,sincronizada_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$7,NOW())
      ON CONFLICT(clave) DO UPDATE SET tipo=EXCLUDED.tipo,titulo=EXCLUDED.titulo,
        numero_norma=EXCLUDED.numero_norma,organismo=EXCLUDED.organismo,url_oficial=EXCLUDED.url_oficial,
        checksum=EXCLUDED.checksum,version_fuente=EXCLUDED.version_fuente,sincronizada_at=NOW(),updated_at=NOW()
      RETURNING id`, [fuente.key, fuente.type, fuente.title, fuente.lawNumber, fuente.body, fuente.url, checksum]);
    const sourceId = resultado.rows[0].id;
    await client.query("DELETE FROM fragmentos_juridicos WHERE fuente_id=$1", [sourceId]);
    for (let indice = 0; indice < fragmentos.length; indice += 1) {
      const fragmento = fragmentos[indice];
      await client.query(`INSERT INTO fragmentos_juridicos
        (fuente_id,orden,identificador,encabezado,texto,metadata_json,embedding,modelo_embedding)
        VALUES($1,$2,$3,$4,$5,$6,$7::vector,$8)`, [sourceId, fragmento.order, fragmento.identifier,
        fragmento.heading, fragmento.text, JSON.stringify({ official: true, jurisdiction: "nacional_federal" }),
        convertirVectorAFormatoSql(embeddings[indice]), obtenerConfiguracionDeIA().embeddingModel]);
    }
    await client.query("COMMIT");
    return { key: fuente.key, fragments: fragmentos.length, checksum };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function convertirVectorAFormatoSql(vector) {
  return `[${vector.map((valor) => Number(valor).toFixed(8)).join(",")}]`;
}

function convertirHtmlEnTexto(html) {
  return decodificarEntidades(String(html || "")
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

function separarArticulosJuridicos(texto) {
  const marker = /\bART[IÍ]CULO\s+([0-9]+(?:\s*(?:bis|ter|qu[aá]ter|quinquies))?|[A-Z]+)(?:\s*[º°])?\s*(?:\.-|\.|-|—)/gi;
  const coincidencias = [...String(texto || "").matchAll(marker)];
  return coincidencias.map((coincidencia, indice) => {
    const fin = coincidencias[indice + 1]?.index ?? texto.length;
    const cuerpo = String(texto.slice(coincidencia.index, fin)).replace(/\s+/g, " ").trim();
    return {
      order: indice,
      identifier: `Artículo ${coincidencia[1].replace(/\s+/g, " ")}`,
      heading: null,
      text: cuerpo.slice(0, 12000),
    };
  }).filter((fragmento) => fragmento.text.length >= 20);
}

function decodificarEntidades(valor) {
  const entities = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return valor.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

async function main() {
  await runMigrations();
  const summary = await sincronizarCorpusJuridico();
  console.log(JSON.stringify({ synchronized: summary }, null, 2));
  await pool.end();
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = { FUENTES_OFICIALES, generarEmbeddingsDeFragmentos, convertirHtmlEnTexto, separarArticulosJuridicos, sincronizarCorpusJuridico };
