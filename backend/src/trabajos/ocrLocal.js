const path=require("node:path");const{createWorker}=require("tesseract.js");
async function recognizeDocument(filePath,{language=process.env.OCR_LANGUAGE||"spa",scale=Number(process.env.OCR_PDF_SCALE||2),onProgress=()=>{}}={}){
  const extension=path.extname(filePath).toLowerCase();const languageConfig=language==="spa"?require("@tesseract.js-data/spa"):null;const worker=await createWorker(language,undefined,{langPath:process.env.OCR_LANG_PATH||languageConfig?.langPath,cachePath:process.env.OCR_CACHE_PATH||undefined,gzip:languageConfig?.gzip,logger:(event)=>{if(event.status==="recognizing text")onProgress(Math.round((event.progress||0)*100));}});const pages=[];
  try{if(extension===".pdf"){const{pdf}=await import("pdf-to-img");const document=await pdf(filePath,{scale});try{let number=1;for await(const image of document){const result=await worker.recognize(image);pages.push(toPage(number++,result));}}finally{if(typeof document.destroy==="function")await document.destroy();}}
    else{const result=await worker.recognize(filePath);pages.push(toPage(1,result));}
  }finally{await worker.terminate();}
  const text=pages.map(page=>`[Pagina ${page.number}]\n${page.text}`).join("\n\n").trim();if(!text)throw new Error("OCR_NO_TEXT: no se reconocio texto en el documento.");
  return{text,pages,confidence:pages.reduce((sum,page)=>sum+page.confidence,0)/pages.length};
}
function toPage(number,result){return{number,text:String(result.data?.text||"").trim(),confidence:Math.max(0,Math.min(1,Number(result.data?.confidence||0)/100))};}
module.exports={recognizeDocument};
