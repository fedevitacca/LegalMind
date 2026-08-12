"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tool = { id: string; label: string; description: string; inputs: number; family?: string; resultView?: string; accent?: string; fields?: string[] };
type CaseOption = { id: number; name: string; identificador?: string };
type CaseDocument = { id: number; name: string; extracted_text?: string };
type Finding = { titulo: string; detalle: string; evidencia: string; prioridad: string };
type Row = { aspecto: string; documento_a: string; documento_b: string; evaluacion: string };
type Result = { titulo: string; resumen: string; hallazgos: Finding[]; tabla: Row[]; alertas: string[]; conclusion: string; limitaciones: string[] };
type Citation = { citation_id: string; document_id: string; document_name: string; chunk_index: number; page?: number | null; location_label?: string; document_url?: string | null; section?: string | null; text: string; score: number };
type Evidence = { status: "respaldado" | "parcial" | "sin_respaldo"; requires_human_review: boolean; citations_count: number; usable_citations: number; average_score: number };
type AnalysisMetadata = { duration_ms?: number; model?: string; semantic_retrieval?: string; evidence?: Evidence };

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const fallbackTools: Tool[] = [
  { id: "resumen_expediente", label: "Resumen de expediente", description: "Número, fecha, partes, estado y próximos pasos.", inputs: 1 },
  { id: "comparar_documentos", label: "Comparar documentos", description: "Coincidencias, cambios y contradicciones.", inputs: 2 },
  { id: "comparar_jurisprudencia", label: "Comparar jurisprudencia", description: "Hechos, holding, criterios y aplicabilidad.", inputs: 2 },
  { id: "cronologia", label: "Línea de tiempo", description: "Actuaciones, audiencias y vencimientos.", inputs: 1 },
  { id: "matriz_evidencia", label: "Matriz de evidencia", description: "Hechos, respaldo, contradicciones y vacíos.", inputs: 1 },
  { id: "detectar_riesgos", label: "Riesgos y omisiones", description: "Control inteligente del material jurídico.", inputs: 1 },
  { id: "consulta_rag", label: "Consulta RAG", description: "Pregunte sobre el material con citas recuperadas.", inputs: 1 },
];

