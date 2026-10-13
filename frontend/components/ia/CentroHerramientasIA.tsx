"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadPlainTextReport, printPlainTextReport } from "../../lib/legalReport";

type Tool = { id: string; label: string; description: string; inputs: number };
type CaseOption = { id: number; name?: string; caratula?: string; identificador?: string };
type CaseDocument = { id: number; name: string; extracted_text?: string; status?: string };
type Defendant = { id: number; nombre: string; documento_identidad?: string; rol?: string; notas?: string };
type Scope = "documents" | "case" | "defendant";
type Result = { titulo: string; conclusion?: string; resumen?: string; puntos_clave?: string[]; desarrollo?: { titulo: string; contenido: string }[]; acciones_sugeridas?: string[]; limitaciones?: string[] };
type Citation = { citation_id: string; document_id: string; document_name: string; location_label?: string; document_url?: string | null; text: string; score: number };
type Evidence = { status?: string; citations_count?: number };
type Metadata = { duration_ms?: number; engine?: string; source_document_count?: number; scope?: Scope; defendant_name?: string | null };

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const fallbackTools: Tool[] = [
  { id: "resumen_expediente", label: "Resumen del expediente", description: "Sintetiza hechos, partes, estado y próximos pasos.", inputs: 1 },
  { id: "comparar_documentos", label: "Comparar documentos", description: "Encuentra coincidencias, diferencias y contradicciones.", inputs: 2 },
  { id: "comparar_jurisprudencia", label: "Comparar fallos", description: "Contrasta criterios y utilidad de dos decisiones.", inputs: 2 },
  { id: "cronologia", label: "Fechas y vencimientos", description: "Ordena actuaciones, audiencias y plazos.", inputs: 1 },
  { id: "consulta_rag", label: "Preguntar al expediente", description: "Responde sobre documentos, el expediente o un imputado.", inputs: 1 },
  { id: "teoria_del_caso", label: "Teoría del caso", description: "Ordena hipótesis, prueba y debilidades.", inputs: 1 },
];

const toolUi: Record<string, { code: string; eyebrow: string; instruction: string; action: string; header: string; active: string; button: string; focus: string }> = {
  resumen_expediente: { code: "RE", eyebrow: "Síntesis ejecutiva", instruction: "Elegí un expediente completo o cargá una fuente para obtener una lectura rápida y ordenada.", action: "Preparar resumen", header: "bg-emerald-950 text-white", active: "border-emerald-700 bg-emerald-50", button: "bg-emerald-800 hover:bg-emerald-900", focus: "focus:border-emerald-700" },
  comparar_documentos: { code: "CD", eyebrow: "Control de consistencia", instruction: "Colocá una fuente en cada columna. El resultado atribuye cada diferencia al documento correspondiente.", action: "Comparar documentos", header: "bg-blue-950 text-white", active: "border-blue-700 bg-blue-50", button: "bg-blue-800 hover:bg-blue-900", focus: "focus:border-blue-700" },
  comparar_jurisprudencia: { code: "CJ", eyebrow: "Análisis jurisprudencial", instruction: "Cargá dos fallos para contrastar hechos, reglas, semejanzas y límites de aplicación.", action: "Comparar fallos", header: "bg-violet-950 text-white", active: "border-violet-700 bg-violet-50", button: "bg-violet-800 hover:bg-violet-900", focus: "focus:border-violet-700" },
  cronologia: { code: "FV", eyebrow: "Control temporal", instruction: "Usá el expediente o una fuente para localizar fechas expresas, actuaciones y plazos que requieren control.", action: "Ordenar fechas", header: "bg-amber-950 text-white", active: "border-amber-700 bg-amber-50", button: "bg-amber-800 hover:bg-amber-900", focus: "focus:border-amber-700" },
  consulta_rag: { code: "PE", eyebrow: "Consulta con fuentes", instruction: "Definí exactamente dónde buscar: documentos, expediente completo o la información de un imputado.", action: "Responder pregunta", header: "bg-slate-950 text-white", active: "border-slate-700 bg-slate-100", button: "bg-slate-900 hover:bg-black", focus: "focus:border-slate-700" },
  teoria_del_caso: { code: "TC", eyebrow: "Estrategia provisional", instruction: "Organiza hechos acreditados, inferencias, evidencia favorable y puntos débiles sin completar vacíos.", action: "Preparar teoría", header: "bg-indigo-950 text-white", active: "border-indigo-700 bg-indigo-50", button: "bg-indigo-800 hover:bg-indigo-900", focus: "focus:border-indigo-700" },
};

