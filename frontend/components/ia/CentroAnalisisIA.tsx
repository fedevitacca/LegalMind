"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadPlainTextReport, printPlainTextReport } from "../../lib/legalReport";

type Tool = { id: string; label: string; description: string; inputs: number; family?: string; resultView?: string; accent?: string; fields?: string[] };
type CaseOption = { id: number; name: string; identificador?: string };
type CaseDocument = { id: number; name: string; extracted_text?: string; status?: string };
type Result = { titulo: string; conclusion?: string; resumen?: string; puntos_clave?: string[] };
type Citation = { citation_id: string; document_id: string; document_name: string; chunk_index: number; page?: number | null; location_label?: string; document_url?: string | null; section?: string | null; text: string; score: number };

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const fallbackTools: Tool[] = [
  { id: "resumen_expediente", label: "Resumen del expediente", description: "Sintetiza partes, hechos, estado, fechas y próximos pasos.", inputs: 1 },
  { id: "comparar_documentos", label: "Comparar documentos", description: "Marca coincidencias, diferencias y contradicciones relevantes.", inputs: 2 },
  { id: "comparar_jurisprudencia", label: "Comparar fallos", description: "Contrasta hechos, criterios y utilidad de dos decisiones.", inputs: 2 },
  { id: "cronologia", label: "Fechas y vencimientos", description: "Ordena actuaciones, audiencias y plazos que requieren atención.", inputs: 1 },
  { id: "consulta_rag", label: "Preguntar sobre documentos", description: "Responde con información del expediente y muestra las fuentes utilizadas.", inputs: 1 },
];

const actionLabels: Record<string, string> = {
  resumen_expediente: "Preparar resumen",
  comparar_documentos: "Comparar documentos",
  comparar_jurisprudencia: "Comparar fallos",
  cronologia: "Ordenar fechas",
  consulta_rag: "Responder pregunta",
  teoria_del_caso: "Preparar teoría",
};