export default function CentroAnalisisIA() {
  const [tools, setTools] = useState<Tool[]>(fallbackTools);
  const [cases, setCases] = useState<CaseOption[]>([]); const [caseId, setCaseId] = useState("");
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [parameters, setParameters] = useState<Record<string, string | boolean>>({}); const [savedId, setSavedId] = useState<number>();
  const [toolId, setToolId] = useState(fallbackTools[0].id);
  const [primary, setPrimary] = useState(""); const [secondary, setSecondary] = useState("");
  const [query, setQuery] = useState(""); const [result, setResult] = useState<Result>();
  const [citations, setCitations] = useState<Citation[]>([]); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [elapsed, setElapsed] = useState(0);
  const [metadata, setMetadata] = useState<AnalysisMetadata>(); const requestController = useRef<AbortController | null>(null);
  const [evidence, setEvidence] = useState<Evidence>();
  const tool = useMemo(() => tools.find((item) => item.id === toolId) || tools[0], [toolId, tools]);

  useEffect(() => {
    fetch(`${apiUrl}/api/ia/tools`).then((r) => r.json()).then((body) => body.tools?.length && setTools(body.tools)).catch(() => undefined);
    fetch(`${apiUrl}/api/casos`, { credentials: "include" }).then((r) => r.json()).then((body) => setCases(body.cases || [])).catch(() => undefined);
    const requestedCase = new URLSearchParams(window.location.search).get("case_id");
    if (requestedCase) setCaseId(requestedCase);
  }, []);
  useEffect(() => {
    if (!caseId) { setCaseDocuments([]); return; }
    fetch(`${apiUrl}/api/ia/cases/${caseId}/documents?include_text=true`, { credentials: "include" }).then((r) => r.json()).then((body) => setCaseDocuments(body.documents || [])).catch(() => setCaseDocuments([]));
  }, [caseId]);
  useEffect(() => {
    if (!busy) return;
    const started = Date.now(); setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function execute() {
    setBusy(true); setError(""); setResult(undefined); setCitations([]); setSavedId(undefined); setMetadata(undefined); setEvidence(undefined);
    const controller = new AbortController(); requestController.current = controller;
    try {
      const response = await fetch(`${apiUrl}/api/ia/tools/${toolId}/run`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ primary_text: primary, secondary_text: secondary, query, parameters, case_id: caseId ? Number(caseId) : null }) });
      const body = await response.json();
      if (!response.ok) throw new Error([body.error, body.details].filter(Boolean).join(" "));
      setResult(body.result); setCitations(body.citations || []); setSavedId(body.saved_query?.id); setMetadata(body._metadata); setEvidence(body.evidence);
    } catch (cause) { setError(cause instanceof DOMException && cause.name === "AbortError" ? "Análisis cancelado por el usuario." : cause instanceof Error ? cause.message : "No se pudo completar el análisis."); }
    finally { requestController.current = null; setBusy(false); }
  }

  return <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
    <aside className="rounded-3xl bg-[#10213e] p-4 text-white shadow-xl shadow-[#10213e]/10">
      <div className="px-2 pb-4 pt-2"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#8ec5c0]">Workspace privado</p><h2 className="mt-2 text-2xl font-semibold">Herramientas IA</h2><p className="mt-2 text-sm leading-5 text-white/55">Cada módulo aplica un flujo jurídico y una salida propios.</p></div>
      <nav className="grid gap-2">{tools.map((item) => <button key={item.id} onClick={() => { setToolId(item.id); setResult(undefined); setError(""); }} className={`rounded-2xl p-3 text-left transition ${toolId === item.id ? "bg-white text-[#10213e] shadow-lg" : "bg-white/[.06] text-white hover:bg-white/[.1]"}`}><span className="block text-sm font-bold">{item.label}</span><span className={`mt-1 block text-xs leading-4 ${toolId === item.id ? "text-[#10213e]/55" : "text-white/45"}`}>{item.description}</span></button>)}</nav>
    </aside>

    <main className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-3xl border border-[#b8c8c5]/60 bg-white shadow-sm">
        <header className="border-b border-[#dce5e2] bg-[linear-gradient(120deg,#f8fbfa,#edf5f2)] px-6 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#3e7774]">{tool?.family || "análisis"}</p><h2 className="mt-1 text-2xl font-semibold">{tool?.label}</h2></div><span className="rounded-full border border-[#6da39f]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#346d69]">Pipeline {tool?.resultView || "jurídico"}</span></div><p className="mt-2 max-w-2xl text-sm text-[#10213e]/55">{tool?.description}</p></header>
        <div className="grid gap-4 border-b border-[#dce5e2] bg-[#fbfcfc] px-6 py-4 md:grid-cols-[minmax(220px,1fr)_2fr]"><label><span className="text-xs font-bold uppercase tracking-[.14em] text-[#10213e]/45">Expediente donde guardar</span><select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#b8c8c5] bg-white px-3"><option value="">No guardar esta consulta</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.identificador ? `${item.identificador} · ` : ""}{item.name}</option>)}</select></label><ToolParameters tool={tool} values={parameters} onChange={setParameters} /></div>
        <div className={`grid gap-4 p-6 ${tool?.inputs === 2 ? "lg:grid-cols-2" : ""}`}><Source label={tool?.inputs === 2 ? "Fuente A" : "Material jurídico"} value={primary} onChange={setPrimary} documents={caseDocuments} />{tool?.inputs === 2 && <Source label="Fuente B" value={secondary} onChange={setSecondary} documents={caseDocuments} />}</div>
        <div className="border-t border-[#dce5e2] px-6 py-4"><label className="text-xs font-bold uppercase tracking-[.14em] text-[#10213e]/45">Consulta o enfoque opcional</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej.: ¿Qué criterio resulta más favorable para la defensa?" className="h-12 flex-1 rounded-xl border border-[#b8c8c5] bg-[#f8faf9] px-4 outline-none focus:border-[#3e7774]"/><button disabled={busy || !primary.trim() || (tool?.inputs === 2 && !secondary.trim())} onClick={execute} className="h-12 rounded-xl bg-[#b88a45] px-6 font-bold text-white shadow-lg shadow-[#b88a45]/20 transition hover:bg-[#a47736] disabled:cursor-not-allowed disabled:opacity-45">{busy ? `Analizando · ${elapsed}s` : "Ejecutar análisis"}</button>{busy && <button type="button" onClick={() => requestController.current?.abort()} className="h-12 rounded-xl border border-red-200 bg-red-50 px-4 font-bold text-red-700">Cancelar</button>}</div>{error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}</div>
      </section>
      {savedId && caseId && <a href={`/casos/${caseId}/consultas?consulta=${savedId}`} className="block rounded-2xl border border-[#6da39f]/35 bg-[#e8f4f1] px-5 py-4 text-sm font-bold text-[#285f5b]">Consulta guardada en el expediente · Abrir historial →</a>}
      {metadata && <p className="text-right text-xs text-[#10213e]/45">Procesado localmente con {metadata.model} en {((metadata.duration_ms || 0) / 1000).toFixed(1)}s · RAG: {metadata.semantic_retrieval}</p>}
      {evidence && <EvidenceStatus evidence={evidence} />}
      {!result ? <Empty busy={busy} /> : <Results result={result} citations={citations} view={tool?.resultView} />}
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
  return <div className="block"><span className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#10213e]/45"><span>{label}</span>{documents.length ? <select aria-label={`Documento para ${label}`} defaultValue="" onChange={(e) => { const document = documents.find((item) => String(item.id) === e.target.value); if (document?.extracted_text) { onChange(document.extracted_text); setFileName(document.name); } }} className="max-w-52 rounded-lg border border-[#b8c8c5] bg-white px-2 py-1 text-[11px] normal-case tracking-normal"><option value="">Documento del caso…</option>{documents.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : null}</span>
    <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void extract(e.dataTransfer.files[0]); }} className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#9db4b0] bg-[#edf5f2] px-4 py-3 transition hover:border-[#3e7774]"><span><strong className="block text-sm text-[#285f5b]">{uploading ? "Extrayendo contenido…" : "Arrastrá un PDF, DOCX, TXT, MD o CSV"}</strong><span className="text-xs text-[#10213e]/45">Hasta 15 MB · el texto queda listo para revisar</span></span><span className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Elegir archivo</span><input accept=".pdf,.docx,.txt,.md,.csv" type="file" className="hidden" onChange={(e) => void extract(e.target.files?.[0])}/></label>
    {fileName && <div className="mt-2 flex items-center justify-between rounded-lg bg-[#e8f4f1] px-3 py-2 text-xs font-semibold text-[#285f5b]"><span>✓ {fileName}</span><button type="button" onClick={() => { onChange(""); setFileName(""); }}>Quitar</button></div>}{uploadError && <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p>}
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="El texto extraído aparecerá aquí y también puede editarse manualmente…" className="mt-2 min-h-48 w-full resize-y rounded-2xl border border-[#b8c8c5] bg-[#f8faf9] p-4 text-sm leading-6 outline-none focus:border-[#3e7774] focus:ring-4 focus:ring-[#3e7774]/10"/><span className="mt-1 block text-right text-xs text-[#10213e]/35">{value.length.toLocaleString("es-AR")} caracteres</span></div>;
}
function Empty({ busy }: { busy: boolean }) { return <section className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#9db4b0] bg-white/55 p-8 text-center"><div><div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#dcebe8] text-2xl ${busy ? "animate-pulse" : ""}`}>✦</div><h3 className="mt-4 text-lg font-semibold">{busy ? "Leyendo, recuperando evidencia y razonando" : "El resultado aparecerá aquí"}</h3><p className="mt-1 text-sm text-[#10213e]/45">Los hallazgos incluirán evidencia recuperada y limitaciones explícitas.</p></div></section>; }
function Results({ result, citations, view }: { result: Result; citations: Citation[]; view?: string }) { const timeline = view === "timeline"; const risk = view === "risk"; return <section className="space-y-4"><div className={`rounded-3xl p-6 text-white ${risk ? "bg-[#571f27]" : timeline ? "bg-[#614718]" : "bg-[#10213e]"}`}><p className="text-xs font-bold uppercase tracking-[.2em] text-white/55">{view === "precedents" ? "Dictamen comparativo" : view === "answer" ? "Respuesta documentada" : "Informe especializado"}</p><h2 className="mt-2 text-2xl font-semibold">{result.titulo}</h2><p className="mt-3 max-w-4xl leading-7 text-white/70">{result.resumen}</p></div>{result.hallazgos?.length > 0 && <Panel title={timeline ? "Secuencia procesal" : risk ? "Mapa de riesgos" : view === "matrix" ? "Evaluación probatoria" : "Hallazgos"}><div className={timeline ? "border-l-2 border-[#c4974d] pl-5" : "grid gap-3 md:grid-cols-2"}>{result.hallazgos.map((item, i) => <article key={i} className={`p-4 ${timeline ? "relative mb-3 rounded-r-2xl bg-[#fff8e9] before:absolute before:-left-[27px] before:top-5 before:h-3 before:w-3 before:rounded-full before:bg-[#c4974d]" : risk ? "rounded-2xl border-l-4 border-red-400 bg-red-50" : "rounded-2xl bg-[#f3f7f5]"}`}><div className="flex justify-between gap-3"><h4 className="font-bold">{item.titulo}</h4><span className="text-xs font-bold uppercase text-[#a47736]">{item.prioridad}</span></div><p className="mt-2 text-sm leading-6 text-[#10213e]/65">{item.detalle}</p>{item.evidencia && <p className="mt-2 border-l-2 border-[#6da39f] pl-3 text-xs italic text-[#10213e]/48">{item.evidencia}</p>}</article>)}</div></Panel>}{result.tabla?.length > 0 && <Panel title={view === "precedents" ? "Contraste de precedentes" : view === "matrix" ? "Matriz hecho–evidencia" : "Cuadro comparativo"}><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-[#10213e]/45"><tr><th className="p-3">Aspecto</th><th className="p-3">Fuente / postura A</th><th className="p-3">Fuente / postura B</th><th className="p-3">Evaluación</th></tr></thead><tbody>{result.tabla.map((row, i) => <tr key={i} className="border-t border-[#dce5e2]"><td className="p-3 font-bold">{row.aspecto}</td><td className="p-3">{row.documento_a}</td><td className="p-3">{row.documento_b}</td><td className="p-3 text-[#3e7774]">{row.evaluacion}</td></tr>)}</tbody></table></div></Panel>}{result.alertas?.length > 0 && <Panel title="Alertas"><ul className="grid gap-2">{result.alertas.map((item) => <li key={item} className="rounded-xl bg-[#fff7e8] px-4 py-3 text-sm font-semibold text-[#78531e]">{item}</li>)}</ul></Panel>}<Panel title={view === "precedents" ? "Aplicabilidad y criterio" : "Conclusión"}><p className="leading-7 text-[#10213e]/70">{result.conclusion}</p></Panel>{citations.length > 0 && <Panel title="Fuentes verificables"><div className="grid gap-2">{citations.map((item) => <details key={item.citation_id} className="rounded-xl border border-[#d6e1de] bg-[#f3f7f5] px-4 py-3"><summary className="cursor-pointer text-sm font-bold"><span className="mr-2 rounded bg-[#dcebe8] px-2 py-1 text-[10px] text-[#285f5b]">{item.citation_id}</span>{item.document_name} · {item.location_label || `Fragmento ${item.chunk_index + 1}`} · {(item.score * 100).toFixed(0)}%</summary>{item.section && <p className="mt-3 text-xs font-bold uppercase text-[#3e7774]">Sección: {item.section}</p>}<blockquote className="mt-2 border-l-2 border-[#6da39f] pl-3 text-sm leading-6 text-[#10213e]/65">{item.text}</blockquote>{item.document_url && <a href={item.document_url} className="mt-3 inline-block text-xs font-bold text-[#285f5b]">Abrir ubicación en el expediente →</a>}</details>)}</div></Panel>}{result.limitaciones?.length > 0 && <Panel title="Límites y revisión humana"><ul className="list-disc space-y-1 pl-5 text-sm text-[#10213e]/60">{result.limitaciones.map((item) => <li key={item}>{item}</li>)}</ul></Panel>}</section>; }
function EvidenceStatus({ evidence }: { evidence: Evidence }) { const supported = evidence.status === "respaldado"; return <section className={`rounded-2xl border px-5 py-4 ${supported ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong>{supported ? "Evidencia documental suficiente" : "Revisión humana necesaria"}</strong><span className="text-xs font-bold uppercase">{evidence.usable_citations}/{evidence.citations_count} citas utilizables</span></div><p className="mt-1 text-sm opacity-75">{supported ? "La respuesta tiene múltiples pasajes recuperados; verificá igualmente el texto original." : "La respuesta no alcanzó el umbral de respaldo documental. No la uses como conclusión jurídica sin verificar las fuentes."}</p></section>; }
function ToolParameters({ tool, values, onChange }: { tool?: Tool; values: Record<string, string | boolean>; onChange: (value: Record<string, string | boolean>) => void }) { if (!tool?.fields?.length) return <div/>; return <div><span className="text-xs font-bold uppercase tracking-[.14em] text-[#10213e]/45">Configuración profesional</span><div className="mt-2 flex flex-wrap gap-2">{tool.fields.map((field) => <input key={field} value={String(values[field] || "")} onChange={(e) => onChange({ ...values, [field]: e.target.value })} placeholder={field.replaceAll("_", " ")} className="h-11 min-w-44 flex-1 rounded-xl border border-[#b8c8c5] bg-white px-3 text-sm" />)}</div></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-[#cbd8d5] bg-white p-5 shadow-sm"><h3 className="mb-4 text-lg font-semibold">{title}</h3>{children}</section>; }
