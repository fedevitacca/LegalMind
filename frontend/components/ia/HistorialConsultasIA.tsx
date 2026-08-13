"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavegacionAreasCaso from "../casos/NavegacionAreasCaso";
import { downloadPlainTextReport, printPlainTextReport } from "../../lib/legalReport";

type Finding = { titulo: string; detalle: string; prioridad: string };
type Citation = { citation_id?: string; document_name: string; chunk_index: number; page?: number | null; location_label?: string; document_url?: string | null; text: string; score: number };
type QueryItem = { id: number; tool_id: string; title: string; query?: string; result: { resumen?: string; conclusion?: string; hallazgos?: Finding[] }; citations?: Citation[]; metadata?: { model?: string; evidence?: { status: string; requires_human_review: boolean } }; created_at: string };

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const labels: Record<string, string> = { resumen_expediente: "Resumen", comparar_documentos: "Comparación documental", comparar_jurisprudencia: "Jurisprudencia", cronologia: "Cronología", consulta_rag: "Consulta documental", teoria_del_caso: "Teoría del caso" };

export default function HistorialConsultasIA({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<QueryItem[]>([]);
  const [selected, setSelected] = useState<QueryItem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/api/ia/cases/${caseId}/queries`, { credentials: "include" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo cargar el historial."); return body; })
      .then((body) => { setItems(body.queries || []); setSelected(body.queries?.[0]); })
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  async function remove(id: number) {
    if (!window.confirm("¿Eliminar esta consulta guardada?")) return;
    const response = await fetch(`${apiUrl}/api/ia/cases/${caseId}/queries/${id}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) { setError("No se pudo eliminar el registro."); return; }
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    setSelected((current) => current?.id === id ? next[0] : current);
  }

  function download(item: QueryItem) {
    downloadPlainTextReport(item.title, formatStoredReport(item));
    setNotice("Registro descargado.");
  }

  function print(item: QueryItem) {
    try { printPlainTextReport(item.title, formatStoredReport(item)); setNotice("Vista de impresión abierta."); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "No fue posible abrir la impresión."); }
  }

  return <section className="h-full overflow-y-auto bg-[#f5f5f3] px-4 py-5 text-[#182338] sm:px-8">
    <div className="mx-auto max-w-[1450px] space-y-5">
      <NavegacionAreasCaso activeArea="Consultas IA" caseSlug={caseId}/>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d6d8d5] pb-5">
        <div><p className="text-sm font-medium text-[#64706f]">Registro del expediente</p><h1 className="mt-1 text-3xl font-semibold">Análisis guardados</h1><p className="mt-2 text-sm text-[#687180]">Informes conservados junto con sus fuentes y fecha de elaboración.</p></div>
        <Link href={`/analisis?case_id=${caseId}`} className="bg-[#285f5b] px-5 py-3 text-sm font-semibold text-white">Nuevo análisis</Link>
      </header>
      {error && <p className="border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <p className="border border-[#d6d8d5] bg-white p-8 text-center text-sm text-[#687180]">Cargando registros…</p> : !items.length ? <div className="border border-[#d6d8d5] bg-white p-10"><h2 className="text-lg font-semibold">No hay análisis guardados</h2><p className="mt-2 text-sm text-[#687180]">Inicie un análisis desde este expediente para incorporarlo al registro.</p></div> : <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border border-[#d6d8d5] bg-white">{items.map((item) => <button onClick={() => { setSelected(item); setNotice(""); }} key={item.id} className={`block w-full border-b border-[#e1e3e0] px-4 py-4 text-left last:border-b-0 ${selected?.id === item.id ? "border-l-[3px] border-l-[#3f6f6b] bg-[#f1f5f3] pl-[13px]" : "hover:bg-[#fafaf8]"}`}><span className="text-[11px] font-semibold uppercase tracking-wider text-[#3f6f6b]">{labels[item.tool_id] || item.tool_id}</span><strong className="mt-1 block line-clamp-2 text-sm">{item.title}</strong><span className="mt-2 block text-xs text-[#747d7b]">{new Date(item.created_at).toLocaleString("es-AR")}</span></button>)}</aside>
        {selected && <StoredReport item={selected} notice={notice} onDelete={() => void remove(selected.id)} onDownload={() => download(selected)} onPrint={() => print(selected)} />}
      </div>}
    </div>
  </section>;
}

