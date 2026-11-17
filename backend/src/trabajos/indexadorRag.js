const { generarEmbeddingsDeTextos, obtenerConfiguracionDeIA } = require("../../IA/analizadorLocal");
const { cargarDocumentoParaIndexar, reemplazarIndiceVectorial } = require("../modelos/repositorioRagVectorial");
const { fragmentarDocumentoJuridico } = require("./fragmentadorJuridico");

async function indexarDocumento(trabajo, deps = {}) {
  const documento = await (deps.load || cargarDocumentoParaIndexar)(trabajo.documento_id, trabajo.causa_id);
  if (!documento?.texto_extraido?.trim()) throw new Error("RAG_EMPTY_DOCUMENT: el documento no tiene texto extraído.");
  const fragmentos = (deps.fragment || fragmentarDocumentoJuridico)({ text: documento.texto_extraido, pages: documento.paginas || [] });
  if (!fragmentos.length) throw new Error("RAG_EMPTY_DOCUMENT: no fue posible crear fragmentos.");
  const embeddings = [];
  const embed = deps.embed || generarEmbeddingsDeTextos;
  const batchSize = Math.max(1, Number(process.env.RAG_EMBEDDING_BATCH_SIZE) || 12);
  for (let inicio = 0; inicio < fragmentos.length; inicio += batchSize) embeddings.push(...await embed(fragmentos.slice(inicio, inicio + batchSize).map((fragmento) => fragmento.text)));
  return (deps.save || reemplazarIndiceVectorial)(documento, fragmentos, embeddings, obtenerConfiguracionDeIA().embeddingModel);
}
module.exports = { indexarDocumento };