export default function CentroAnalisisIA() {
  const [tools, setTools] = useState<Tool[]>(fallbackTools);
  const [cases, setCases] = useState<CaseOption[]>([]); const [caseId, setCaseId] = useState("");
  const [casesLoading, setCasesLoading] = useState(true); const [casesError, setCasesError] = useState("");
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false); const [documentsError, setDocumentsError] = useState("");
  const [savedId, setSavedId] = useState<number>();
  const [toolId, setToolId] = useState(fallbackTools[0].id);
  const [primary, setPrimary] = useState(""); const [secondary, setSecondary] = useState("");
  const [query, setQuery] = useState(""); const [result, setResult] = useState<Result>();
  const [citations, setCitations] = useState<Citation[]>([]); const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const tool = useMemo(() => tools.find((item) => item.id === toolId) || tools[0], [toolId, tools]);
  const readyCaseDocuments = useMemo(() => caseDocuments.filter((document) => Boolean(document.extracted_text?.trim())), [caseDocuments]);
  const usesCaseDocuments = toolId === "consulta_rag" && Boolean(caseId);
  const canExecute = usesCaseDocuments
    ? !documentsLoading && readyCaseDocuments.length > 0 && Boolean(query.trim())
    : Boolean(primary.trim()) && (tool?.inputs !== 2 || Boolean(secondary.trim()));

  useEffect(() => {
    fetch(`${apiUrl}/api/ia/tools`).then((r) => r.json()).then((body) => body.tools?.length && setTools(body.tools)).catch(() => undefined);
    void loadCases();
    const requestedCase = new URLSearchParams(window.location.search).get("case_id");
    if (requestedCase) setCaseId(requestedCase);
  }, []);

  async function loadCases() {
    setCasesLoading(true); setCasesError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${apiUrl}/api/casos`, { credentials: "include", signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar los expedientes.");
      setCases(body.cases || []);
      if (!body.cases?.length) setCasesError("Todavía no hay expedientes guardados.");
    } catch (cause) {
      setCases([]);
      setCasesError(cause instanceof DOMException && cause.name === "AbortError" ? "La carga de expedientes demoró demasiado." : cause instanceof Error ? cause.message : "No se pudieron cargar los expedientes.");
    } finally { window.clearTimeout(timeout); setCasesLoading(false); }
  }
  useEffect(() => {
    if (!caseId) { setCaseDocuments([]); setDocumentsError(""); setDocumentsLoading(false); return; }
    const controller = new AbortController();
    setCaseDocuments([]); setDocumentsError(""); setDocumentsLoading(true);
    void fetch(`${apiUrl}/api/ia/cases/${caseId}/documents?include_text=true`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudieron cargar los documentos del expediente.");
        setCaseDocuments(body.documents || []);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setCaseDocuments([]);
        setDocumentsError(cause instanceof Error ? cause.message : "No se pudieron cargar los documentos del expediente.");
      })
      .finally(() => { if (!controller.signal.aborted) setDocumentsLoading(false); });
    return () => controller.abort();
  }, [caseId]);
  async function execute() {
    setBusy(true); setError(""); setReportNotice(""); setResult(undefined); setCitations([]); setSavedId(undefined);
    const controller = new AbortController(); requestController.current = controller;
    try {
      const response = await fetch(`${apiUrl}/api/ia/tools/${toolId}/run`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ primary_text: primary, secondary_text: secondary, query, case_id: caseId ? Number(caseId) : null, use_case_documents: usesCaseDocuments }) });
      const body = await response.json();
      if (!response.ok) throw new Error([body.error, body.details].filter(Boolean).join(" "));
      setResult(body.result); setCitations(body.citations || []); setSavedId(body.saved_query?.id);
    } catch (cause) { setError(cause instanceof DOMException && cause.name === "AbortError" ? "Análisis cancelado por el usuario." : cause instanceof Error ? cause.message : "No se pudo completar el análisis."); }
    finally { requestController.current = null; setBusy(false); }
  }

  async function copyReport() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatReport(result, citations));
      setReportNotice("Informe copiado al portapapeles.");
    } catch { setReportNotice("No fue posible copiar el informe."); }
  }

  function downloadReport() {
    if (!result) return;
    downloadPlainTextReport(result.titulo || tool?.label || "informe-juridico", formatReport(result, citations));
    setReportNotice("Informe descargado.");
  }

  function printReport() {
    if (!result) return;
    try { printPlainTextReport(result.titulo, formatReport(result, citations)); setReportNotice("Vista de impresión abierta."); }
    catch (cause) { setReportNotice(cause instanceof Error ? cause.message : "No fue posible abrir la impresión."); }
  }

  return <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
    <aside className="self-start border border-[#d6d8d5] bg-white">
      <div className="border-b border-[#e1e3e0] px-5 py-4"><h2 className="text-sm font-semibold text-[#44504f]">¿Qué necesitás hacer?</h2><p className="mt-1 text-xs leading-5 text-[#747d7b]">Elegí una tarea para empezar.</p></div>
      <nav>{tools.map((item) => <button key={item.id} onClick={() => { setToolId(item.id); setResult(undefined); setError(""); }} className={`block w-full border-b border-[#eceeeb] px-5 py-4 text-left transition last:border-b-0 ${toolId === item.id ? "border-l-[3px] border-l-[#3f6f6b] bg-[#f1f5f3] pl-[17px]" : "hover:bg-[#f8f8f6]"}`}><span className={`block text-sm font-semibold ${toolId === item.id ? "text-[#285f5b]" : "text-[#283446]"}`}>{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#737c89]">{item.description}</span></button>)}</nav>
    </aside>

    <main className="min-w-0 space-y-5">
      <section className="overflow-hidden border border-[#d6d8d5] bg-white">
        <header className="border-b border-[#e1e3e0] px-6 py-5"><h2 className="text-xl font-semibold text-[#182338]">{tool?.label}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#687180]">{tool?.description}</p></header>
        <div className="border-b border-[#e1e3e0] bg-[#fafaf8] px-6 py-5"><div className="max-w-md"><label><span className="text-xs font-semibold text-[#59636f]">Expediente</span><select value={caseId} onChange={(e) => { setCaseId(e.target.value); setResult(undefined); setError(""); }} className="mt-2 h-11 w-full border border-[#bfc4c1] bg-white px-3 text-sm"><option value="">Trabajar sin expediente</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.identificador ? `${item.identificador} · ` : ""}{item.name}</option>)}</select></label>{casesLoading && <p className="mt-2 text-xs text-[#687180]">Cargando expedientes…</p>}{casesError && <div className="mt-2 space-y-2"><div className="flex items-center justify-between gap-3 text-xs text-[#8a4d30]"><span>{casesError}</span><button type="button" onClick={() => void loadCases()} className="font-semibold underline">Reintentar</button></div><label className="block"><span className="text-xs text-[#687180]">También puede indicar el número interno:</span><input type="number" min="1" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="Número interno" className="mt-1 h-10 w-full border border-[#bfc4c1] bg-white px-3 text-sm" /></label></div>}</div></div>
        {usesCaseDocuments
          ? <CaseDocumentCorpus documents={caseDocuments} loading={documentsLoading} error={documentsError} />
          : <div className={`grid gap-4 p-6 ${tool?.inputs === 2 ? "lg:grid-cols-2" : ""}`}><Source label={tool?.inputs === 2 ? "Fuente A" : "Material jurídico"} value={primary} onChange={setPrimary} documents={readyCaseDocuments} />{tool?.inputs === 2 && <Source label="Fuente B" value={secondary} onChange={setSecondary} documents={readyCaseDocuments} />}</div>}
        <div className="border-t border-[#e1e3e0] px-6 py-5"><label className="text-xs font-semibold text-[#59636f]">{usesCaseDocuments ? "Tu pregunta" : "Enfoque (opcional)"}</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={usesCaseDocuments ? "Ej.: ¿Qué contradicciones surgen de la prueba incorporada?" : "Ej.: Priorizar los argumentos favorables a la defensa"} className="h-11 flex-1 border border-[#bfc4c1] bg-white px-3 text-sm outline-none focus:border-[#3f6f6b]"/><button disabled={busy || !canExecute} onClick={execute} className="h-11 bg-[#285f5b] px-6 text-sm font-semibold text-white transition hover:bg-[#204e4a] disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Revisando…" : actionLabels[toolId] || "Continuar"}</button>{busy && <button type="button" onClick={() => requestController.current?.abort()} className="h-11 border border-[#c8ccca] bg-white px-4 text-sm font-semibold text-[#5a2630]">Cancelar</button>}</div>{usesCaseDocuments && !query.trim() && !busy && <p className="mt-2 text-xs text-[#687180]">Escribí una pregunta para consultar los documentos.</p>}{error && <p role="alert" className="mt-3 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}</div>
      </section>
      {savedId && caseId && <a href={`/casos/${caseId}/consultas?consulta=${savedId}`} className="block border border-[#b9ccc8] bg-[#f1f6f4] px-5 py-4 text-sm font-semibold text-[#285f5b]">El análisis fue incorporado al expediente · Abrir registro →</a>}
      {!result ? <Empty busy={busy} /> : <><ReportActions notice={reportNotice} onCopy={() => void copyReport()} onDownload={downloadReport} onPrint={printReport} /><Results result={result} citations={citations} /></>}
    </main>
  </div>;
}

