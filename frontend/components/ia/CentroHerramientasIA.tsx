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
type Cita = {
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
    id: "comparar_imputados",
    label: "Comparar imputados",
    description: "Contrasta las fichas de dos imputados del expediente.",
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
  comparar_imputados: {
    code: "CI",
    instruction: "Comparación de las fichas registradas de dos imputados del mismo expediente.",
    action: "Comparar imputados",
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
  const [herramientas, setTools] = useState<Tool[]>(fallbackTools);
  const [idHerramienta, cambiarIdHerramienta] = useState("resumen_expediente");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [idExpediente, setCaseId] = useState("");
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [imputados, setDefendants] = useState<Defendant[]>([]);
  const [alcance, setScope] = useState<Scope>("documents");
  const [defendantId, setDefendantId] = useState("");
  const [defendantPair, setDefendantPair] = useState<[string, string]>(["", ""]);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [consulta, setQuery] = useState("");
  const [resultado, setResult] = useState<Result>();
  const [citas, setCitations] = useState<Cita[]>([]);
  const [savedId, setSavedId] = useState<number>();
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [errorDeContexto, cambiarErrorDeContexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, cambiarError] = useState("");
  const [notice, setNotice] = useState("");
  const requestController = useRef<AbortController | null>(null);
  const requestTimedOut = useRef(false);

  const herramienta = useMemo(
    () => herramientas.find((elemento) => elemento.id === idHerramienta) || herramientas[0],
    [idHerramienta, herramientas],
  );
  const ui = toolUi[idHerramienta] || toolUi.consulta_rag;
  const readyDocuments = useMemo(
    () => caseDocuments.filter((elemento) => Boolean(elemento.extracted_text?.trim())),
    [caseDocuments],
  );
  const usesCaseContext = Boolean(idExpediente) && herramienta?.inputs === 1;
  const effectiveScope: Scope = idHerramienta === "consulta_rag" ? alcance : "case";
  const selectedDefendant = imputados.find(
    (elemento) => String(elemento.id) === defendantId,
  );
  const canExecute =
    Boolean(herramienta) &&
    !busy &&
    (idHerramienta === "comparar_imputados"
      ? Boolean(idExpediente) && !loadingContext && !errorDeContexto && defendantPair.every((id) => imputados.some((elemento) => String(elemento.id) === id)) && defendantPair[0] !== defendantPair[1]
      : usesCaseContext
      ? !loadingContext &&
        !errorDeContexto &&
        (effectiveScope !== "documents" || readyDocuments.length > 0) &&
        (effectiveScope !== "defendant" || Boolean(defendantId)) &&
        (idHerramienta !== "consulta_rag" || Boolean(consulta.trim()))
      : Boolean(primary.trim()) &&
        (herramienta.inputs !== 2 || Boolean(secondary.trim())) &&
        (idHerramienta !== "consulta_rag" || Boolean(consulta.trim())));

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedCase = searchParams.get("case_id");
    const requestedTool = searchParams.get("tool");
    const requestedQuery = searchParams.get("query");
    if (requestedCase) setCaseId(requestedCase);
    if (requestedTool && toolUi[requestedTool]) cambiarIdHerramienta(requestedTool);
    if (requestedQuery) setQuery(requestedQuery);
    void fetch(`${apiUrl}/api/ia/tools`)
      .then((respuesta) => respuesta.json())
      .then((cuerpo) => {
        if (cuerpo.tools?.length) setTools(cuerpo.tools);
      })
      .catch(() => undefined);
    void cargarExpedientes();
  }, []);

  useEffect(() => {
    setDefendantPair(["", ""]);
    if (!idExpediente) {
      setCaseDocuments([]);
      setDefendants([]);
      cambiarErrorDeContexto("");
      setLoadingContext(false);
      setDefendantId("");
      return;
    }
    const controlador = new AbortController();
    setLoadingContext(true);
    cambiarErrorDeContexto("");
    setCaseDocuments([]);
    setDefendants([]);
    setDefendantId("");
    void Promise.all([
      fetch(`${apiUrl}/api/ia/cases/${idExpediente}/documents?include_text=true`, {
        credentials: "include",
        signal: controlador.signal,
      }),
      fetch(`${apiUrl}/api/casos/${idExpediente}/imputados`, {
        credentials: "include",
        signal: controlador.signal,
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
        cambiarErrorDeContexto(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el expediente.",
        );
      })
      .finally(() => {
        if (!controlador.signal.aborted) setLoadingContext(false);
      });
    return () => controlador.abort();
  }, [idExpediente]);

  async function cargarExpedientes() {
    setLoadingCases(true);
    try {
      const respuesta = await fetch(`${apiUrl}/api/casos`, {
        credentials: "include",
        signal: AbortSignal.timeout(6000),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok)
        throw new Error(cuerpo.error || "No se pudieron cargar los expedientes.");
      setCases(cuerpo.cases || []);
    } catch (cause) {
      cambiarError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los expedientes.",
      );
    } finally {
      setLoadingCases(false);
    }
  }

  function seleccionarHerramienta(nextTool: Tool) {
    requestController.current?.abort();
    cambiarIdHerramienta(nextTool.id);
    setPrimary("");
    setSecondary("");
    setQuery("");
    setScope("documents");
    setResult(undefined);
    setCitations([]);
    setSavedId(undefined);
    cambiarError("");
    setNotice("");
  }

  async function ejecutarHerramienta() {
    if (!canExecute) return;
    setBusy(true);
    cambiarError("");
    setNotice("");
    setResult(undefined);
    setCitations([]);
    setSavedId(undefined);
    const controlador = new AbortController();
    requestController.current = controlador;
    requestTimedOut.current = false;
    const timeout = window.setTimeout(() => {
      requestTimedOut.current = true;
      controlador.abort();
    }, 9800);
    try {
      const respuesta = await fetch(`${apiUrl}/api/ia/tools/${idHerramienta}/run`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controlador.signal,
        body: JSON.stringify({
          primary_text: primary,
          secondary_text: secondary,
          query: consulta,
          case_id: idExpediente ? Number(idExpediente) : null,
          scope: effectiveScope,
          defendant_id:
            effectiveScope === "defendant" && defendantId
              ? Number(defendantId)
              : null,
          defendant_ids: idHerramienta === "comparar_imputados" ? defendantPair.map(Number) : undefined,
          use_case_context: usesCaseContext,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok)
        throw new Error([cuerpo.error, cuerpo.details].filter(Boolean).join(" "));
      setResult(cuerpo.result);
      setCitations(cuerpo.citations || []);
      setSavedId(cuerpo.saved_query?.id);
      if (cuerpo._metadata?.engine === "fast_extractive_rag") {
        setNotice("Se muestran pasajes extraídos de las fuentes porque la IA no pudo completar el análisis. Revisá ambas fuentes antes de interpretar coincidencias o diferencias.");
      }
    } catch (cause) {
      const aborted =
        cause instanceof DOMException && cause.name === "AbortError";
      cambiarError(
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

  const report = resultado ? formatearInforme(resultado, citas) : "";

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <section
        className={`rounded-[23px] border-2 border-[#88A9C8] bg-white ${compact ? "p-4" : "p-5"}`}
      >
        <h2 className="mb-4 text-[22px] font-semibold">Herramientas</h2>
        <div
          className={`grid gap-3 ${compact ? "@min-[640px]:grid-cols-2" : "@min-[640px]:grid-cols-2 @min-[1280px]:grid-cols-3"}`}
        >
          {herramientas.map((elemento) => {
            const itemUi = toolUi[elemento.id] || toolUi.consulta_rag;
            const activo = elemento.id === idHerramienta;
            return (
              <button
                type="button"
                key={elemento.id}
                onClick={() => seleccionarHerramienta(elemento)}
                aria-pressed={activo}
                className={`group flex items-center gap-3 rounded-[15px] border-2 text-left transition ${compact ? "min-h-16 p-3" : "min-h-[72px] p-3"} ${activo ? itemUi.active : "border-[#88A9C8]/45 bg-[#F4F7F5] hover:border-[#546FC0] hover:bg-white"}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black tracking-wider ${activo ? itemUi.header : "bg-[#e8ece9] text-[#46524f]"}`}
                >
                  {itemUi.code}
                </span>
                <span>
                  <strong className="block text-sm text-[#0F2044]">
                    {elemento.label}
                  </strong>
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
                <h1 className="text-[22px] font-semibold">{herramienta?.label}</h1>
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
                value={idExpediente}
                onChange={(evento) => {
                  setCaseId(evento.target.value);
                  setDefendantPair(["", ""]);
                  setPrimary(""); setSecondary(""); setCitations([]); setSavedId(undefined);
                  setResult(undefined);
                  cambiarError("");
                }}
                className="mt-2 h-11 w-full rounded-lg border border-[#bfc4c1] bg-white px-3 text-sm outline-none"
              >
                <option value="">{idHerramienta === "comparar_imputados" ? "Seleccionar expediente" : "Sin expediente · usar fuentes manuales"}</option>
                {cases.map((elemento) => (
                  <option value={elemento.id} key={elemento.id}>
                    {elemento.identificador ? `${elemento.identificador} · ` : ""}
                    {elemento.name || elemento.caratula || `Expediente ${elemento.id}`}
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

          {idHerramienta === "consulta_rag" && idExpediente && (
            <SelectorDeAlcance
              scope={alcance}
              onChange={(siguiente) => {
                setScope(siguiente);
                setResult(undefined);
                cambiarError("");
              }}
              defendants={imputados}
              defendantId={defendantId}
              setDefendantId={setDefendantId}
            />
          )}

          {idHerramienta === "comparar_imputados" ? (
            <div className={compact ? "p-4" : "p-6"}>
              <p className="mb-4 text-sm text-[#0F2044]/70">Seleccioná dos personas distintas. Se comparan sus fichas registradas; los documentos del expediente no se incluyen automáticamente.</p>
              <div className="grid gap-4 @min-[640px]:grid-cols-2">
                {([0, 1] as const).map((indice) => (
                  <label key={indice} className="text-sm font-semibold">
                    Imputado {indice === 0 ? "A" : "B"}
                    <select className="input mt-2" value={defendantPair[indice]} disabled={!idExpediente || loadingContext || busy} onChange={(evento) => {
                      const siguiente: [string, string] = [...defendantPair];
                      siguiente[indice] = evento.target.value;
                      setDefendantPair(siguiente); setResult(undefined); cambiarError("");
                    }}>
                      <option value="">Seleccionar imputado</option>
                      {imputados.map((elemento) => <option key={elemento.id} value={elemento.id} disabled={String(elemento.id) === defendantPair[indice === 0 ? 1 : 0]}>{elemento.nombre}{elemento.rol ? ` · ${elemento.rol}` : ""}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              {loadingContext ? <p role="status" className="mt-3 text-sm">Cargando fichas…</p> : null}
              {errorDeContexto ? <p role="alert" className="mt-3 text-sm text-red-700">{errorDeContexto}</p> : null}
              {idExpediente && !loadingContext && !errorDeContexto && imputados.length < 2 ? <p className="mt-3 text-sm">Este expediente necesita al menos dos imputados registrados para comparar.</p> : null}
            </div>
          ) : usesCaseContext ? (
            effectiveScope === "documents" ? (
              <FuentesDelExpediente
                documents={caseDocuments}
                loading={loadingContext}
                error={errorDeContexto}
              />
            ) : (
              <ResumenDelContexto
                scope={effectiveScope}
                documents={readyDocuments}
                defendants={imputados}
                selectedDefendant={selectedDefendant}
                loading={loadingContext}
                error={errorDeContexto}
              />
            )
          ) : (
            <div
              className={`grid gap-5 ${compact ? "p-4" : "p-6"} ${herramienta?.inputs === 2 && !compact ? "@min-[1024px]:grid-cols-2" : ""}`}
            >
              <PanelDeFuente
                key={`${idExpediente}-${idHerramienta}-a`}
                label={herramienta?.inputs === 2 ? "Fuente A" : "Material jurídico"}
                value={primary}
                onChange={setPrimary}
                documents={readyDocuments}
                focusClass={ui.focus}
                compact={compact}
              />
              {herramienta?.inputs === 2 && (
                <PanelDeFuente
                  key={`${idExpediente}-${idHerramienta}-b`}
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
              {idHerramienta === "consulta_rag"
                ? "Pregunta concreta"
                : "Objetivo o enfoque (opcional)"}
            </label>
            {idHerramienta === "consulta_rag" && idExpediente && (
              <div className="mt-3 flex flex-wrap gap-2">
                {questionExamples[alcance].map((example) => (
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
                value={consulta}
                onChange={(evento) => setQuery(evento.target.value)}
                placeholder={
                  idHerramienta === "consulta_rag"
                    ? "Escribí tu pregunta"
                    : "Enfoque opcional"
                }
                className={`min-h-12 flex-1 resize-y rounded-xl border-2 border-[#88A9C8]/60 bg-white px-3 py-3 text-sm outline-none ${ui.focus}`}
              />
              <button
                type="button"
                disabled={!canExecute}
                onClick={() => void ejecutarHerramienta()}
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

        {savedId && idExpediente && (
          <a
            href={`/casos/${idExpediente}/consultas?consulta=${savedId}`}
            className="block rounded-[18px] border-2 border-[#88A9C8] bg-white px-5 py-4 text-sm font-semibold text-[#0F2044]"
          >
            Ver consulta guardada →
          </a>
        )}
        {!resultado ? (
          <EstadoVacio busy={busy} tool={herramienta} />
        ) : (
          <>
            <AccionesDelInforme
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
                  resultado.titulo || herramienta?.label || "informe",
                  report,
                );
                setNotice("Informe descargado.");
              }}
              onPrint={() => {
                try {
                  printPlainTextReport(resultado.titulo, report);
                  setNotice("Vista de impresión abierta.");
                } catch {
                  setNotice("No se pudo abrir la impresión.");
                }
              }}
            />
            <Resultados result={resultado} citations={citas} />
          </>
        )}
      </main>
    </div>
  );
}

function SelectorDeAlcance({
  scope: alcance,
  onChange,
  defendants: imputados,
  defendantId,
  setDefendantId,
}: {
  scope: Scope;
  onChange: (alcance: Scope) => void;
  defendants: Defendant[];
  defendantId: string;
  setDefendantId: (valor: string) => void;
}) {
  return (
    <section className="border-b border-[#88A9C8]/45 px-6 py-5">
      <p className="text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/60">
        Buscar en
      </p>
      <div className="mt-3 grid gap-3 @min-[768px]:grid-cols-3">
        {scopeOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border-2 px-4 py-3 text-left transition ${alcance === option.id ? "border-[#546FC0] bg-[#EEF3F8]" : "border-[#88A9C8]/45 bg-white hover:border-[#546FC0]"}`}
          >
            <span className="text-sm font-semibold text-[#0F2044]">
              {option.label}
            </span>
          </button>
        ))}
      </div>
      {alcance === "defendant" && (
        <label className="mt-4 block max-w-xl">
          <span className="text-xs font-semibold text-[#0F2044]/60">
            Imputado
          </span>
          <select
            value={defendantId}
            onChange={(evento) => setDefendantId(evento.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-[#88A9C8] bg-white px-3 text-sm"
          >
            <option value="">Seleccionar…</option>
            {imputados.map((elemento) => (
              <option value={elemento.id} key={elemento.id}>
                {elemento.nombre}
                {elemento.rol ? ` · ${elemento.rol}` : ""}
              </option>
            ))}
          </select>
          {!imputados.length && (
            <span className="mt-2 block text-xs text-[#0F2044]/55">
              No hay imputados registrados.
            </span>
          )}
        </label>
      )}
    </section>
  );
}

function ResumenDelContexto({
  scope: alcance,
  documents: documentos,
  defendants: imputados,
  selectedDefendant,
  loading: cargando,
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
          {alcance === "defendant" ? "Imputado" : "Expediente"}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#0F2044]">
          {cargando
            ? "Cargando…"
            : alcance === "defendant"
              ? selectedDefendant?.nombre || "Seleccioná un imputado"
              : `${documentos.length} documentos · ${imputados.length} imputados`}
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

function FuentesDelExpediente({
  documents: documentos,
  loading: cargando,
  error,
}: {
  documents: CaseDocument[];
  loading: boolean;
  error: string;
}) {
  const ready = documentos.filter((elemento) =>
    Boolean(elemento.extracted_text?.trim()),
  );
  return (
    <section className="p-6">
      <div className="rounded-xl border-2 border-[#88A9C8]/55 bg-[#F4F7F5] p-5">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/55">
          Documentos
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#0F2044]">
          {cargando ? "Cargando…" : `${ready.length} disponibles`}
        </h3>
        {error && (
          <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
        )}
        {!cargando && !error && ready.length === 0 && (
          <p className="mt-4 text-sm text-[#0F2044]/60">
            No hay documentos procesados.
          </p>
        )}
        {ready.length > 0 && (
          <ul className="mt-4 grid gap-2 @min-[640px]:grid-cols-2">
            {ready.map((elemento) => (
              <li
                key={elemento.id}
                className="truncate rounded-lg border border-[#88A9C8]/45 bg-white px-3 py-2 text-xs font-medium text-[#0F2044]/75"
              >
                {elemento.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PanelDeFuente({
  label,
  value: valor,
  onChange,
  documents: documentos,
  focusClass,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  documents: CaseDocument[];
  focusClass: string;
  compact?: boolean;
}) {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  async function extraerTexto(archivo?: File) {
    if (!archivo) return;
    setUploading(true);
    setUploadError("");
    try {
      const data = new FormData();
      data.set("file", archivo);
      const respuesta = await fetch(`${apiUrl}/api/ia/extract-file`, {
        method: "POST",
        credentials: "include",
        body: data,
        signal: AbortSignal.timeout(8000),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok)
        throw new Error(cuerpo.error || "No se pudo leer el archivo.");
      onChange(cuerpo.document.text);
      setFileName(cuerpo.document.name);
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
        {documentos.length > 0 && (
          <select
            aria-label={`Documento para ${label}`}
            defaultValue=""
            onChange={(evento) => {
              const elemento = documentos.find(
                (documento) => String(documento.id) === evento.target.value,
              );
              if (elemento?.extracted_text) {
                onChange(elemento.extracted_text);
                setFileName(elemento.name);
              }
            }}
            className="rounded-lg border border-[#88A9C8] bg-white px-2 py-1 text-xs"
          >
            <option value="">Elegir documento…</option>
            {documentos.map((elemento) => (
              <option value={elemento.id} key={elemento.id}>
                {elemento.name}
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
          onChange={(evento) => void extraerTexto(evento.target.files?.[0])}
        />
      </label>
      {fileName && (
        <p className="mt-2 text-xs font-medium text-[#546FC0]">{fileName}</p>
      )}
      {uploadError && (
        <p className="mt-2 text-xs font-semibold text-red-700">{uploadError}</p>
      )}
      <textarea
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder="Pegá el contenido o adjuntá un archivo."
        className={`mt-2 w-full resize-y rounded-xl border-2 border-[#88A9C8]/60 p-4 text-sm leading-6 outline-none ${compact ? "min-h-36" : "min-h-52"} ${focusClass}`}
      />
    </div>
  );
}

function EstadoVacio({ busy, tool: herramienta }: { busy: boolean; tool?: Tool }) {
  return (
    <section className="rounded-[23px] border-2 border-dashed border-[#88A9C8] bg-white px-6 py-6">
      <p className="text-sm font-semibold text-[#0F2044]/65">
        {busy
          ? "Procesando…"
          : `${herramienta?.label || "Herramienta"} lista para usar.`}
      </p>
    </section>
  );
}

function AccionesDelInforme({
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

function Resultados({
  result: resultado,
  citations: citas,
}: {
  result: Result;
  citations: Cita[];
}) {
  return (
    <section className="space-y-3">
      <article className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-6">
        <h2 className="text-[22px] font-semibold text-[#0F2044]">
          {resultado.titulo || "Resultado"}
        </h2>
        <div className="mt-4 rounded-[15px] bg-[#F4F7F5] px-5 py-4">
          <p className="whitespace-pre-line text-base leading-7 text-[#0F2044]/80">
            {resultado.conclusion || resultado.resumen || "Sin respuesta."}
          </p>
        </div>
        {resultado.desarrollo?.length ? (
          <div className="mt-5 grid gap-3 @min-[1024px]:grid-cols-2">
            {resultado.desarrollo.map((section, indice) => (
              <section
                key={`${section.titulo}-${indice}`}
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
        {resultado.puntos_clave?.length ? (
          <div className="mt-5 border-t border-[#88A9C8]/40 pt-4">
            <h3 className="text-sm font-semibold">Puntos clave</h3>
            <ol className="mt-3 space-y-2">
              {resultado.puntos_clave.map((point, indice) => (
                <li
                  key={indice}
                  className="flex gap-3 text-sm leading-6 text-[#0F2044]/70"
                >
                  <span className="font-bold text-[#546FC0]">{indice + 1}.</span>
                  <span>{point}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 border-t border-[#88A9C8]/40 pt-4 @min-[768px]:grid-cols-2">
          {resultado.acciones_sugeridas?.length ? (
            <ListaDeResultados
              title="Próximos pasos"
              items={resultado.acciones_sugeridas}
            />
          ) : null}
          {resultado.limitaciones?.length ? (
            <ListaDeResultados
              title="A tener en cuenta"
              items={resultado.limitaciones}
              muted
            />
          ) : null}
        </div>
      </article>
      {citas.length > 0 && (
        <details className="rounded-[18px] border-2 border-[#88A9C8] bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Fuentes ({citas.length})
          </summary>
          <div className="mt-4 divide-y rounded-lg border border-[#88A9C8]/40">
            {citas.map((elemento, indice) => (
              <details key={elemento.citation_id} className="px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  {indice + 1}. {elemento.document_name}
                </summary>
                <blockquote className="mt-3 border-l-2 border-[#88A9C8] pl-3 text-sm leading-6 text-[#0F2044]/65">
                  {elemento.text}
                </blockquote>
                {elemento.document_url && (
                  <a
                    href={elemento.document_url}
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

function ListaDeResultados({
  title: titulo,
  items: elementos,
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
      <h3 className="text-sm font-semibold text-[#0F2044]">{titulo}</h3>
      <ul className="mt-3 space-y-2">
        {elementos.map((elemento, indice) => (
          <li
            key={indice}
            className="flex gap-2 text-sm leading-6 text-[#0F2044]/65"
          >
            <span>•</span>
            <span>{elemento}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatearInforme(resultado: Result, citas: Cita[]) {
  const lineas = [
    resultado.titulo || "Resultado",
    "",
    resultado.conclusion || resultado.resumen || "Sin respuesta.",
    "",
  ];
  resultado.desarrollo?.forEach((section) =>
    lineas.push(section.titulo.toUpperCase(), section.contenido, ""),
  );
  resultado.puntos_clave?.forEach((point, indice) =>
    lineas.push(`${indice + 1}. ${point}`),
  );
  if (resultado.acciones_sugeridas?.length)
    lineas.push(
      "",
      "CONTROLES SUGERIDOS",
      ...resultado.acciones_sugeridas.map((elemento) => `- ${elemento}`),
    );
  if (resultado.limitaciones?.length)
    lineas.push(
      "",
      "ALCANCE Y LÍMITES",
      ...resultado.limitaciones.map((elemento) => `- ${elemento}`),
    );
  if (citas.length) {
    lineas.push("", "FUENTES");
    citas.forEach((elemento, indice) =>
      lineas.push(`${indice + 1}. ${elemento.document_name}`, elemento.text, ""),
    );
  }
  lineas.push("LegalMind · Documento de trabajo sujeto a revisión profesional.");
  return lineas.join("\n").trim();
}
