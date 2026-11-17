const fs = require("node:fs/promises");
const { extraerTextoDeArchivo } = require("../../IA/textFile");
const { claimNextJob, completeJob, completeIndexJob, completeOcrJob, failJob, updateJobProgress } = require("../modelos/repositorioTrabajosDocumentales");
const { reconocerTextoDelDocumento } = require("./ocrLocal");
const { indexarDocumento } = require("./indexadorRag");

let temporizador; let enEjecucion=false;
async function procesarSiguienteTrabajoDocumental() {
  if(enEjecucion)return false; enEjecucion=true;
  try { const trabajo=await claimNextJob(); if(!trabajo)return false;
    await procesarTrabajoAsignado(trabajo); return true;
  } finally {enEjecucion=false;}
}
async function procesarTrabajoAsignado(trabajo,deps={readFile:fs.readFile,extract:extraerTextoDeArchivo,complete:completeJob,completeIndex:completeIndexJob,completeOcr:completeOcrJob,index:indexarDocumento,recognize:reconocerTextoDelDocumento,progress:updateJobProgress,fail:failJob}){
  try {if(trabajo.tipo==="indexar_rag"){await deps.index(trabajo);await deps.completeIndex(trabajo);return;}if(trabajo.tipo==="ocr"){if(!trabajo.ruta_archivo)throw new Error("OCR_FILE_MISSING: no existe original para procesar.");const resultado=await deps.recognize(trabajo.ruta_archivo,{onProgress:(valor)=>void deps.progress(trabajo.id,10+valor*.85)});await deps.completeOcr(trabajo,resultado);return;}
    if(!trabajo.ruta_archivo&&trabajo.texto_extraido){await deps.complete(trabajo,trabajo.texto_extraido);return;}
    if(!trabajo.ruta_archivo)throw new Error("El documento no conserva un archivo original ni texto extraido.");
    const contenidoBinario=await deps.readFile(trabajo.ruta_archivo);const texto=await deps.extract({originalname:trabajo.nombre_archivo,mimetype:trabajo.mime_type,size:contenidoBinario.length,buffer: contenidoBinario});await deps.complete(trabajo,texto);
  }catch(error){const requiresOcr=/PDF.*no contiene texto|scanned|escanead/i.test(error.message);await deps.fail(trabajo,error,{requiresOcr});}
}
function iniciarProcesadorDocumental(){if(temporizador)return; const poll=async()=>{try{while(await procesarSiguienteTrabajoDocumental()){} }catch(error){console.error("Document worker failed:",error.message);}}; void poll(); temporizador=setInterval(poll,Number(process.env.DOCUMENT_WORKER_INTERVAL_MS||3000));temporizador.unref();}
function detenerProcesadorDocumental(){if(temporizador)clearInterval(temporizador);temporizador=undefined;}
module.exports={procesarTrabajoAsignado,procesarSiguienteTrabajoDocumental,iniciarProcesadorDocumental,detenerProcesadorDocumental};