function CaseDocumentCorpus({ documents, loading, error }: { documents: CaseDocument[]; loading: boolean; error: string }) {
  const readyCount = documents.filter((document) => Boolean(document.extracted_text?.trim())).length;
  return <section className="p-6"><div className="border border-[#c8d6d3] bg-[#f4f8f7] p-5"><div><p className="text-xs font-semibold text-[#3f6f6b]">Documentos del expediente</p><h3 className="mt-1 text-base font-semibold text-[#283446]">{loading ? "Cargando documentos…" : `${documents.length} guardado${documents.length === 1 ? "" : "s"} · ${readyCount} listo${readyCount === 1 ? "" : "s"} para consultar`}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#687180]">La respuesta se prepara con los pasajes pertinentes de los documentos listos. Al final podrás abrir las fuentes utilizadas.</p></div>{error && <p role="alert" className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}{!loading && !error && documents.length === 0 && <p className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">Todavía no hay documentos guardados. Cargá uno desde Documentos.</p>}{!loading && documents.length > 0 && readyCount === 0 && <p className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">Los documentos están guardados, pero todavía no tienen texto disponible para consultar. Revisá su estado en Documentos.</p>}{documents.length > 0 && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-3 border border-[#d8e1df] bg-white px-3 py-2 text-xs font-medium text-[#44504f]" title={document.name}><span className="truncate">{document.name}</span><span className={document.extracted_text?.trim() ? "text-[#28705f]" : document.status === "error" ? "text-red-600" : "text-amber-700"}>{documentStatusLabel(document)}</span></li>)}</ul>}</div></section>;
}

