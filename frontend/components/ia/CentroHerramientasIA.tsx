"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadPlainTextReport,
  printPlainTextReport,
} from "../../lib/legalReport";

type Tool = { id: string; label: string; description?: string; inputs: number };
type CaseOption = {
  id: number;
  name?: string;
  caratula?: string;
  identificador?: string;
};
type CaseDocument = {
  id: number;
  name: string;
  extracted_text?: string;
  status?: string;
};
type Defendant = {
  id: number;
  nombre: string;
  documento_identidad?: string;
  rol?: string;
  notas?: string;
};
type Scope = "documents" | "case" | "defendant";
type Result = {
  titulo: string;
  conclusion?: string;
  resumen?: string;
  puntos_clave?: string[];
  desarrollo?: { titulo: string; contenido: string }[];
  acciones_sugeridas?: string[];
  limitaciones?: string[];
};
type Citation = {
  citation_id: string;
  document_id: string;
  document_name: string;
  location_label?: string;
  document_url?: string | null;
  text: string;
  score: number;
};

const apiUrl =
  process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const fallbackTools: Tool[] = [
  {
    id: "resumen_expediente",
    label: "Resumen del expediente",
    description: "Sintetiza hechos, partes, estado y próximos pasos.",
    inputs: 1,
  },
  {
    id: "comparar_documentos",
    label: "Comparar documentos",
    description: "Encuentra coincidencias, diferencias y contradicciones.",
    inputs: 2,
  },
  {
    id: "comparar_jurisprudencia",
    label: "Comparar fallos",
    description: "Contrasta criterios y utilidad de dos decisiones.",
    inputs: 2,
  },
  {
    id: "cronologia",
    label: "Fechas y vencimientos",
    description: "Ordena actuaciones, audiencias y plazos.",
    inputs: 1,
  },
  {
    id: "consulta_rag",
    label: "Preguntar al expediente",
    description: "Responde sobre documentos, el expediente o un imputado.",
    inputs: 1,
  },
  {
    id: "teoria_del_caso",
    label: "Teoría del caso",
    description: "Ordena hipótesis, prueba y debilidades.",
    inputs: 1,
  },
  {
    id: "preparar_audiencia",
    label: "Preparar audiencia",
    description: "Arma una guía de intervención con respaldo documental.",
    inputs: 1,
  },
];

const toolUi: Record<
  string,
  {
    code: string;
    instruction: string;
    action: string;
    header: string;
    active: string;
    button: string;
    focus: string;
  }