const scopeOptions: { id: Scope; label: string; description: string }[] = [
  { id: "documents", label: "Documentos", description: "Busca únicamente en el texto de los archivos procesados." },
  { id: "case", label: "Expediente completo", description: "Incluye documentos y datos generales registrados en la causa." },
  { id: "defendant", label: "Imputado individual", description: "Prioriza una persona, su ficha y las menciones documentales." },
];

const questionExamples: Record<Scope, string[]> = {
  documents: ["¿Qué contradicciones aparecen entre las declaraciones?", "¿Qué prueba respalda la fecha del hecho?"],
  case: ["¿Cuál es el estado general y qué puntos siguen pendientes?", "¿Qué fechas y riesgos requieren atención inmediata?"],
  defendant: ["¿Qué evidencia se vincula con este imputado?", "¿Qué contradicciones afectan específicamente su situación?"],
};

export default function CentroHerramientasIA({ compact = false }: { compact?: boolean }) {
  const [tools, setTools] = useState<Tool[]>(fallbackTools);
  const [toolId, setToolId] = useState("resumen_expediente");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [caseId, setCaseId] = useState("");
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [defendants, setDefendants] = useState<Defendant[]>([]);
  const [scope, setScope] = useState<Scope>("documents");
  const [defendantId, setDefendantId] = useState("");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result>();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [evidence, setEvidence] = useState<Evidence>();
  const [metadata, setMetadata] = useState<Metadata>();
  const [savedId, setSavedId] = useState<number>();
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const requestTimedOut = useRef(false);

  const tool = useMemo(() => tools.find((item) => item.id === toolId) || tools[0], [toolId, tools]);
  const ui = toolUi[toolId] || toolUi.consulta_rag;
  const readyDocuments = useMemo(() => caseDocuments.filter((item) => Boolean(item.extracted_text?.trim())), [caseDocuments]);
  const usesCaseContext = Boolean(caseId) && tool?.inputs === 1;
  const effectiveScope: Scope = toolId === "consulta_rag" ? scope : "case";
  const selectedDefendant = defendants.find((item) => String(item.id) === defendantId);
  const canExecute = Boolean(tool) && !busy && (
    usesCaseContext
      ? !loadingContext && !contextError
        && (effectiveScope !== "documents" || readyDocuments.length > 0)
        && (effectiveScope !== "defendant" || Boolean(defendantId))
        && (toolId !== "consulta_rag" || Boolean(query.trim()))
      : Boolean(primary.trim())
        && (tool.inputs !== 2 || Boolean(secondary.trim()))
        && (toolId !== "consulta_rag" || Boolean(query.trim()))
  );

  useEffect(() => {
    const requestedCase = new URLSearchParams(window.location.search).get("case_id");
    if (requestedCase) setCaseId(requestedCase);
    void fetch(`${apiUrl}/api/ia/tools`).then((response) => response.json()).then((body) => {
      if (body.tools?.length) setTools(body.tools);
    }).catch(() => undefined);
    void loadCases();
  }, []);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!caseId) {
      setCaseDocuments([]); setDefendants([]); setContextError(""); setLoadingContext(false); setDefendantId("");
      return;
    }
    const controller = new AbortController();
    setLoadingContext(true); setContextError(""); setCaseDocuments([]); setDefendants([]); setDefendantId("");
    void Promise.all([
      fetch(`${apiUrl}/api/ia/cases/${caseId}/documents?include_text=true`, { credentials: "include", signal: controller.signal }),
      fetch(`${apiUrl}/api/casos/${caseId}/imputados`, { credentials: "include", signal: controller.signal }),
    ]).then(async ([documentsResponse, defendantsResponse]) => {
      const documentsBody = await documentsResponse.json();
      const defendantsBody = await defendantsResponse.json();
      if (!documentsResponse.ok) throw new Error(documentsBody.error || "No se pudieron cargar los documentos.");
      if (!defendantsResponse.ok) throw new Error(defendantsBody.error || "No se pudieron cargar los imputados.");
      setCaseDocuments(documentsBody.documents || []);
      setDefendants(defendantsBody.imputados || []);
    }).catch((cause) => {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setContextError(cause instanceof Error ? cause.message : "No se pudo cargar el expediente.");
    }).finally(() => { if (!controller.signal.aborted) setLoadingContext(false); });
    return () => controller.abort();
  }, [caseId]);

  async function loadCases() {
    setLoadingCases(true);
    try {
      const response = await fetch(`${apiUrl}/api/casos`, { credentials: "include", signal: AbortSignal.timeout(6000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar los expedientes.");
      setCases(body.cases || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los expedientes.");
    } finally { setLoadingCases(false); }
  }

  function selectTool(nextTool: Tool) {
    requestController.current?.abort();
    setToolId(nextTool.id); setPrimary(""); setSecondary(""); setQuery(""); setScope("documents");
    setResult(undefined); setCitations([]); setEvidence(undefined); setMetadata(undefined); setSavedId(undefined); setError(""); setNotice("");
  }

  async function execute() {
    if (!canExecute) return;
    setBusy(true); setError(""); setNotice(""); setResult(undefined); setCitations([]); setEvidence(undefined); setMetadata(undefined); setSavedId(undefined);
    const controller = new AbortController();
    requestController.current = controller;
    requestTimedOut.current = false;
    const timeout = window.setTimeout(() => { requestTimedOut.current = true; controller.abort(); }, 9800);
    try {
      const response = await fetch(`${apiUrl}/api/ia/tools/${toolId}/run`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          primary_text: primary,
          secondary_text: secondary,
          query,
          case_id: caseId ? Number(caseId) : null,
          scope: effectiveScope,
          defendant_id: effectiveScope === "defendant" && defendantId ? Number(defendantId) : null,
          use_case_context: usesCaseContext,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error([body.error, body.details].filter(Boolean).join(" "));
      setResult(body.result); setCitations(body.citations || []); setEvidence(body.evidence); setMetadata(body._metadata); setSavedId(body.saved_query?.id);
    } catch (cause) {
      const aborted = cause instanceof DOMException && cause.name === "AbortError";
      setError(aborted
        ? requestTimedOut.current ? "La consulta alcanzó el límite de 10 segundos. Probá una pregunta más concreta." : "Consulta cancelada."
        : cause instanceof Error ? cause.message : "No se pudo completar el análisis.");
    } finally {
      window.clearTimeout(timeout); requestController.current = null; setBusy(false);
    }
  }

  const report = result ? formatReport(result, citations) : "";

  return <div className={compact ? "space-y-4" : "space-y-6"}>
    <section className={`rounded-2xl border border-[#d6d8d5] bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#64706e]">Centro de herramientas</p><h2 className="mt-1 text-xl font-semibold text-[#172235]">Elegí una tarea jurídica</h2></div>
        {!compact && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Respuesta objetivo: menos de 10 segundos</span>}
      </div>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {tools.map((item) => {
          const itemUi = toolUi[item.id] || toolUi.consulta_rag;
          const active = item.id === toolId;
          return <button type="button" key={item.id} onClick={() => selectTool(item)} aria-pressed={active} className={`group flex gap-3 rounded-xl border-2 text-left transition ${compact ? "min-h-24 p-3" : "min-h-28 p-4"} ${active ? itemUi.active : "border-[#e2e5e2] bg-[#fafbf9] hover:border-[#aeb6b2] hover:bg-white"}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black tracking-wider ${active ? itemUi.header : "bg-[#e8ece9] text-[#46524f]"}`}>{itemUi.code}</span>
            <span><strong className="block text-sm text-[#202c3f]">{item.label}</strong>{!compact && <span className="mt-1 block text-xs leading-5 text-[#6a7481]">{item.description}</span>}</span>
          </button>;
        })}
      </div>
    </section>

    <main className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#d6d8d5] bg-white shadow-sm">
        <header className={`${ui.header} ${compact ? "px-4 py-4" : "px-6 py-6"}`}>
          <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-black tracking-wider">{ui.code}</span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-white/65">{ui.eyebrow}</p><h1 className="mt-1 text-2xl font-semibold">{tool?.label}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">{ui.instruction}</p></div></div>
        </header>

        <div className={`border-b border-[#e1e3e0] bg-[#fafbf9] ${compact ? "px-4 py-4" : "px-6 py-5"}`}>
          <label className="block max-w-xl"><span className="text-xs font-bold uppercase tracking-[.08em] text-[#59636f]">Expediente de trabajo</span><select value={caseId} onChange={(event) => { setCaseId(event.target.value); setResult(undefined); setError(""); }} className="mt-2 h-11 w-full rounded-lg border border-[#bfc4c1] bg-white px-3 text-sm outline-none"><option value="">Sin expediente · usar fuentes manuales</option>{cases.map((item) => <option value={item.id} key={item.id}>{item.identificador ? `${item.identificador} · ` : ""}{item.name || item.caratula || `Expediente ${item.id}`}</option>)}</select></label>
          {loadingCases && <p className="mt-2 text-xs text-[#687180]">Cargando expedientes…</p>}
        </div>

        {toolId === "consulta_rag" && caseId && <ScopeSelector scope={scope} onChange={(next) => { setScope(next); setResult(undefined); setError(""); }} defendants={defendants} defendantId={defendantId} setDefendantId={setDefendantId} />}

        {usesCaseContext
          ? effectiveScope === "documents"
            ? <CaseCorpus documents={caseDocuments} loading={loadingContext} error={contextError} />
            : <ContextSummary scope={effectiveScope} documents={readyDocuments} defendants={defendants} selectedDefendant={selectedDefendant} loading={loadingContext} error={contextError} />
          : <div className={`grid gap-5 ${compact ? "p-4" : "p-6"} ${tool?.inputs === 2 && !compact ? "lg:grid-cols-2" : ""}`}><Source label={tool?.inputs === 2 ? "Fuente A" : "Material jurídico"} value={primary} onChange={setPrimary} documents={readyDocuments} focusClass={ui.focus} compact={compact} />{tool?.inputs === 2 && <Source label="Fuente B" value={secondary} onChange={setSecondary} documents={readyDocuments} focusClass={ui.focus} compact={compact} />}</div>}

        <div className={`border-t border-[#e1e3e0] ${compact ? "px-4 py-4" : "px-6 py-5"}`}>
          <label className="text-xs font-bold uppercase tracking-[.08em] text-[#59636f]">{toolId === "consulta_rag" ? "Pregunta concreta" : "Objetivo o enfoque (opcional)"}</label>
          {toolId === "consulta_rag" && caseId && <div className="mt-3 flex flex-wrap gap-2">{questionExamples[scope].map((example) => <button type="button" key={example} onClick={() => setQuery(example)} className="rounded-full border border-[#d3d8d5] bg-[#f7f8f6] px-3 py-1.5 text-left text-xs text-[#4e5a68] hover:border-[#7b8783]">{example}</button>)}</div>}
          <div className="mt-3 flex flex-col gap-3 lg:flex-row"><textarea rows={2} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={toolId === "consulta_rag" ? "Escribí una sola pregunta precisa sobre el alcance elegido…" : "Ej.: priorizar los argumentos favorables a la defensa"} className={`min-h-12 flex-1 resize-y rounded-lg border border-[#bfc4c1] bg-white px-3 py-3 text-sm outline-none ${ui.focus}`} /><button type="button" disabled={!canExecute} onClick={() => void execute()} className={`min-h-12 rounded-lg px-6 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45 ${ui.button}`}>{busy ? `Analizando · ${elapsed.toFixed(1)} s` : ui.action}</button>{busy && <button type="button" onClick={() => { requestTimedOut.current = false; requestController.current?.abort(); }} className="min-h-12 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">Cancelar</button>}</div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[#6d7682]"><span>{toolId === "consulta_rag" ? "La respuesta incluirá los pasajes utilizados como fuente." : "La herramienta limita sus conclusiones al material seleccionado."}</span><span className={busy && elapsed >= 7 ? "font-semibold text-amber-700" : ""}>{busy ? `${Math.max(0, 10 - elapsed).toFixed(1)} s restantes` : "Límite de respuesta: 10 s"}</span></div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        </div>
      </section>

      {savedId && caseId && <a href={`/casos/${caseId}/consultas?consulta=${savedId}`} className="block rounded-xl border border-[#b9ccc8] bg-[#f1f6f4] px-5 py-4 text-sm font-semibold text-[#285f5b]">Consulta guardada en el historial del expediente · Abrir registro →</a>}
      {!result ? <EmptyState busy={busy} tool={tool} /> : <>
        <ReportActions notice={notice} onCopy={async () => { try { await navigator.clipboard.writeText(report); setNotice("Informe copiado."); } catch { setNotice("No se pudo copiar el informe."); } }} onDownload={() => { downloadPlainTextReport(result.titulo || tool?.label || "informe", report); setNotice("Informe descargado."); }} onPrint={() => { try { printPlainTextReport(result.titulo, report); setNotice("Vista de impresión abierta."); } catch { setNotice("No se pudo abrir la impresión."); } }} />
        <Results result={result} citations={citations} evidence={evidence} metadata={metadata} />
      </>}
    </main>
  </div>;
}

function ScopeSelector({ scope, onChange, defendants, defendantId, setDefendantId }: { scope: Scope; onChange: (scope: Scope) => void; defendants: Defendant[]; defendantId: string; setDefendantId: (value: string) => void }) {
  return <section className="border-b border-[#e1e3e0] px-6 py-5"><p className="text-xs font-bold uppercase tracking-[.08em] text-[#59636f]">¿Dónde querés buscar?</p><div className="mt-3 grid gap-3 md:grid-cols-3">{scopeOptions.map((option) => <button type="button" key={option.id} onClick={() => onChange(option.id)} className={`rounded-xl border-2 p-4 text-left transition ${scope === option.id ? "border-slate-700 bg-slate-100" : "border-[#e0e3e0] hover:border-[#aeb5b2]"}`}><span className="text-sm font-semibold text-[#263244]">{option.label}</span><span className="mt-1 block text-xs leading-5 text-[#687180]">{option.description}</span></button>)}</div>{scope === "defendant" && <label className="mt-4 block max-w-xl"><span className="text-xs font-semibold text-[#59636f]">Imputado a consultar</span><select value={defendantId} onChange={(event) => setDefendantId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#bfc4c1] bg-white px-3 text-sm"><option value="">Seleccionar imputado…</option>{defendants.map((item) => <option value={item.id} key={item.id}>{item.nombre}{item.rol ? ` · ${item.rol}` : ""}</option>)}</select>{!defendants.length && <span className="mt-2 block text-xs text-amber-700">Este expediente no tiene imputados registrados.</span>}</label>}</section>;
}

function ContextSummary({ scope, documents, defendants, selectedDefendant, loading, error }: { scope: Scope; documents: CaseDocument[]; defendants: Defendant[]; selectedDefendant?: Defendant; loading: boolean; error: string }) {
  return <section className="p-6"><div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-[.08em] text-slate-600">{scope === "defendant" ? "Consulta individual" : "Vista integral del expediente"}</p><h3 className="mt-1 text-lg font-semibold text-[#263244]">{loading ? "Cargando contexto…" : scope === "defendant" ? selectedDefendant?.nombre || "Seleccioná un imputado" : `${documents.length} documentos · ${defendants.length} imputados`}</h3><p className="mt-2 text-sm leading-6 text-[#687180]">{scope === "defendant" ? "La búsqueda combina la ficha individual con los pasajes documentales que mejor responden la pregunta." : "La búsqueda considera el corpus documental y los datos generales registrados en la causa."}</p>{selectedDefendant && <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-medium">Rol: {selectedDefendant.rol || "sin especificar"}</span>{selectedDefendant.documento_identidad && <span className="rounded-full bg-white px-3 py-1.5 font-medium">Documento: {selectedDefendant.documento_identidad}</span>}</div>}{error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}</div></section>;
}

function CaseCorpus({ documents, loading, error }: { documents: CaseDocument[]; loading: boolean; error: string }) {
  const ready = documents.filter((item) => Boolean(item.extracted_text?.trim()));
  return <section className="p-6"><div className="rounded-xl border border-[#c8d6d3] bg-[#f4f8f7] p-5"><p className="text-xs font-bold uppercase tracking-[.08em] text-[#3f6f6b]">Corpus documental</p><h3 className="mt-1 text-lg font-semibold text-[#283446]">{loading ? "Cargando documentos…" : `${ready.length} de ${documents.length} documentos listos`}</h3><p className="mt-2 text-sm leading-6 text-[#687180]">Se recuperan únicamente los pasajes más relacionados con la pregunta y se muestran como fuentes.</p>{error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}{!loading && !error && ready.length === 0 && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No hay documentos con texto extraído. Cargá uno desde la sección Documentos.</p>}{ready.length > 0 && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{ready.map((item) => <li key={item.id} className="truncate rounded-lg border border-[#d8e1df] bg-white px-3 py-2 text-xs font-medium text-[#44504f]">{item.name}</li>)}</ul>}</div></section>;
}

function Source({ label, value, onChange, documents, focusClass, compact = false }: { label: string; value: string; onChange: (value: string) => void; documents: CaseDocument[]; focusClass: string; compact?: boolean }) {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  async function extract(file?: File) {
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch(`${apiUrl}/api/ia/extract-file`, { method: "POST", credentials: "include", body: data, signal: AbortSignal.timeout(8000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo leer el archivo.");
      onChange(body.document.text); setFileName(body.document.name);
    } catch (cause) { setUploadError(cause instanceof Error ? cause.message : "No se pudo leer el archivo."); }
    finally { setUploading(false); }
  }
  return <div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-[.08em] text-[#59636f]">{label}</span>{documents.length > 0 && <select aria-label={`Documento para ${label}`} defaultValue="" onChange={(event) => { const item = documents.find((document) => String(document.id) === event.target.value); if (item?.extracted_text) { onChange(item.extracted_text); setFileName(item.name); } }} className="rounded border border-[#bfc4c1] bg-white px-2 py-1 text-xs"><option value="">Elegir documento del expediente…</option>{documents.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>}</div><label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-[#abb4b0] bg-[#fafbf9] px-4 py-3"><span><strong className="block text-sm text-[#34413f]">{uploading ? "Leyendo…" : "Adjuntar archivo"}</strong><span className="text-xs text-[#747d7b]">PDF, DOCX, TXT, MD o CSV</span></span><span className="rounded-md border bg-white px-3 py-2 text-xs font-semibold">Examinar</span><input type="file" accept=".pdf,.docx,.txt,.md,.csv" className="hidden" onChange={(event) => void extract(event.target.files?.[0])} /></label>{fileName && <p className="mt-2 text-xs font-medium text-[#285f5b]">Fuente cargada: {fileName}</p>}{uploadError && <p className="mt-2 text-xs font-semibold text-red-700">{uploadError}</p>}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Pegá el contenido o adjuntá un archivo." className={`mt-2 w-full resize-y rounded-lg border border-[#bfc4c1] p-4 text-sm leading-6 outline-none ${compact ? "min-h-36" : "min-h-52"} ${focusClass}`} /><span className="mt-1 block text-right text-xs text-[#7b838e]">{value.length.toLocaleString("es-AR")} caracteres</span></div>;
}

function EmptyState({ busy, tool }: { busy: boolean; tool?: Tool }) {
  return <section className="rounded-xl border border-[#d6d8d5] bg-white px-6 py-7"><h3 className="text-base font-semibold text-[#283446]">{busy ? "Buscando evidencia…" : `${tool?.label || "Herramienta"} lista`}</h3><p className="mt-2 text-sm leading-6 text-[#687180]">{busy ? "Se devolverá una respuesta extractiva si el modelo local no termina dentro del límite." : "Completá los campos de esta herramienta. Al cambiar de tarea, también cambia el espacio de trabajo."}</p></section>;
}

function ReportActions({ notice, onCopy, onDownload, onPrint }: { notice: string; onCopy: () => void; onDownload: () => void; onPrint: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6d8d5] bg-[#fafaf8] px-4 py-3"><p className="text-xs text-[#687180]">{notice || "Documento de trabajo sujeto a revisión profesional."}</p><div className="flex gap-2"><button type="button" onClick={onCopy} className="rounded border bg-white px-3 py-2 text-xs font-semibold">Copiar</button><button type="button" onClick={onDownload} className="rounded border bg-white px-3 py-2 text-xs font-semibold">Descargar</button><button type="button" onClick={onPrint} className="rounded bg-[#34413f] px-3 py-2 text-xs font-semibold text-white">Imprimir / PDF</button></div></div>;
}

function Results({ result, citations, evidence, metadata }: { result: Result; citations: Citation[]; evidence?: Evidence; metadata?: Metadata }) {
  return <section className="space-y-3"><article className="rounded-xl border border-[#d6d8d5] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[#64706e]">Resultado</p><h2 className="mt-1 text-xl font-semibold text-[#182338]">{result.titulo || "Análisis"}</h2></div>{metadata?.duration_ms != null && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{(metadata.duration_ms / 1000).toFixed(1)} s</span>}</div><div className="mt-5 rounded-r-lg border-l-4 border-[#3f6f6b] bg-[#f4f7f6] px-5 py-4"><h3 className="text-xs font-bold uppercase tracking-[.1em] text-[#3f6f6b]">Conclusión</h3><p className="mt-2 whitespace-pre-line text-base leading-7 text-[#34413f]">{result.conclusion || result.resumen || "Sin respuesta."}</p></div>{result.desarrollo?.length ? <div className="mt-6 grid gap-3 lg:grid-cols-2">{result.desarrollo.map((section, index) => <section key={`${section.titulo}-${index}`} className="rounded-lg border border-[#e1e3e0] bg-[#fafaf8] p-4"><h3 className="text-sm font-semibold text-[#34413f]">{section.titulo}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#596473]">{section.contenido}</p></section>)}</div> : null}{result.puntos_clave?.length ? <div className="mt-6 border-t pt-5"><h3 className="text-sm font-semibold">Puntos clave</h3><ol className="mt-3 space-y-2">{result.puntos_clave.map((point, index) => <li key={index} className="flex gap-3 text-sm leading-6 text-[#596473]"><span className="font-bold text-[#3f6f6b]">{index + 1}.</span><span>{point}</span></li>)}</ol></div> : null}<div className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-2">{result.acciones_sugeridas?.length ? <ResultList title="Controles sugeridos" items={result.acciones_sugeridas} /> : null}{result.limitaciones?.length ? <ResultList title="Alcance y límites" items={result.limitaciones} muted /> : null}</div></article>{citations.length > 0 && <details className="rounded-xl border border-[#c8d6d3] bg-white px-5 py-4"><summary className="cursor-pointer text-sm font-semibold text-[#285f5b]">Fuentes utilizadas ({citations.length})</summary><p className="mt-2 text-xs text-[#687180]">Respaldo {evidence?.status || "documental"} · cada respuesta debe verificarse contra el documento completo.</p><div className="mt-4 divide-y rounded-lg border">{citations.map((item, index) => <details key={item.citation_id} className="px-4 py-3"><summary className="cursor-pointer text-sm font-semibold">Pasaje {index + 1} · {item.document_name}<span className="ml-2 text-xs font-normal text-[#74807e]">pertinencia {item.score >= .65 ? "alta" : item.score >= .35 ? "media" : "complementaria"}</span></summary><blockquote className="mt-3 border-l-2 border-[#819d99] pl-3 text-sm leading-6 text-[#606a78]">{item.text}</blockquote>{item.document_url && <a href={item.document_url} className="mt-3 inline-block text-xs font-semibold text-[#285f5b]">Abrir documento →</a>}</details>)}</div></details>}</section>;
}

function ResultList({ title, items, muted = false }: { title: string; items: string[]; muted?: boolean }) {
  return <section className={`rounded-lg border p-4 ${muted ? "border-[#e2ddd2] bg-[#fbfaf6]" : "border-[#cfdcd9] bg-[#f6f9f8]"}`}><h3 className="text-sm font-semibold text-[#34413f]">{title}</h3><ul className="mt-3 space-y-2">{items.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-6 text-[#596473]"><span>•</span><span>{item}</span></li>)}</ul></section>;
}

function formatReport(result: Result, citations: Citation[]) {
  const lines = [result.titulo || "Resultado", "", result.conclusion || result.resumen || "Sin respuesta.", ""];
  result.desarrollo?.forEach((section) => lines.push(section.titulo.toUpperCase(), section.contenido, ""));
  result.puntos_clave?.forEach((point, index) => lines.push(`${index + 1}. ${point}`));
  if (result.acciones_sugeridas?.length) lines.push("", "CONTROLES SUGERIDOS", ...result.acciones_sugeridas.map((item) => `- ${item}`));
  if (result.limitaciones?.length) lines.push("", "ALCANCE Y LÍMITES", ...result.limitaciones.map((item) => `- ${item}`));
  if (citations.length) { lines.push("", "FUENTES"); citations.forEach((item, index) => lines.push(`${index + 1}. ${item.document_name}`, item.text, "")); }
  lines.push("LegalMind · Documento de trabajo sujeto a revisión profesional.");
  return lines.join("\n").trim();
}
