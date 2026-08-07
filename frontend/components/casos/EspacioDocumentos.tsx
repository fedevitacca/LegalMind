"use client";
import { useEffect, useState } from "react";

type Documento = {
  id?: number;
  categoria: string;
  fecha: string;
  nombre: string;
  resumen: string;
  estado?: string; sha256?: string | null; version?: number; requiere_ocr?: boolean; confianza_extraccion?: number | null; download_url?: string | null;
};
const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";

export default function EspacioDocumentos({
  documentos,
}: {
  documentos: Documento[];
}) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#84A2BD]/30 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
            Archivos del expediente
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Documentos</h2>
        </div>
        <button className="rounded-full bg-[#546FC0] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044]">
          + Cargar documentos
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {documentos.map((documento) => (
          <article
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg bg-[#F4F7F5] px-4 py-3"
            key={documento.nombre}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{documento.nombre}</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0F2044]/68">
                  {documento.categoria}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${documento.estado === "error" || documento.requiere_ocr ? "bg-amber-100 text-amber-800" : documento.estado === "texto_extraido" || documento.estado === "analizado" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                  {documento.requiere_ocr ? "Requiere OCR" : documento.estado || "Pendiente"}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/60">
                {documento.resumen}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#546FC0]">
                {documento.fecha}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#0F2044]/45"><span>Versión {documento.version || 1}</span>{documento.sha256 && <span title={documento.sha256}>SHA-256 {documento.sha256.slice(0, 12)}…</span>}{documento.confianza_extraccion != null && <span>Extracción {(documento.confianza_extraccion * 100).toFixed(0)}%</span>}</div>
              {documento.id && <EstadoProcesamiento caseId={getCaseId(documento.download_url)} documentId={documento.id} initialState={documento.estado} />}
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              <a
                className="rounded-full bg-white px-3 py-1.5 transition hover:bg-[#84A2BD]/20"
                href={documento.download_url ? `${apiUrl}${documento.download_url}` : "#"}
              >
                Ver
              </a>
              <a
                className="rounded-full bg-white px-3 py-1.5 transition hover:bg-[#84A2BD]/20"
                href="#"
              >
                Descargar
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getCaseId(downloadUrl?: string | null) { return downloadUrl?.match(/\/casos\/(\d+)\//)?.[1] || ""; }
function EstadoProcesamiento({caseId,documentId,initialState}:{caseId:string;documentId:number;initialState?:string}){
  const [job,setJob]=useState<{estado:string;progreso:number;error_detalle?:string}>();const [retrying,setRetrying]=useState(false);
  useEffect(()=>{if(!caseId)return;let active=true;const load=()=>fetch(`${apiUrl}/api/casos/${caseId}/documentos/${documentId}/procesamiento`,{credentials:"include"}).then(r=>r.json()).then(body=>{if(active)setJob(body.jobs?.[0]);}).catch(()=>undefined);void load();const timer=setInterval(load,3000);return()=>{active=false;clearInterval(timer);};},[caseId,documentId]);
  const state=job?.estado||initialState;if(!state)return null;const canRetry=["error","requiere_ocr"].includes(state);
  async function retry(){setRetrying(true);try{const action=state==="requiere_ocr"?"ocr":"reintentar";await fetch(`${apiUrl}/api/casos/${caseId}/documentos/${documentId}/${action}`,{method:"POST",credentials:"include"});setJob({estado:"pendiente",progreso:0});}finally{setRetrying(false);}}
  return <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">Proceso: {state}{job?` · ${job.progreso}%`:""}</span>{state==="procesando"&&<span className="h-1.5 w-24 overflow-hidden rounded bg-blue-100"><span className="block h-full bg-blue-500" style={{width:`${job?.progreso||10}%`}}/></span>}{canRetry&&<button type="button" disabled={retrying} onClick={retry} className="rounded bg-amber-100 px-2 py-1 font-bold text-amber-800">{retrying?"Procesando…":state==="requiere_ocr"?"Ejecutar OCR":"Reintentar"}</button>}{job?.error_detalle&&<span title={job.error_detalle} className="text-red-600">Ver error</span>}</div>;
}
