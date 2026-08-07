const fs = require("node:fs/promises");
const { extractTextFromSupportedFile } = require("../../IA/textFile");
const { claimNextJob, completeJob, completeOcrJob, failJob, updateJobProgress } = require("../modelos/repositorioTrabajosDocumentales");
const { recognizeDocument } = require("./ocrLocal");

let timer; let running=false;
async function processNextDocumentJob() {
  if(running)return false; running=true;
  try { const job=await claimNextJob(); if(!job)return false;
    await processClaimedJob(job); return true;
  } finally {running=false;}
}
async function processClaimedJob(job,deps={readFile:fs.readFile,extract:extractTextFromSupportedFile,complete:completeJob,completeOcr:completeOcrJob,recognize:recognizeDocument,progress:updateJobProgress,fail:failJob}){
  try {if(job.tipo==="ocr"){if(!job.ruta_archivo)throw new Error("OCR_FILE_MISSING: no existe original para procesar.");const result=await deps.recognize(job.ruta_archivo,{onProgress:(value)=>void deps.progress(job.id,10+value*.85)});await deps.completeOcr(job,result);return;}
    if(!job.ruta_archivo&&job.texto_extraido){await deps.complete(job,job.texto_extraido);return;}
    if(!job.ruta_archivo)throw new Error("El documento no conserva un archivo original ni texto extraido.");
    const buffer=await deps.readFile(job.ruta_archivo);const text=await deps.extract({originalname:job.nombre_archivo,mimetype:job.mime_type,size:buffer.length,buffer});await deps.complete(job,text);
  }catch(error){const requiresOcr=/PDF.*no contiene texto|scanned|escanead/i.test(error.message);await deps.fail(job,error,{requiresOcr});}
}
function startDocumentWorker(){if(timer)return; const poll=async()=>{try{while(await processNextDocumentJob()){} }catch(error){console.error("Document worker failed:",error.message);}}; void poll(); timer=setInterval(poll,Number(process.env.DOCUMENT_WORKER_INTERVAL_MS||3000));timer.unref();}
function stopDocumentWorker(){if(timer)clearInterval(timer);timer=undefined;}
module.exports={processClaimedJob,processNextDocumentJob,startDocumentWorker,stopDocumentWorker};