function documentStatusLabel(document: CaseDocument) { if (document.extracted_text?.trim()) return "Listo"; if (document.status === "error") return "Con error"; if (document.status === "procesando") return "Procesando"; return "Pendiente"; }

function Source({ label, value, onChange, documents }: { label: string; value: string; onChange: (value: string) => void; documents: CaseDocument[] }) {
  const [uploading, setUploading] = useState(false); const [fileName, setFileName] = useState(""); const [uploadError, setUploadError] = useState("");
  async function extract(file?: File) {
    if (!file) return; setUploading(true); setUploadError("");
    try { const data = new FormData(); data.set("file", file); const response = await fetch(`${apiUrl}/api/ia/extract-file`, { method: "POST", credentials: "include", body: data }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo leer el archivo."); onChange(body.document.text); setFileName(body.document.name); }
    catch (cause) { setUploadError(cause instanceof Error ? cause.message : "No se pudo leer el archivo."); } finally { setUploading(false); }
  }
  return <div className="block"><span className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[.1em] text-[#59636f]"><span>{label}</span>{documents.length ? <select aria-label={`Documento para ${label}`} defaultValue="" onChange={(e) => { const document = documents.find((item) => String(item.id) === e.target.value); if (document?.extracted_text) { onChange(document.extracted_text); setFileName(document.name); } }} className="max-w-52 border border-[#bfc4c1] bg-white px-2 py-1 text-[11px] normal-case tracking-normal"><option value="">Seleccionar documento…</option>{documents.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : null}</span>
    <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void extract(e.dataTransfer.files[0]); }} className="mt-2 flex cursor-pointer items-center justify-between gap-3 border border-[#c8ccca] bg-[#fafaf8] px-4 py-3 transition hover:border-[#778582]"><span><strong className="block text-sm font-medium text-[#34413f]">{uploading ? "Leyendo documento…" : "Adjuntar documento"}</strong><span className="text-xs text-[#747d7b]">PDF, DOCX, TXT, MD o CSV · máximo 15 MB</span></span><span className="border border-[#bfc4c1] bg-white px-3 py-2 text-xs font-semibold">Examinar</span><input accept=".pdf,.docx,.txt,.md,.csv" type="file" className="hidden" onChange={(e) => void extract(e.target.files?.[0])}/></label>
    {fileName && <div className="mt-2 flex items-center justify-between border border-[#cfdbd8] bg-[#f4f7f6] px-3 py-2 text-xs font-medium text-[#285f5b]"><span>{fileName}</span><button type="button" className="underline" onClick={() => { onChange(""); setFileName(""); }}>Quitar</button></div>}{uploadError && <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p>}
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Pegue aquí el contenido que desea analizar o adjunte un documento." className="mt-2 min-h-48 w-full resize-y border border-[#bfc4c1] bg-white p-4 text-sm leading-6 outline-none focus:border-[#3f6f6b]"/><span className="mt-1 block text-right text-xs text-[#7b838e]">{value.length.toLocaleString("es-AR")} caracteres</span></div>;
}
function Empty({ busy }: { busy: boolean }) { return <section className="border border-[#d6d8d5] bg-white px-6 py-7"><h3 className="text-base font-semibold text-[#283446]">{busy ? "Revisando el material" : "Listo para empezar"}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#687180]">{busy ? "Esto puede demorar unos segundos. Podés cancelar desde el formulario." : "Elegí una tarea y un expediente, o adjuntá el documento que quieras revisar."}</p></section>; }
function ReportActions({ notice, onCopy, onDownload, onPrint }: { notice: string; onCopy: () => void; onDownload: () => void; onPrint: () => void }) { return <div className="flex flex-wrap items-center justify-between gap-3 border border-[#d6d8d5] bg-[#fafaf8] px-4 py-3"><p aria-live="polite" className="text-xs text-[#687180]">{notice || "El informe puede incorporarse a un escrito o conservarse fuera del sistema."}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={onCopy} className="border border-[#bfc4c1] bg-white px-3 py-2 text-xs font-semibold text-[#34413f] hover:bg-[#f3f4f2]">Copiar</button><button type="button" onClick={onDownload} className="border border-[#bfc4c1] bg-white px-3 py-2 text-xs font-semibold text-[#34413f] hover:bg-[#f3f4f2]">Descargar .txt</button><button type="button" onClick={onPrint} className="bg-[#34413f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#293432]">Imprimir / PDF</button></div></div>; }
function Results({ result, citations }: { result: Result; citations: Citation[] }) { const answer = result.conclusion || result.resumen || "No se encontró una respuesta en el material disponible."; return <section className="space-y-3"><div className="border border-[#d6d8d5] bg-white px-6 py-6"><h2 className="text-xl font-semibold text-[#182338]">{result.titulo || "Resultado"}</h2><p className="mt-4 max-w-4xl text-base leading-7 text-[#34413f]">{answer}</p>{result.puntos_clave?.length ? <ul className="mt-5 space-y-3 border-t border-[#e1e3e0] pt-4">{result.puntos_clave.map((point, index) => <li key={index} className="flex gap-3 text-sm leading-6 text-[#596473]"><span className="font-semibold text-[#3f6f6b]">{index + 1}.</span><span>{point}</span></li>)}</ul> : null}</div>{citations.length > 0 && <details className="border border-[#d6d8d5] bg-white px-5 py-4"><summary className="cursor-pointer text-sm font-semibold text-[#285f5b]">Ver fuentes ({citations.length})</summary><div className="mt-4 divide-y divide-[#e1e3e0] border border-[#d6d8d5]">{citations.map((item, index) => <details key={item.citation_id} className="px-4 py-3"><summary className="cursor-pointer text-sm font-semibold">Fuente {index + 1} · {item.document_name}</summary><blockquote className="mt-3 border-l-2 border-[#819d99] pl-3 text-sm leading-6 text-[#606a78]">{item.text}</blockquote>{item.document_url && <a href={item.document_url} className="mt-3 inline-block text-xs font-semibold text-[#285f5b]">Abrir documento →</a>}</details>)}</div></details>}</section>; }

function formatReport(result: Result, citations: Citation[]) {
  const lines = [result.titulo || "Resultado", "", result.conclusion || result.resumen || "Sin respuesta.", ""];
  if (result.puntos_clave?.length) lines.push(...result.puntos_clave.map((point, index) => `${index + 1}. ${point}`), "");
  if (citations.length) {
    lines.push("FUENTES");
    citations.forEach((item, index) => lines.push(`${index + 1}. ${item.document_name}`, item.text, ""));
  }
  lines.push(`LegalMind · ${new Date().toLocaleString("es-AR")}`, "Documento de trabajo sujeto a revisión profesional.");
  return lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trim();
}
