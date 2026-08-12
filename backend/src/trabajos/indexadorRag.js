const { embedTextsWithLocalAI, getLocalAIConfig } = require("../../IA/analizadorLocal");
const { loadDocumentForIndex, replaceVectorIndex } = require("../modelos/repositorioRagVectorial");
const { fragmentLegalDocument } = require("./fragmentadorJuridico");

async function indexDocument(job, deps = {}) {
  const document = await (deps.load || loadDocumentForIndex)(job.documento_id, job.causa_id);
  if (!document?.texto_extraido?.trim()) throw new Error("RAG_EMPTY_DOCUMENT: el documento no tiene texto extraído.");
  const chunks = (deps.fragment || fragmentLegalDocument)({ text: document.texto_extraido, pages: document.paginas || [] });
  if (!chunks.length) throw new Error("RAG_EMPTY_DOCUMENT: no fue posible crear fragmentos.");
  const embeddings = [];
  const embed = deps.embed || embedTextsWithLocalAI;
  const batchSize = Math.max(1, Number(process.env.RAG_EMBEDDING_BATCH_SIZE) || 12);
  for (let start = 0; start < chunks.length; start += batchSize) embeddings.push(...await embed(chunks.slice(start, start + batchSize).map((chunk) => chunk.text)));
  return (deps.save || replaceVectorIndex)(document, chunks, embeddings, getLocalAIConfig().embeddingModel);
}
module.exports = { indexDocument };
