"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadPlainTextReport, printPlainTextReport } from "../../lib/legalReport";

type Tool = { id: string; label: string; description: string; inputs: number; family?: string; resultView?: string; accent?: string; fields?: string[] };
type CaseOption = { id: number; name: string; identificador?: string };
type CaseDocument = { id: number; name: string; extracted_text?: string };
type Finding = { titulo: string; detalle: string; evidencia: string; prioridad: string };
type Row = { aspecto: string; documento_a: string; documento_b: string; evaluacion: string };
type Result = { titulo: string; resumen: string; hallazgos: Finding[]; tabla: Row[]; alertas: string[]; conclusion: string; limitaciones: string[] };
type Citation = { citation_id: string; document_id: string; document_name: string; chunk_index: number; page?: number | null; location_label?: string; document_url?: string | null; section?: string | null; text: string; score: number };
type Evidence = { status: "respaldado" | "parcial" | "sin_respaldo"; requires_human_review: boolean; citations_count: number; usable_citations: number; average_score: number };
type Grounding = { total_claims: number; supported_claims: number; weak_claims: number; unsupported_claims: number; coverage: number; requires_human_review: boolean; claims: Array<{ claim_id: string; type: string; text: string; status: "respaldada" | "debil" | "sin_respaldo"; citation_ids: string[]; support_score: number }> };

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const fallbackTools: Tool[] = [
  { id: "resumen_expediente", label: "Resumen de expediente", description: "Número, fecha, partes, estado y próximos pasos.", inputs: 1 },
  { id: "comparar_documentos", label: "Comparar documentos", description: "Coincidencias, cambios y contradicciones.", inputs: 2 },
  { id: "comparar_jurisprudencia", label: "Comparar jurisprudencia", description: "Hechos, holding, criterios y aplicabilidad.", inputs: 2 },
  { id: "cronologia", label: "Línea de tiempo", description: "Actuaciones, audiencias y vencimientos.", inputs: 1 },
  { id: "consulta_rag", label: "Consulta RAG", description: "Pregunte sobre el material con citas recuperadas.", inputs: 1 },
];