> = {
  resumen_expediente: {
    code: "RE",
    instruction: "Resumen de hechos, partes y estado.",
    action: "Preparar resumen",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
  comparar_documentos: {
    code: "CD",
    instruction: "Coincidencias y diferencias entre dos textos.",
    action: "Comparar",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
  comparar_jurisprudencia: {
    code: "CJ",
    instruction: "Comparación de dos fallos.",
    action: "Comparar",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
  cronologia: {
    code: "FV",
    instruction: "Fechas, actuaciones y vencimientos.",
    action: "Ordenar fechas",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
  consulta_rag: {
    code: "PE",
    instruction: "Consulta sobre el contenido del expediente.",
    action: "Consultar",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
  teoria_del_caso: {
    code: "TC",
    instruction: "Hechos, prueba y puntos pendientes.",
    action: "Preparar teoría",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
  preparar_audiencia: {
    code: "PA",
    instruction: "Objetivos, argumentos, preguntas y controles.",
    action: "Preparar audiencia",
    header: "bg-[#0F2044] text-white",
    active: "border-[#546FC0] bg-[#EEF3F8]",
    button: "bg-[#0F2044] hover:bg-[#1C3768]",
    focus: "focus:border-[#546FC0]",
  },
};

const scopeOptions: { id: Scope; label: string }[] = [
  { id: "documents", label: "Documentos" },
  { id: "case", label: "Expediente completo" },
  { id: "defendant", label: "Imputado" },
];

const questionExamples: Record<Scope, string[]> = {
  documents: [
    "¿Qué contradicciones aparecen entre las declaraciones?",
    "¿Qué prueba respalda la fecha del hecho?",
  ],
  case: [
    "¿Cuál es el estado general y qué puntos siguen pendientes?",
    "¿Qué fechas y riesgos requieren atención inmediata?",
  ],
  defendant: [
    "¿Qué evidencia se vincula con este imputado?",
    "¿Qué contradicciones afectan específicamente su situación?",
  ],
};

export default function CentroHerramientasIA({
  compact = false,
}: {
  compact?: boolean;
}) {
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
  const [savedId, setSavedId] = useState<number>();
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const requestTimedOut = useRef(false);

  const tool = useMemo(
    () => tools.find((item) => item.id === toolId) || tools[0],
    [toolId, tools],
  );
  const ui = toolUi[toolId] || toolUi.consulta_rag;
  const readyDocuments = useMemo(
    () => caseDocuments.filter((item) => Boolean(item.extracted_text?.trim())),
    [caseDocuments],
  );
  const usesCaseContext = Boolean(caseId) && tool?.inputs === 1;
  const effectiveScope: Scope = toolId === "consulta_rag" ? scope : "case";
  const selectedDefendant = defendants.find(
    (item) => String(item.id) === defendantId,
  );
  const canExecute =
    Boolean(tool) &&
    !busy &&
    (usesCaseContext
      ? !loadingContext &&
        !contextError &&
        (effectiveScope !== "documents" || readyDocuments.length > 0) &&
        (effectiveScope !== "defendant" || Boolean(defendantId)) &&
        (toolId !== "consulta_rag" || Boolean(query.trim()))
      : Boolean(primary.trim()) &&
        (tool.inputs !== 2 || Boolean(secondary.trim())) &&
        (toolId !== "consulta_rag" || Boolean(query.trim())));

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedCase = searchParams.get("case_id");
    const requestedTool = searchParams.get("tool");
    const requestedQuery = searchParams.get("query");
    if (requestedCase) setCaseId(requestedCase);
    if (requestedTool && toolUi[requestedTool]) setToolId(requestedTool);
    if (requestedQuery) setQuery(requestedQuery);
    void fetch(`${apiUrl}/api/ia/tools`)
      .then((response) => response.json())
      .then((body) => {
        if (body.tools?.length) setTools(body.tools);
      })
      .catch(() => undefined);
    void loadCases();
  }, []);

  useEffect(() => {
    if (!caseId) {
      setCaseDocuments([]);
      setDefendants([]);
      setContextError("");
      setLoadingContext(false);
      setDefendantId("");
      return;
    }
    const controller = new AbortController();
    setLoadingContext(true);
    setContextError("");
    setCaseDocuments([]);
    setDefendants([]);
    setDefendantId("");
    void Promise.all([
      fetch(`${apiUrl}/api/ia/cases/${caseId}/documents?include_text=true`, {
        credentials: "include",
        signal: controller.signal,
      }),
      fetch(`${apiUrl}/api/casos/${caseId}/imputados`, {
        credentials: "include",
        signal: controller.signal,
      }),
    ])
      .then(async ([documentsResponse, defendantsResponse]) => {
        const documentsBody = await documentsResponse.json();
        const defendantsBody = await defendantsResponse.json();
        if (!documentsResponse.ok)
          throw new Error(
            documentsBody.error || "No se pudieron cargar los documentos.",
          );
        if (!defendantsResponse.ok)
          throw new Error(
            defendantsBody.error || "No se pudieron cargar los imputados.",
          );
        setCaseDocuments(documentsBody.documents || []);
        setDefendants(defendantsBody.imputados || []);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setContextError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el expediente.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingContext(false);
      });
    return () => controller.abort();
  }, [caseId]);

  async function loadCases() {
    setLoadingCases(true);
    try {
      const response = await fetch(`${apiUrl}/api/casos`, {
        credentials: "include",
        signal: AbortSignal.timeout(6000),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "No se pudieron cargar los expedientes.");
      setCases(body.cases || []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los expedientes.",
      );
    } finally {
      setLoadingCases(false);
    }
  }

  function selectTool(nextTool: Tool) {
    requestController.current?.abort();
    setToolId(nextTool.id);
    setPrimary("");
    setSecondary("");
    setQuery("");
    setScope("documents");
    setResult(undefined);
    setCitations([]);
    setSavedId(undefined);
    setError("");
    setNotice("");
  }

  async function execute() {
    if (!canExecute) return;
    setBusy(true);
    setError("");
    setNotice("");
    setResult(undefined);
    setCitations([]);
    setSavedId(undefined);
    const controller = new AbortController();
    requestController.current = controller;
    requestTimedOut.current = false;
    const timeout = window.setTimeout(() => {
      requestTimedOut.current = true;
      controller.abort();
    }, 9800);
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
          defendant_id:
            effectiveScope === "defendant" && defendantId
              ? Number(defendantId)
              : null,
          use_case_context: usesCaseContext,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error([body.error, body.details].filter(Boolean).join(" "));
      setResult(body.result);
      setCitations(body.citations || []);
      setSavedId(body.saved_query?.id);
    } catch (cause) {
      const aborted =
        cause instanceof DOMException && cause.name === "AbortError";
      setError(
        aborted
          ? requestTimedOut.current
            ? "No se pudo completar. Probá con una consulta más breve."
            : "Consulta cancelada."
          : cause instanceof Error
            ? cause.message
            : "No se pudo completar el análisis.",
      );
    } finally {
      window.clearTimeout(timeout);
      requestController.current = null;
      setBusy(false);
    }
  }

  const report = result ? formatReport(result, citations) : "";

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <section
        className={`rounded-[23px] border-2 border-[#88A9C8] bg-white ${compact ? "p-4" : "p-5"}`}
      >
        <h2 className="mb-4 text-[22px] font-semibold">Herramientas</h2>
        <div
          className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}
        >
          {tools.map((item) => {
            const itemUi = toolUi[item.id] || toolUi.consulta_rag;
            const active = item.id === toolId;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => selectTool(item)}
                aria-pressed={active}
                className={`group flex items-center gap-3 rounded-[15px] border-2 text-left transition ${compact ? "min-h-16 p-3" : "min-h-[72px] p-3"} ${active ? itemUi.active : "border-[#88A9C8]/45 bg-[#F4F7F5] hover:border-[#546FC0] hover:bg-white"}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black tracking-wider ${active ? itemUi.header : "bg-[#e8ece9] text-[#46524f]"}`}
                >
                  {itemUi.code}
                </span>
                <span>
                  <strong className="block text-sm text-[#0F2044]">
                    {item.label}
                  </strong>
                  {item.id === "preparar_audiencia" && (
                    <small className="mt-1 inline-block rounded-full bg-[#0F2044] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Nuevo
                    </small>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="space-y-5">
        <section className="overflow-hidden rounded-[23px] border-2 border-[#88A9C8] bg-white">
          <header
            className={`${compact ? "px-4 py-4" : "px-6 py-5"} border-b-2 border-[#88A9C8] bg-[#F4F7F5]`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F2044] text-xs font-black text-white">
                {ui.code}
              </span>
              <div>
                <h1 className="text-[22px] font-semibold">{tool?.label}</h1>
                <p className="mt-1 text-sm text-[#0F2044]/60">
                  {ui.instruction}
                </p>
              </div>
            </div>
          </header>

          <div
            className={`border-b border-[#e1e3e0] bg-[#fafbf9] ${compact ? "px-4 py-4" : "px-6 py-5"}`}
          >
            <label className="block max-w-xl">
              <span className="text-xs font-bold uppercase tracking-[.08em] text-[#59636f]">
                Expediente de trabajo
              </span>
              <select
                value={caseId}
                onChange={(event) => {
                  setCaseId(event.target.value);
                  setResult(undefined);
                  setError("");
                }}
                className="mt-2 h-11 w-full rounded-lg border border-[#bfc4c1] bg-white px-3 text-sm outline-none"
              >
                <option value="">Sin expediente · usar fuentes manuales</option>
                {cases.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.identificador ? `${item.identificador} · ` : ""}
                    {item.name || item.caratula || `Expediente ${item.id}`}
                  </option>
                ))}
              </select>
            </label>
            {loadingCases && (
              <p className="mt-2 text-xs text-[#687180]">
                Cargando expedientes…
              </p>
            )}
          </div>

          {toolId === "consulta_rag" && caseId && (
            <ScopeSelector
              scope={scope}
              onChange={(next) => {
                setScope(next);
                setResult(undefined);
                setError("");
              }}
              defendants={defendants}
              defendantId={defendantId}
              setDefendantId={setDefendantId}
            />
          )}

          {usesCaseContext ? (
            effectiveScope === "documents" ? (
              <CaseCorpus
                documents={caseDocuments}
                loading={loadingContext}
                error={contextError}
              />
            ) : (
              <ContextSummary
                scope={effectiveScope}
                documents={readyDocuments}
                defendants={defendants}
                selectedDefendant={selectedDefendant}
                loading={loadingContext}
                error={contextError}
              />
            )
          ) : (
            <div
              className={`grid gap-5 ${compact ? "p-4" : "p-6"} ${tool?.inputs === 2 && !compact ? "lg:grid-cols-2" : ""}`}
            >
              <Source
                label={tool?.inputs === 2 ? "Fuente A" : "Material jurídico"}
                value={primary}
                onChange={setPrimary}
                documents={readyDocuments}
                focusClass={ui.focus}
                compact={compact}
              />
              {tool?.inputs === 2 && (
                <Source
                  label="Fuente B"
                  value={secondary}
                  onChange={setSecondary}
                  documents={readyDocuments}
                  focusClass={ui.focus}
                  compact={compact}
                />
              )}
            </div>
          )}

          <div
            className={`border-t border-[#e1e3e0] ${compact ? "px-4 py-4" : "px-6 py-5"}`}
          >
            <label className="text-xs font-bold uppercase tracking-[.08em] text-[#59636f]">
              {toolId === "consulta_rag"
                ? "Pregunta concreta"
                : "Objetivo o enfoque (opcional)"}
            </label>
            {toolId === "consulta_rag" && caseId && (
              <div className="mt-3 flex flex-wrap gap-2">
                {questionExamples[scope].map((example) => (
                  <button
                    type="button"
                    key={example}
                    onClick={() => setQuery(example)}
                    className="rounded-full border border-[#d3d8d5] bg-[#f7f8f6] px-3 py-1.5 text-left text-xs text-[#4e5a68] hover:border-[#7b8783]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-3 lg:flex-row">
              <textarea
                rows={2}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  toolId === "consulta_rag"
                    ? "Escribí tu pregunta"
                    : "Enfoque opcional"
                }
                className={`min-h-12 flex-1 resize-y rounded-xl border-2 border-[#88A9C8]/60 bg-white px-3 py-3 text-sm outline-none ${ui.focus}`}
              />
              <button
                type="button"
                disabled={!canExecute}
                onClick={() => void execute()}
                className={`min-h-12 rounded-xl px-6 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45 ${ui.button}`}
              >
                {busy ? "Procesando…" : ui.action}
              </button>
              {busy && (
                <button
                  type="button"
                  onClick={() => {
                    requestTimedOut.current = false;
                    requestController.current?.abort();
                  }}
                  className="min-h-12 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700"
                >
                  Cancelar
                </button>
              )}
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}
          </div>
        </section>

        {savedId && caseId && (
          <a
            href={`/casos/${caseId}/consultas?consulta=${savedId}`}
            className="block rounded-[18px] border-2 border-[#88A9C8] bg-white px-5 py-4 text-sm font-semibold text-[#0F2044]"
          >
            Ver consulta guardada →
          </a>
        )}
        {!result ? (
          <EmptyState busy={busy} tool={tool} />
        ) : (
          <>
            <ReportActions
              notice={notice}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(report);
                  setNotice("Informe copiado.");
                } catch {
                  setNotice("No se pudo copiar el informe.");
                }
              }}
              onDownload={() => {
                downloadPlainTextReport(
                  result.titulo || tool?.label || "informe",
                  report,
                );
                setNotice("Informe descargado.");
              }}
              onPrint={() => {
                try {
                  printPlainTextReport(result.titulo, report);
                  setNotice("Vista de impresión abierta.");
                } catch {
                  setNotice("No se pudo abrir la impresión.");
                }
              }}
            />
            <Results result={result} citations={citations} />
          </>
        )}
      </main>
    </div>
  );
}

function ScopeSelector({
  scope,
  onChange,
  defendants,
  defendantId,
  setDefendantId,
}: {
  scope: Scope;
  onChange: (scope: Scope) => void;
  defendants: Defendant[];
  defendantId: string;
  setDefendantId: (value: string) => void;
}) {
  return (
    <section className="border-b border-[#88A9C8]/45 px-6 py-5">
      <p className="text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/60">
        Buscar en
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {scopeOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border-2 px-4 py-3 text-left transition ${scope === option.id ? "border-[#546FC0] bg-[#EEF3F8]" : "border-[#88A9C8]/45 bg-white hover:border-[#546FC0]"}`}
          >
            <span className="text-sm font-semibold text-[#0F2044]">
              {option.label}
            </span>
          </button>
        ))}
      </div>
      {scope === "defendant" && (
        <label className="mt-4 block max-w-xl">
          <span className="text-xs font-semibold text-[#0F2044]/60">
            Imputado
          </span>
          <select
            value={defendantId}
            onChange={(event) => setDefendantId(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-[#88A9C8] bg-white px-3 text-sm"
          >
            <option value="">Seleccionar…</option>
            {defendants.map((item) => (
              <option value={item.id} key={item.id}>
                {item.nombre}
                {item.rol ? ` · ${item.rol}` : ""}
              </option>
            ))}
          </select>
          {!defendants.length && (
            <span className="mt-2 block text-xs text-[#0F2044]/55">
              No hay imputados registrados.
            </span>
          )}
        </label>
      )}
    </section>
  );
}

function ContextSummary({
  scope,
  documents,
  defendants,
  selectedDefendant,
  loading,
  error,
}: {
  scope: Scope;
  documents: CaseDocument[];
  defendants: Defendant[];
  selectedDefendant?: Defendant;
  loading: boolean;
  error: string;
}) {
  return (
    <section className="p-6">
      <div className="rounded-xl border-2 border-[#88A9C8]/55 bg-[#F4F7F5] p-5">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/55">
          {scope === "defendant" ? "Imputado" : "Expediente"}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#0F2044]">
          {loading
            ? "Cargando…"
            : scope === "defendant"
              ? selectedDefendant?.nombre || "Seleccioná un imputado"
              : `${documents.length} documentos · ${defendants.length} imputados`}
        </h3>
        {selectedDefendant && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white px-3 py-1.5 font-medium">
              {selectedDefendant.rol || "Sin rol"}
            </span>
            {selectedDefendant.documento_identidad && (
              <span className="rounded-full bg-white px-3 py-1.5 font-medium">
                DNI {selectedDefendant.documento_identidad}
              </span>
            )}
          </div>
        )}
        {error && (
          <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
        )}
      </div>
    </section>
  );
}

function CaseCorpus({
  documents,
  loading,
  error,
}: {
  documents: CaseDocument[];
  loading: boolean;
  error: string;
}) {
  const ready = documents.filter((item) =>
    Boolean(item.extracted_text?.trim()),
  );
  return (
    <section className="p-6">
      <div className="rounded-xl border-2 border-[#88A9C8]/55 bg-[#F4F7F5] p-5">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/55">
          Documentos
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#0F2044]">
          {loading ? "Cargando…" : `${ready.length} disponibles`}
        </h3>
        {error && (
          <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
        )}
        {!loading && !error && ready.length === 0 && (
          <p className="mt-4 text-sm text-[#0F2044]/60">
            No hay documentos procesados.
          </p>
        )}
        {ready.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {ready.map((item) => (
              <li
                key={item.id}
                className="truncate rounded-lg border border-[#88A9C8]/45 bg-white px-3 py-2 text-xs font-medium text-[#0F2044]/75"
              >
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Source({
  label,
  value,
  onChange,
  documents,
  focusClass,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  documents: CaseDocument[];
  focusClass: string;
  compact?: boolean;
}) {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  async function extract(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch(`${apiUrl}/api/ia/extract-file`, {
        method: "POST",
        credentials: "include",
        body: data,
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "No se pudo leer el archivo.");
      onChange(body.document.text);
      setFileName(body.document.name);
    } catch (cause) {
      setUploadError(
        cause instanceof Error ? cause.message : "No se pudo leer el archivo.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/60">
          {label}
        </span>
        {documents.length > 0 && (
          <select
            aria-label={`Documento para ${label}`}
            defaultValue=""
            onChange={(event) => {
              const item = documents.find(
                (document) => String(document.id) === event.target.value,
              );
              if (item?.extracted_text) {
                onChange(item.extracted_text);
                setFileName(item.name);
              }
            }}
            className="rounded-lg border border-[#88A9C8] bg-white px-2 py-1 text-xs"
          >
            <option value="">Elegir documento…</option>
            {documents.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#88A9C8] bg-[#F4F7F5] px-4 py-3">
        <span>
          <strong className="block text-sm text-[#0F2044]">
            {uploading ? "Leyendo…" : "Adjuntar archivo"}
          </strong>
          <span className="text-xs text-[#0F2044]/50">
            PDF, DOCX, TXT, MD o CSV
          </span>
        </span>
        <span className="rounded-lg border border-[#88A9C8] bg-white px-3 py-2 text-xs font-semibold">
          Examinar
        </span>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv"
          className="hidden"
          onChange={(event) => void extract(event.target.files?.[0])}
        />
      </label>
      {fileName && (
        <p className="mt-2 text-xs font-medium text-[#546FC0]">{fileName}</p>
      )}
      {uploadError && (
        <p className="mt-2 text-xs font-semibold text-red-700">{uploadError}</p>
      )}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Pegá el contenido o adjuntá un archivo."
        className={`mt-2 w-full resize-y rounded-xl border-2 border-[#88A9C8]/60 p-4 text-sm leading-6 outline-none ${compact ? "min-h-36" : "min-h-52"} ${focusClass}`}
      />
    </div>
  );
}

function EmptyState({ busy, tool }: { busy: boolean; tool?: Tool }) {
  return (
    <section className="rounded-[23px] border-2 border-dashed border-[#88A9C8] bg-white px-6 py-6">
      <p className="text-sm font-semibold text-[#0F2044]/65">
        {busy
          ? "Procesando…"
          : `${tool?.label || "Herramienta"} lista para usar.`}
      </p>
    </section>
  );
}

function ReportActions({
  notice,
  onCopy,
  onDownload,
  onPrint,
}: {
  notice: string;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 rounded-[18px] border-2 border-[#88A9C8] bg-white px-4 py-3">
      {notice && <p className="mr-auto text-xs text-[#0F2044]/60">{notice}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-[#88A9C8] bg-white px-3 py-2 text-xs font-semibold"
        >
          Copiar
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-lg border border-[#88A9C8] bg-white px-3 py-2 text-xs font-semibold"
        >
          Descargar
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-lg bg-[#0F2044] px-3 py-2 text-xs font-semibold text-white"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

function Results({
  result,
  citations,
}: {
  result: Result;
  citations: Citation[];
}) {
  return (
    <section className="space-y-3">
      <article className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-6">
        <h2 className="text-[22px] font-semibold text-[#0F2044]">
          {result.titulo || "Resultado"}
        </h2>
        <div className="mt-4 rounded-[15px] bg-[#F4F7F5] px-5 py-4">
          <p className="whitespace-pre-line text-base leading-7 text-[#0F2044]/80">
            {result.conclusion || result.resumen || "Sin respuesta."}
          </p>
        </div>
        {result.desarrollo?.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {result.desarrollo.map((section, index) => (
              <section
                key={`${section.titulo}-${index}`}
                className="rounded-[15px] border border-[#88A9C8]/50 bg-white p-4"
              >
                <h3 className="text-sm font-semibold">{section.titulo}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#0F2044]/65">
                  {section.contenido}
                </p>
              </section>
            ))}
          </div>
        ) : null}
        {result.puntos_clave?.length ? (
          <div className="mt-5 border-t border-[#88A9C8]/40 pt-4">
            <h3 className="text-sm font-semibold">Puntos clave</h3>
            <ol className="mt-3 space-y-2">
              {result.puntos_clave.map((point, index) => (
                <li
                  key={index}
                  className="flex gap-3 text-sm leading-6 text-[#0F2044]/70"
                >
                  <span className="font-bold text-[#546FC0]">{index + 1}.</span>
                  <span>{point}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 border-t border-[#88A9C8]/40 pt-4 md:grid-cols-2">
          {result.acciones_sugeridas?.length ? (
            <ResultList
              title="Próximos pasos"
              items={result.acciones_sugeridas}
            />
          ) : null}
          {result.limitaciones?.length ? (
            <ResultList
              title="A tener en cuenta"
              items={result.limitaciones}
              muted
            />
          ) : null}
        </div>
      </article>
      {citations.length > 0 && (
        <details className="rounded-[18px] border-2 border-[#88A9C8] bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Fuentes ({citations.length})
          </summary>
          <div className="mt-4 divide-y rounded-lg border border-[#88A9C8]/40">
            {citations.map((item, index) => (
              <details key={item.citation_id} className="px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  {index + 1}. {item.document_name}
                </summary>
                <blockquote className="mt-3 border-l-2 border-[#88A9C8] pl-3 text-sm leading-6 text-[#0F2044]/65">
                  {item.text}
                </blockquote>
                {item.document_url && (
                  <a
                    href={item.document_url}
                    className="mt-3 inline-block text-xs font-semibold text-[#546FC0]"
                  >
                    Abrir documento →
                  </a>
                )}
              </details>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function ResultList({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-[#88A9C8]/50 p-4 ${muted ? "bg-white" : "bg-[#F4F7F5]"}`}
    >
      <h3 className="text-sm font-semibold text-[#0F2044]">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex gap-2 text-sm leading-6 text-[#0F2044]/65"
          >
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatReport(result: Result, citations: Citation[]) {
  const lines = [
    result.titulo || "Resultado",
    "",
    result.conclusion || result.resumen || "Sin respuesta.",
    "",
  ];
  result.desarrollo?.forEach((section) =>
    lines.push(section.titulo.toUpperCase(), section.contenido, ""),
  );
  result.puntos_clave?.forEach((point, index) =>
    lines.push(`${index + 1}. ${point}`),
  );
  if (result.acciones_sugeridas?.length)
    lines.push(
      "",
      "CONTROLES SUGERIDOS",
      ...result.acciones_sugeridas.map((item) => `- ${item}`),
    );
  if (result.limitaciones?.length)
    lines.push(
      "",
      "ALCANCE Y LÍMITES",
      ...result.limitaciones.map((item) => `- ${item}`),
    );
  if (citations.length) {
    lines.push("", "FUENTES");
    citations.forEach((item, index) =>
      lines.push(`${index + 1}. ${item.document_name}`, item.text, ""),
    );
  }
  lines.push("LegalMind · Documento de trabajo sujeto a revisión profesional.");
  return lines.join("\n").trim();
}