function StoredReport({ item, notice, onDelete, onDownload, onPrint }: { item: QueryItem; notice: string; onDelete: () => void; onDownload: () => void; onPrint: () => void }) {
  const evidence = item.metadata?.evidence;
  return <article className="space-y-5 border border-[#d6d8d5] bg-white p-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e1e3e0] pb-4">
      <div><span className="text-xs font-semibold uppercase tracking-[.08em] text-[#3f6f6b]">{labels[item.tool_id] || item.tool_id}</span><h2 className="mt-1 text-2xl font-semibold">{item.title}</h2><p className="mt-2 text-xs text-[#747d7b]">Registro #{item.id} · {new Date(item.created_at).toLocaleString("es-AR")}</p>{item.query && <p className="mt-3 text-sm text-[#596473]"><strong>Consulta:</strong> {item.query}</p>}</div>
      <div className="flex flex-wrap gap-2"><button onClick={onDownload} className="border border-[#bfc4c1] px-3 py-2 text-xs font-semibold">Descargar .txt</button><button onClick={onPrint} className="bg-[#34413f] px-3 py-2 text-xs font-semibold text-white">Imprimir / PDF</button><button onClick={onDelete} className="border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Eliminar</button></div>
    </div>
    {notice && <p aria-live="polite" className="text-xs text-[#3f6f6b]">{notice}</p>}
    {evidence && <div className={`border-l-4 px-4 py-3 text-sm ${evidence.requires_human_review ? "border-amber-500 bg-amber-50 text-amber-900" : "border-emerald-600 bg-emerald-50 text-emerald-900"}`}><strong>{evidence.requires_human_review ? "Requiere revisión de fuentes" : "Respaldo documental suficiente"}</strong><p className="mt-1 text-xs opacity-75">Estado registrado: {evidence.status.replaceAll("_", " ")}.</p></div>}
    <section><h3 className="mb-3 border-b border-[#e1e3e0] pb-2 font-semibold">Resumen</h3><p className="leading-7 text-[#596473]">{item.result.resumen || "Sin resumen registrado."}</p></section>
    {item.result.hallazgos?.length ? <section><h3 className="mb-2 border-b border-[#e1e3e0] pb-2 font-semibold">Hallazgos</h3><div className="divide-y divide-[#e1e3e0]">{item.result.hallazgos.map((finding, index) => <div key={index} className="py-3"><div className="flex justify-between gap-3"><h4 className="font-semibold">{finding.titulo}</h4><span className="text-xs font-semibold uppercase text-[#8a662f]">{finding.prioridad}</span></div><p className="mt-1 text-sm leading-6 text-[#606a78]">{finding.detalle}</p></div>)}</div></section> : null}
    <section className="border-l-4 border-[#3f6f6b] bg-[#f4f7f6] p-4"><h3 className="font-semibold">Conclusión registrada</h3><p className="mt-2 leading-7 text-[#596473]">{item.result.conclusion || "Sin conclusión registrada."}</p></section>
    {item.citations?.length ? <section><h3 className="mb-3 border-b border-[#e1e3e0] pb-2 font-semibold">Documentos consultados ({item.citations.length})</h3><div className="divide-y divide-[#e1e3e0] border border-[#d6d8d5]">{item.citations.map((citation, index) => <details key={citation.citation_id || index} className="px-4 py-3"><summary className="cursor-pointer text-sm font-semibold"><span className="mr-2 text-[#3f6f6b]">{citation.citation_id || `Fuente ${index + 1}`}</span>{citation.document_name} · {citation.location_label || (citation.page ? `Página ${citation.page}` : `Fragmento ${citation.chunk_index + 1}`)}</summary><blockquote className="mt-3 border-l-2 border-[#819d99] pl-3 text-sm leading-6 text-[#606a78]">{citation.text}</blockquote><div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#747d7b]"><span>Coincidencia documental: {(citation.score * 100).toFixed(0)}%</span>{citation.document_url && <a className="font-semibold text-[#285f5b]" href={citation.document_url}>Abrir en el expediente →</a>}</div></details>)}</div></section> : null}
  </article>;
}

function formatStoredReport(item: QueryItem) {
  const lines = [item.title, "", `Tipo: ${labels[item.tool_id] || item.tool_id}`, `Fecha: ${new Date(item.created_at).toLocaleString("es-AR")}`, item.query ? `Consulta: ${item.query}` : "", "", "RESUMEN", item.result.resumen || "Sin resumen registrado.", ""];
  if (item.result.hallazgos?.length) { lines.push("HALLAZGOS"); item.result.hallazgos.forEach((finding, index) => lines.push(`${index + 1}. ${finding.titulo} [${finding.prioridad}]`, finding.detalle, "")); }
  lines.push("CONCLUSIÓN", item.result.conclusion || "Sin conclusión registrada.", "");
  if (item.citations?.length) { lines.push("DOCUMENTOS CONSULTADOS"); item.citations.forEach((citation, index) => lines.push(`[${citation.citation_id || index + 1}] ${citation.document_name} · ${citation.location_label || `Fragmento ${citation.chunk_index + 1}`}`, citation.text, "")); }
  lines.push("Documento de trabajo sujeto a revisión profesional.");
  return lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trim();
}