export default function CentroAnalisisIA() {
  const [tools, setTools] = useState<Tool[]>(fallbackTools);
  const [cases, setCases] = useState<CaseOption[]>([]); const [caseId, setCaseId] = useState("");
  const [casesLoading, setCasesLoading] = useState(true); const [casesError, setCasesError] = useState("");
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [parameters, setParameters] = useState<Record<string, string | boolean>>({}); const [savedId, setSavedId] = useState<number>();
  const [toolId, setToolId] = useState(fallbackTools[0].id);
  const [primary, setPrimary] = useState(""); const [secondary, setSecondary] = useState("");
  const [query, setQuery] = useState(""); const [result, setResult] = useState<Result>();
  const [citations, setCitations] = useState<Citation[]>([]); const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const [evidence, setEvidence] = useState<Evidence>();
  const [grounding, setGrounding] = useState<Grounding>();
  const tool = useMemo(() => tools.find((item) => item.id === toolId) || tools[0], [toolId, tools]);

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
    if (!caseId) { setCaseDocuments([]); return; }
    fetch(`${apiUrl}/api/ia/cases/${caseId}/documents?include_text=true`, { credentials: "include" }).then((r) => r.json()).then((body) => setCaseDocuments(body.documents || [])).catch(() => setCaseDocuments([]));
  }, [caseId]);
  async function execute() {
    setBusy(true); setError(""); setReportNotice(""); setResult(undefined); setCitations([]); setSavedId(undefined); setEvidence(undefined); setGrounding(undefined);
    const controller = new AbortController(); requestController.current = controller;
    try {
      const response = await fetch(`${apiUrl}/api/ia/tools/${toolId}/run`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ primary_text: primary, secondary_text: secondary, query, parameters, case_id: caseId ? Number(caseId) : null }) });
      const body = await response.json();
      if (!response.ok) throw new Error([body.error, body.details].filter(Boolean).join(" "));
      setResult(body.result); setCitations(body.citations || []); setSavedId(body.saved_query?.id); setEvidence(body.evidence); setGrounding(body.grounding);
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
      <div className="border-b border-[#e1e3e0] px-5 py-4"><h2 className="text-sm font-semibold uppercase tracking-[.08em] text-[#44504f]">Tipo de análisis</h2><p className="mt-1 text-xs leading-5 text-[#747d7b]">Seleccione el procedimiento que desea realizar.</p></div>
      <nav>{tools.map((item) => <button key={item.id} onClick={() => { setToolId(item.id); setResult(undefined); setError(""); }} className={`block w-full border-b border-[#eceeeb] px-5 py-4 text-left transition last:border-b-0 ${toolId === item.id ? "border-l-[3px] border-l-[#3f6f6b] bg-[#f1f5f3] pl-[17px]" : "hover:bg-[#f8f8f6]"}`}><span className={`block text-sm font-semibold ${toolId === item.id ? "text-[#285f5b]" : "text-[#283446]"}`}>{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#737c89]">{item.description}</span></button>)}</nav>
    </aside>

    <main className="min-w-0 space-y-5">
      <section className="overflow-hidden border border-[#d6d8d5] bg-white">
        <header className="border-b border-[#e1e3e0] px-6 py-5"><h2 className="text-xl font-semibold text-[#182338]">{tool?.label}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#687180]">{tool?.description}</p></header>
        <div className="grid gap-4 border-b border-[#e1e3e0] bg-[#fafaf8] px-6 py-5 md:grid-cols-[minmax(220px,1fr)_2fr]"><div><label><span className="text-xs font-semibold uppercase tracking-[.1em] text-[#59636f]">Expediente asociado</span><select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="mt-2 h-11 w-full border border-[#bfc4c1] bg-white px-3 text-sm"><option value="">Sin asociar a un expediente</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.identificador ? `${item.identificador} · ` : ""}{item.name}</option>)}</select></label>{casesLoading && <p className="mt-2 text-xs text-[#687180]">Actualizando listado de expedientes…</p>}{casesError && <div className="mt-2 space-y-2"><div className="flex items-center justify-between gap-3 text-xs text-[#8a4d30]"><span>{casesError}</span><button type="button" onClick={() => void loadCases()} className="font-semibold underline">Reintentar</button></div><label className="block"><span className="text-xs text-[#687180]">También puede indicar el ID del expediente manualmente:</span><input type="number" min="1" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="ID del expediente" className="mt-1 h-10 w-full border border-[#bfc4c1] bg-white px-3 text-sm" /></label></div>}</div><ToolParameters tool={tool} values={parameters} onChange={setParameters} /></div>
        <div className={`grid gap-4 p-6 ${tool?.inputs === 2 ? "lg:grid-cols-2" : ""}`}><Source label={tool?.inputs === 2 ? "Fuente A" : "Material jurídico"} value={primary} onChange={setPrimary} documents={caseDocuments} />{tool?.inputs === 2 && <Source label="Fuente B" value={secondary} onChange={setSecondary} documents={caseDocuments} />}</div>
        <div className="border-t border-[#e1e3e0] px-6 py-5"><label className="text-xs font-semibold uppercase tracking-[.1em] text-[#59636f]">Consulta o enfoque opcional</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej.: ¿Qué criterio resulta más favorable para la defensa?" className="h-11 flex-1 border border-[#bfc4c1] bg-white px-3 text-sm outline-none focus:border-[#3f6f6b]"/><button disabled={busy || !primary.trim() || (tool?.inputs === 2 && !secondary.trim())} onClick={execute} className="h-11 bg-[#285f5b] px-6 text-sm font-semibold text-white transition hover:bg-[#204e4a] disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Procesando…" : "Iniciar análisis"}</button>{busy && <button type="button" onClick={() => requestController.current?.abort()} className="h-11 border border-[#c8ccca] bg-white px-4 text-sm font-semibold text-[#5a2630]">Cancelar</button>}</div>{error && <p role="alert" className="mt-3 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}</div>
      </section>
      {savedId && caseId && <a href={`/casos/${caseId}/consultas?consulta=${savedId}`} className="block border border-[#b9ccc8] bg-[#f1f6f4] px-5 py-4 text-sm font-semibold text-[#285f5b]">El análisis fue incorporado al expediente · Abrir registro →</a>}
      {evidence && <EvidenceStatus evidence={evidence} />}
      {grounding && <GroundingStatus grounding={grounding} />}
      {!result ? <Empty busy={busy} /> : <><ReportActions notice={reportNotice} onCopy={() => void copyReport()} onDownload={downloadReport} onPrint={printReport} /><Results result={result} citations={citations} view={tool?.resultView} /></>}
    </main>
  </div>;
}

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
function Empty({ busy }: { busy: boolean }) { return <section className="border border-[#d6d8d5] bg-white px-6 py-7"><h3 className="text-base font-semibold text-[#283446]">{busy ? "Análisis en curso" : "Cómo comenzar"}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#687180]">{busy ? "El documento está siendo procesado. Puede cancelar la operación desde el formulario." : "Seleccione un tipo de análisis, incorpore el material jurídico y, si corresponde, asócielo a un expediente antes de iniciar."}</p></section>; }
function ReportActions({ notice, onCopy, onDownload, onPrint }: { notice: string; onCopy: () => void; onDownload: () => void; onPrint: () => void }) { return <div className="flex flex-wrap items-center justify-between gap-3 border border-[#d6d8d5] bg-[#fafaf8] px-4 py-3"><p aria-live="polite" className="text-xs text-[#687180]">{notice || "El informe puede incorporarse a un escrito o conservarse fuera del sistema."}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={onCopy} className="border border-[#bfc4c1] bg-white px-3 py-2 text-xs font-semibold text-[#34413f] hover:bg-[#f3f4f2]">Copiar</button><button type="button" onClick={onDownload} className="border border-[#bfc4c1] bg-white px-3 py-2 text-xs font-semibold text-[#34413f] hover:bg-[#f3f4f2]">Descargar .txt</button><button type="button" onClick={onPrint} className="bg-[#34413f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#293432]">Imprimir / PDF</button></div></div>; }
function Results({ result, citations, view }: { result: Result; citations: Citation[]; view?: string }) { const timeline = view === "timeline"; return <section className="space-y-4"><div className="border border-[#d6d8d5] bg-white px-6 py-6"><p className="text-xs font-semibold uppercase tracking-[.1em] text-[#65716f]">{view === "precedents" ? "Comparación jurídica" : view === "answer" ? "Respuesta documental" : "Informe de análisis"}</p><h2 className="mt-2 text-2xl font-semibold text-[#182338]">{result.titulo}</h2><p className="mt-3 max-w-4xl leading-7 text-[#596473]">{result.resumen}</p></div>{result.hallazgos?.length > 0 && <Panel title={timeline ? "Secuencia procesal" : "Hallazgos"}><div className={timeline ? "border-l border-[#9b7a45] pl-5" : "divide-y divide-[#e1e3e0]"}>{result.hallazgos.map((item, i) => <article key={i} className={timeline ? "relative mb-3 border border-[#e2d8c7] bg-[#fdfbf7] p-4 before:absolute before:-left-[26px] before:top-5 before:h-2 before:w-2 before:rounded-full before:bg-[#8c6a36]" : "py-4 first:pt-0 last:pb-0"}><div className="flex justify-between gap-3"><h4 className="font-semibold text-[#283446]">{item.titulo}</h4><span className="text-xs font-semibold uppercase text-[#8a662f]">{item.prioridad}</span></div><p className="mt-2 text-sm leading-6 text-[#606a78]">{item.detalle}</p>{item.evidencia && <p className="mt-2 border-l-2 border-[#819d99] pl-3 text-xs text-[#687180]">{item.evidencia}</p>}</article>)}</div></Panel>}{result.tabla?.length > 0 && <Panel title={view === "precedents" ? "Contraste de precedentes" : "Cuadro comparativo"}><div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="border-y border-[#d6d8d5] bg-[#f7f7f5] text-xs uppercase text-[#59636f]"><tr><th className="p-3">Aspecto</th><th className="p-3">Fuente / postura A</th><th className="p-3">Fuente / postura B</th><th className="p-3">Evaluación</th></tr></thead><tbody>{result.tabla.map((row, i) => <tr key={i} className="border-b border-[#e1e3e0]"><td className="p-3 font-semibold">{row.aspecto}</td><td className="p-3">{row.documento_a}</td><td className="p-3">{row.documento_b}</td><td className="p-3 text-[#285f5b]">{row.evaluacion}</td></tr>)}</tbody></table></div></Panel>}{result.alertas?.length > 0 && <Panel title="Observaciones"><ul className="divide-y divide-[#e6dfd3] border border-[#e6dfd3]">{result.alertas.map((item) => <li key={item} className="bg-[#fdfbf7] px-4 py-3 text-sm font-medium text-[#70572f]">{item}</li>)}</ul></Panel>}<Panel title={view === "precedents" ? "Aplicabilidad y criterio" : "Conclusión"}><p className="leading-7 text-[#596473]">{result.conclusion}</p></Panel>{citations.length > 0 && <Panel title="Documentos consultados"><div className="divide-y divide-[#e1e3e0] border border-[#d6d8d5]">{citations.map((item) => <details key={item.citation_id} className="px-4 py-3"><summary className="cursor-pointer text-sm font-semibold"><span className="mr-2 text-xs text-[#3f6f6b]">{item.citation_id}</span>{item.document_name} · {item.location_label || `Fragmento ${item.chunk_index + 1}`}</summary>{item.section && <p className="mt-3 text-xs font-semibold uppercase text-[#3e7774]">Sección: {item.section}</p>}<blockquote className="mt-2 border-l-2 border-[#819d99] pl-3 text-sm leading-6 text-[#606a78]">{item.text}</blockquote>{item.document_url && <a href={item.document_url} className="mt-3 inline-block text-xs font-semibold text-[#285f5b]">Abrir en el expediente →</a>}</details>)}</div></Panel>}{result.limitaciones?.length > 0 && <Panel title="Consideraciones para la revisión"><ul className="list-disc space-y-1 pl-5 text-sm text-[#606a78]">{result.limitaciones.map((item) => <li key={item}>{item}</li>)}</ul></Panel>}</section>; }
function EvidenceStatus({ evidence }: { evidence: Evidence }) { const supported = evidence.status === "respaldado"; return <section className={`rounded-2xl border px-5 py-4 ${supported ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong>{supported ? "Evidencia documental suficiente" : "Revisión humana necesaria"}</strong><span className="text-xs font-bold uppercase">{evidence.usable_citations}/{evidence.citations_count} citas utilizables</span></div><p className="mt-1 text-sm opacity-75">{supported ? "La respuesta tiene múltiples pasajes recuperados; verificá igualmente el texto original." : "La respuesta no alcanzó el umbral de respaldo documental. No la uses como conclusión jurídica sin verificar las fuentes."}</p></section>; }
function GroundingStatus({ grounding }: { grounding: Grounding }) { return <details className={`rounded-2xl border px-5 py-4 ${grounding.requires_human_review ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><summary className="cursor-pointer font-bold">Cobertura de afirmaciones: {(grounding.coverage * 100).toFixed(0)}% · {grounding.supported_claims}/{grounding.total_claims} respaldadas</summary><div className="mt-3 grid gap-2">{grounding.claims.map((claim) => <article key={claim.claim_id} className="rounded-xl bg-white/70 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{claim.claim_id} · {claim.type}</strong><span className={`text-xs font-bold uppercase ${claim.status === "respaldada" ? "text-emerald-700" : claim.status === "debil" ? "text-amber-700" : "text-red-700"}`}>{claim.status.replace("_", " ")}</span></div><p className="mt-1 text-[#10213e]/60">{claim.text}</p>{claim.citation_ids.length > 0 && <p className="mt-2 text-xs font-semibold text-[#285f5b]">Respaldo: {claim.citation_ids.join(", ")}</p>}</article>)}</div></details>; }
function ToolParameters({ tool, values, onChange }: { tool?: Tool; values: Record<string, string | boolean>; onChange: (value: Record<string, string | boolean>) => void }) { if (!tool?.fields?.length) return <div/>; return <div><span className="text-xs font-bold uppercase tracking-[.14em] text-[#10213e]/45">Configuración profesional</span><div className="mt-2 flex flex-wrap gap-2">{tool.fields.map((field) => <input key={field} value={String(values[field] || "")} onChange={(e) => onChange({ ...values, [field]: e.target.value })} placeholder={field.replaceAll("_", " ")} className="h-11 min-w-44 flex-1 rounded-xl border border-[#b8c8c5] bg-white px-3 text-sm" />)}</div></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-[#d6d8d5] bg-white p-5"><h3 className="mb-4 border-b border-[#e1e3e0] pb-3 text-base font-semibold text-[#283446]">{title}</h3>{children}</section>; }

function formatReport(result: Result, citations: Citation[]) {
  const lines = [result.titulo, "=".repeat(Math.min(72, Math.max(12, result.titulo.length))), "", "RESUMEN", result.resumen, ""];
  if (result.hallazgos?.length) {
    lines.push("HALLAZGOS");
    result.hallazgos.forEach((item, index) => lines.push(`${index + 1}. ${item.titulo} [${item.prioridad}]`, item.detalle, item.evidencia ? `Evidencia: ${item.evidencia}` : "", ""));
  }
  if (result.tabla?.length) {
    lines.push("CUADRO COMPARATIVO");
    result.tabla.forEach((row, index) => lines.push(`${index + 1}. ${row.aspecto}`, `Fuente A: ${row.documento_a}`, `Fuente B: ${row.documento_b}`, `Evaluación: ${row.evaluacion}`, ""));
  }
  if (result.alertas?.length) lines.push("OBSERVACIONES", ...result.alertas.map((item) => `- ${item}`), "");
  lines.push("CONCLUSIÓN", result.conclusion, "");
  if (citations.length) {
    lines.push("DOCUMENTOS CONSULTADOS");
    citations.forEach((item) => lines.push(`[${item.citation_id}] ${item.document_name} · ${item.location_label || `Fragmento ${item.chunk_index + 1}`}`, item.text, ""));
  }
  if (result.limitaciones?.length) lines.push("CONSIDERACIONES PARA LA REVISIÓN", ...result.limitaciones.map((item) => `- ${item}`), "");
  lines.push(`Generado por LegalMind · ${new Date().toLocaleString("es-AR")}`, "Documento de trabajo sujeto a revisión profesional.");
  return lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trim();
}
