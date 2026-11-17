const path=require("node:path");const{createWorker}=require("tesseract.js");
async function reconocerTextoDelDocumento(rutaArchivo,{language=process.env.OCR_LANGUAGE||"spa",scale=Number(process.env.OCR_PDF_SCALE||2),onProgress=()=>{}}={}){
  const extension=path.extname(rutaArchivo).toLowerCase();const languageConfig=language==="spa"?require("@tesseract.js-data/spa"):null;const worker=await createWorker(language,undefined,{langPath:process.env.OCR_LANG_PATH||languageConfig?.langPath,cachePath:process.env.OCR_CACHE_PATH||undefined,gzip:languageConfig?.gzip,logger:(evento)=>{if(evento.status==="recognizing text")onProgress(Math.round((evento.progress||0)*100));}});const paginas=[];
  try{if(extension===".pdf"){const{pdf}=await import("pdf-to-img");const documento=await pdf(rutaArchivo,{scale});try{let number=1;for await(const image of documento){const resultado=await worker.recognize(image);paginas.push(crearPaginaReconocida(number++,resultado));}}finally{if(typeof documento.destroy==="function")await documento.destroy();}}
    else{const resultado=await worker.recognize(rutaArchivo);paginas.push(crearPaginaReconocida(1,resultado));}
  }finally{await worker.terminate();}
  const texto=paginas.map(pagina=>`[Pagina ${pagina.number}]\n${pagina.text}`).join("\n\n").trim();if(!texto)throw new Error("OCR_NO_TEXT: no se reconocio texto en el documento.");
  return{text: texto,pages: paginas,confidence:paginas.reduce((sum,pagina)=>sum+pagina.confidence,0)/paginas.length};
}
function crearPaginaReconocida(number,resultado){return{number,text:String(resultado.data?.text||"").trim(),confidence:Math.max(0,Math.min(1,Number(resultado.data?.confidence||0)/100))};}
module.exports={reconocerTextoDelDocumento};
