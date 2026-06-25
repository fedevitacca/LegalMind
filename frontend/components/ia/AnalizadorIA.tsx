"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AnalysisMode = "auto" | "local" | "openai";
type InputMode = "text" | "file";

type AnalysisDate = {
  evento: string;
  fecha: string;
  requiere_alerta: boolean;
  tipo: string;
};

type Defendant = {
  datos_asociados: string[];
  documentos_mencionados: string[];
  hechos_vinculados: string[];
  imputaciones: string[];
  nombre: string;
};

type SourceFile = {
  mime_type: string;
  name: string;
  size_bytes: number;
};

type Persistence = {
  analysis_id: number;
  document_id: number;
};

type Analysis = {
  actuaciones_pendientes: string[];
  categorias: string[];
  causa: {
    datos_generales: string[];
    hechos_relevantes: string[];
  };
  fechas_relevantes: AnalysisDate[];
  imputados: Defendant[];
  nivel_confianza: string;
  observaciones: string[];
  resumen: string;
  tipo_documento: string;
  _metadata: {
    engine: "local" | "openai";
    fallback_reason?: string;
    fallback_used: boolean;
    model?: string;
    persistence?: Persistence;
    source_file?: SourceFile;
  };
};

type Health = {
  module: string;
  openai_configured: boolean;
  openai_model: string;
  status: string;
};

type CaseOption = {
  caption?: string;
  id?: number;
  name: string;
  slug: string;
};

type StoredDocument = {
  created_at: string;
  id: number;
  mime_type?: string;
  name: string;
  size_bytes?: number;
  status: string;
  type?: string;
};

type RagChunk = {
  chunk_index: number;
  document_id: number;
  document_name: string;
  score: number;
  text: string;
};

type RagResult = {
  answer: string;
  case_id: number;
  confidence: string;
  engine: string;
  retrieved_chunks: RagChunk[];
};

const apiUrl = (
  process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const sampleText = `Causa nro 9988/2026. Caratula: Perez Juan s/ robo agravado.
Juzgado Federal N. 2, Secretaria Penal.
Se investiga el hecho ocurrido el 03/04/2026 en perjuicio de la victima Laura Rios.
El imputado Juan Perez fue detenido y se le atribuye el delito de robo agravado.
Obra informe pericial y acta de allanamiento vinculados al imputado Juan Perez.
Se fija audiencia de indagatoria para el 18 de abril de 2026.
La defensa debera presentar documentacion hasta el 22/04/2026.`;

const analysisModes: { label: string; value: AnalysisMode }[] = [
  { label: "Auto", value: "auto" },
  { label: "Local", value: "local" },
  { label: "OpenAI", value: "openai" },
];

export default function AnalizadorIA() {
  const [health, setHealth] = useState<Health>();
  const [healthError, setHealthError] = useState("");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [casesError, setCasesError] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [mode, setMode] = useState<AnalysisMode>("auto");
  const [text, setText] = useState(sampleText);
  const [file, setFile] = useState<File>();
  const [persist, setPersist] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [documentsError, setDocumentsError] = useState("");
  const [question, setQuestion] = useState("Que audiencia o vencimiento esta pendiente?");
  const [ragResult, setRagResult] = useState<RagResult>();
  const [ragError, setRagError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRagLoading, setIsRagLoading] = useState(false);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);

  const selectedCaseId = useMemo(() => parsePositiveInteger(caseId), [caseId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      const [healthResult, casesResult] = await Promise.allSettled([
        loadHealth(controller),
        loadCases(controller),
      ]);

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else if (!controller.signal.aborted) {
        setHealthError(getErrorMessage(healthResult.reason));
      }

      if (casesResult.status === "fulfilled") {
        setCases(casesResult.value);
      } else if (!controller.signal.aborted) {
        setCasesError("Las causas reales no estan disponibles. Se puede ingresar el ID manualmente.");
      }
    }

    loadInitialData();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadDocuments(selectedCaseId);
    }
  }, [selectedCaseId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAnalysis(undefined);

    if (inputMode === "text" && !text.trim()) {
      setError("Ingresa texto para analizar.");
      return;
    }

    if (inputMode === "file" && !file) {
      setError("Selecciona un archivo TXT.");
      return;
    }

    if (persist && !selectedCaseId) {
      setError("Para guardar el analisis, ingresa el ID numerico de una causa.");
      return;
    }

    setIsLoading(true);

    try {
      const response =
        inputMode === "file"
          ? await analyzeFile(file as File, {
              caseId: selectedCaseId,
              mode,
              persist,
            })
          : await analyzeText(text, {
              caseId: selectedCaseId,
              mode,
              persist,
            });
      const body = (await response.json()) as Analysis & {
        details?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error([body.error, body.details].filter(Boolean).join(" "));
      }

      setAnalysis(body);

      if (body._metadata.persistence && selectedCaseId) {
        await loadDocuments(selectedCaseId);
      }
    } catch (analysisError) {
      setError(getErrorMessage(analysisError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRagError("");
    setRagResult(undefined);

    if (!selectedCaseId) {
      setRagError("Ingresa el ID numerico de una causa.");
      return;
    }

    if (!question.trim()) {
      setRagError("Ingresa una pregunta para consultar la causa.");
      return;
    }

    setIsRagLoading(true);

    try {
      const response = await queryRag(selectedCaseId, question);
      const body = (await response.json()) as RagResult & {
        details?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error([body.error, body.details].filter(Boolean).join(" "));
      }

      setRagResult(body);
    } catch (ragQueryError) {
      setRagError(getErrorMessage(ragQueryError));
    } finally {
      setIsRagLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.88fr)_minmax(0,1.12fr)]">
        <form
          className="flex min-h-[680px] flex-col rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#84A2BD]/28 pb-4">
            <div>
              <h2 className="text-xl font-semibold">Entrada</h2>
              <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
                Backend: {apiUrl}
              </p>
            </div>
            <HealthBadge error={healthError} health={health} />
          </div>

          <div className="mt-5 grid gap-4">
            <fieldset>
              <legend className="text-sm font-semibold">Origen</legend>
              <div className="mt-2 grid grid-cols-2 rounded-lg bg-[#F4F7F5] p-1">
                <ModeButton
                  active={inputMode === "text"}
                  label="Texto"
                  onClick={() => setInputMode("text")}
                />
                <ModeButton
                  active={inputMode === "file"}
                  label="Archivo TXT"
                  onClick={() => setInputMode("file")}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">Motor</legend>
              <div className="mt-2 grid grid-cols-3 rounded-lg bg-[#F4F7F5] p-1">
                {analysisModes.map((analysisMode) => (
                  <ModeButton
                    active={mode === analysisMode.value}
                    key={analysisMode.value}
                    label={analysisMode.label}
                    onClick={() => setMode(analysisMode.value)}
                  />
                ))}
              </div>
            </fieldset>

            <CaseControls
              caseId={caseId}
              cases={cases}
              casesError={casesError}
              onCaseIdChange={setCaseId}
              onPersistChange={setPersist}
              persist={persist}
            />
          </div>

          {inputMode === "text" ? (
            <label className="mt-5 flex min-h-0 flex-1 flex-col">
              <span className="text-sm font-semibold">Texto juridico</span>
              <textarea
                className="mt-2 min-h-[280px] flex-1 resize-none rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 py-3 text-sm font-medium leading-6 outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
                onChange={(event) => setText(event.target.value)}
                value={text}
              />
            </label>
          ) : (
            <label className="mt-5 grid min-h-[320px] place-items-center rounded-lg border border-dashed border-[#546FC0]/55 bg-[#F4F7F5] p-5 text-center transition focus-within:border-[#546FC0] focus-within:bg-white">
              <span>
                <span className="block text-base font-semibold">
                  {file?.name || "Seleccionar TXT"}
                </span>
                <span className="mt-2 block text-sm font-medium text-[#0F2044]/58">
                  {file ? formatBytes(file.size) : "Hasta 5 MB"}
                </span>
              </span>
              <input
                accept=".txt,text/plain"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0])}
                type="file"
              />
            </label>
          )}

          {error ? <AlertMessage message={error} /> : null}

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[#84A2BD]/28 pt-4">
            {inputMode === "text" ? (
              <button
                className="rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[#84A2BD]/20"
                onClick={() => setText(sampleText)}
                type="button"
              >
                Restaurar ejemplo
              </button>
            ) : null}
            <button
              className="rounded-full bg-[#546FC0] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044] disabled:cursor-wait disabled:bg-[#84A2BD]"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Analizando..." : persist ? "Analizar y guardar" : "Analizar"}
            </button>
          </div>
        </form>

        <AnalysisResult analysis={analysis} />
      </div>

      <CaseWorkspace
        caseId={selectedCaseId}
        documents={selectedCaseId ? documents : []}
        documentsError={selectedCaseId ? documentsError : ""}
        isDocumentsLoading={isDocumentsLoading}
        isRagLoading={isRagLoading}
        onQuestionChange={setQuestion}
        onRefreshDocuments={() => selectedCaseId && loadDocuments(selectedCaseId)}
        onSubmit={handleRagSubmit}
        question={question}
        ragError={ragError}
        ragResult={selectedCaseId ? ragResult : undefined}
      />
    </div>
  );

  async function loadDocuments(id: number) {
    setDocumentsError("");
    setIsDocumentsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/ia/cases/${id}/documents`);
      const body = (await response.json()) as {
        details?: string;
        documents?: StoredDocument[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error([body.error, body.details].filter(Boolean).join(" "));
      }

      setDocuments(body.documents || []);
    } catch (loadError) {
      setDocuments([]);
      setDocumentsError(getErrorMessage(loadError));
    } finally {
      setIsDocumentsLoading(false);
    }
  }
}

async function loadHealth(controller: AbortController) {
  try {
    const response = await fetch(`${apiUrl}/api/ia/health`, {
      signal: controller.signal,
    });
    const body = (await response.json()) as Health;

    if (!response.ok) {
      throw new Error("No se pudo consultar el backend de IA.");
    }

    return body;
  } catch (loadError) {
    if (controller.signal.aborted) {
      return undefined;
    }

    throw loadError;
  }
}

async function loadCases(controller: AbortController) {
  try {
    const response = await fetch(`${apiUrl}/api/casos`, {
      signal: controller.signal,
    });
    const body = (await response.json()) as {
      cases?: CaseOption[];
      details?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error([body.error, body.details].filter(Boolean).join(" "));
    }

    return body.cases || [];
  } catch (loadError) {
    if (controller.signal.aborted) {
      return [];
    }

    throw loadError;
  }
}

function CaseControls({
  caseId,
  cases,
  casesError,
  onCaseIdChange,
  onPersistChange,
  persist,
}: {
  caseId: string;
  cases: CaseOption[];
  casesError: string;
  onCaseIdChange: (value: string) => void;
  onPersistChange: (value: boolean) => void;
  persist: boolean;
}) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4">
      <div className="flex items-start gap-3">
        <input
          checked={persist}
          className="mt-1 h-4 w-4 accent-[#546FC0]"
          id="guardar-analisis"
          onChange={(event) => onPersistChange(event.target.checked)}
          type="checkbox"
        />
        <label htmlFor="guardar-analisis">
          <span className="block text-sm font-semibold">Guardar en una causa</span>
          <span className="mt-1 block text-sm font-medium leading-5 text-[#0F2044]/62">
            El resultado queda disponible para documentos, fechas, actuaciones y consulta RAG.
          </span>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">ID de causa</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-[#84A2BD]/55 bg-white px-4 text-sm font-medium outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/20"
          inputMode="numeric"
          onChange={(event) => onCaseIdChange(event.target.value)}
          placeholder="Ejemplo: 1"
          value={caseId}
        />
      </label>

      {cases.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {cases
            .filter((legalCase) => legalCase.id)
            .slice(0, 6)
            .map((legalCase) => (
              <button
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-[#84A2BD]/22"
                key={legalCase.id}
                onClick={() => onCaseIdChange(String(legalCase.id))}
                type="button"
              >
                {legalCase.name}
              </button>
            ))}
        </div>
      ) : null}

      {casesError ? (
        <p className="mt-3 text-xs font-medium leading-5 text-[#0F2044]/58">
          {casesError}
        </p>
      ) : null}
    </section>
  );
}

function CaseWorkspace({
  caseId,
  documents,
  documentsError,
  isDocumentsLoading,
  isRagLoading,
  onQuestionChange,
  onRefreshDocuments,
  onSubmit,
  question,
  ragError,
  ragResult,
}: {
  caseId: number | null;
  documents: StoredDocument[];
  documentsError: string;
  isDocumentsLoading: boolean;
  isRagLoading: boolean;
  onQuestionChange: (value: string) => void;
  onRefreshDocuments: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  question: string;
  ragError: string;
  ragResult?: RagResult;
}) {
  return (
    <section className="grid gap-5 rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)] xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#84A2BD]/28 pb-4">
          <div>
            <h2 className="text-xl font-semibold">Documentos guardados</h2>
            <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
              {caseId ? `Causa ${caseId}` : "Selecciona una causa"}
            </p>
          </div>
          <button
            className="rounded-full bg-[#F4F7F5] px-4 py-2 text-sm font-semibold transition hover:bg-[#84A2BD]/22 disabled:cursor-not-allowed disabled:text-[#0F2044]/38"
            disabled={!caseId || isDocumentsLoading}
            onClick={onRefreshDocuments}
            type="button"
          >
            {isDocumentsLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {documentsError ? <AlertMessage message={documentsError} /> : null}
          {!caseId ? <EmptyBlock title="Sin causa seleccionada" /> : null}
          {caseId && !documentsError && !documents.length ? (
            <EmptyBlock title="Sin documentos guardados" />
          ) : null}
          {documents.map((document) => (
            <article
              className="rounded-lg border border-[#84A2BD]/30 bg-[#F4F7F5] p-4"
              key={document.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{document.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[#0F2044]/58">
                    {document.status} | {document.type || "texto"}
                  </p>
                </div>
                {document.size_bytes ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold">
                    {formatBytes(document.size_bytes)}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="border-b border-[#84A2BD]/28 pb-4">
          <h2 className="text-xl font-semibold">Consulta RAG local</h2>
          <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
            Responde usando fragmentos guardados de la causa.
          </p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Pregunta</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-none rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 py-3 text-sm font-medium leading-6 outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
            onChange={(event) => onQuestionChange(event.target.value)}
            value={question}
          />
        </label>

        {ragError ? <AlertMessage message={ragError} /> : null}

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-full bg-[#546FC0] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044] disabled:cursor-wait disabled:bg-[#84A2BD]"
            disabled={isRagLoading}
            type="submit"
          >
            {isRagLoading ? "Consultando..." : "Consultar causa"}
          </button>
        </div>

        {ragResult ? (
          <div className="mt-5 grid gap-4">
            <ResultBlock title={`Respuesta | confianza ${ragResult.confidence}`}>
              <p className="text-sm font-medium leading-6 text-[#0F2044]/72">
                {ragResult.answer}
              </p>
            </ResultBlock>
            <ResultBlock title="Fragmentos usados">
              {ragResult.retrieved_chunks.length ? (
                <div className="grid gap-2">
                  {ragResult.retrieved_chunks.map((chunk) => (
                    <article
                      className="rounded-lg bg-white px-3 py-2"
                      key={`${chunk.document_id}-${chunk.chunk_index}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{chunk.document_name}</h4>
                        <span className="rounded-full bg-[#F4F7F5] px-2 py-1 text-xs font-semibold">
                          {chunk.score.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/62">
                        {chunk.text}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-[#0F2044]/58">
                  Sin fragmentos recuperados.
                </p>
              )}
            </ResultBlock>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function HealthBadge({ error, health }: { error: string; health?: Health }) {
  if (error) {
    return (
      <span className="rounded-full bg-[#A68147]/18 px-3 py-1.5 text-xs font-semibold">
        Backend sin respuesta
      </span>
    );
  }

  if (!health) {
    return (
      <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5 text-xs font-semibold">
        Consultando backend
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#84A2BD]/22 px-3 py-1.5 text-xs font-semibold">
      {health.openai_configured ? health.openai_model : "Motor local listo"}
    </span>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-md text-sm font-semibold transition ${
        active
          ? "bg-white text-[#0F2044] shadow-[0_4px_14px_rgba(15,32,68,0.12)]"
          : "text-[#0F2044]/62 hover:text-[#0F2044]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AnalysisResult({ analysis }: { analysis?: Analysis }) {
  if (!analysis) {
    return (
      <section className="min-h-[680px] rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <h2 className="text-xl font-semibold">Resultado</h2>
        <div className="mt-5 grid gap-3">
          <EmptyBlock title="Resumen" />
          <EmptyBlock title="Causa" />
          <EmptyBlock title="Imputados" />
          <EmptyBlock title="Fechas y actuaciones" />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[680px] rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#84A2BD]/28 pb-4">
        <div>
          <h2 className="text-xl font-semibold">Resultado</h2>
          <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
            {analysis.tipo_documento} | confianza {analysis.nivel_confianza}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-[#84A2BD]/22 px-3 py-1.5">
            {analysis._metadata.engine}
          </span>
          {analysis._metadata.fallback_used ? (
            <span className="rounded-full bg-[#A68147]/18 px-3 py-1.5">
              fallback
            </span>
          ) : null}
          {analysis._metadata.persistence ? (
            <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
              guardado
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <AnalysisInsights analysis={analysis} />

        <ResultBlock title="Resumen">
          <p className="text-sm font-medium leading-6 text-[#0F2044]/72">
            {analysis.resumen || "Sin resumen."}
          </p>
        </ResultBlock>

        <ResultBlock title="Causa">
          <TextList
            empty="Sin datos generales."
            items={analysis.causa.datos_generales}
          />
          <TextList
            empty="Sin hechos relevantes."
            items={analysis.causa.hechos_relevantes}
          />
        </ResultBlock>

        {analysis.categorias.length ? (
          <div className="flex flex-wrap gap-2">
            {analysis.categorias.map((category) => (
              <span
                className="rounded-full bg-[#F4F7F5] px-3 py-1.5 text-xs font-semibold"
                key={category}
              >
                {category}
              </span>
            ))}
          </div>
        ) : null}

        <ResultBlock title="Imputados">
          {analysis.imputados.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {analysis.imputados.map((defendant) => (
                <article
                  className="rounded-lg border border-[#84A2BD]/30 bg-white p-3"
                  key={defendant.nombre}
                >
                  <h4 className="font-semibold">{defendant.nombre}</h4>
                  <TextList
                    compact
                    empty="Sin datos asociados."
                    items={defendant.datos_asociados}
                  />
                  <TextList
                    compact
                    empty="Sin imputaciones detectadas."
                    items={defendant.imputaciones}
                  />
                  <TextList
                    compact
                    empty="Sin hechos vinculados."
                    items={defendant.hechos_vinculados}
                  />
                  <TextList
                    compact
                    empty="Sin documentos mencionados."
                    items={defendant.documentos_mencionados}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#0F2044]/58">
              Sin imputados detectados.
            </p>
          )}
        </ResultBlock>

        <ResultBlock title="Fechas">
          {analysis.fechas_relevantes.length ? (
            <div className="grid gap-2">
              {analysis.fechas_relevantes.map((date) => (
                <article
                  className="rounded-lg bg-white px-3 py-2"
                  key={`${date.fecha}-${date.evento}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{date.fecha}</h4>
                    <span className="rounded-full bg-[#F4F7F5] px-2 py-1 text-xs font-semibold">
                      {date.tipo}
                    </span>
                    {date.requiere_alerta ? (
                      <span className="rounded-full bg-[#A68147]/18 px-2 py-1 text-xs font-semibold">
                        alerta
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/62">
                    {date.evento}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#0F2044]/58">
              Sin fechas detectadas.
            </p>
          )}
        </ResultBlock>

        <ResultBlock title="Actuaciones y observaciones">
          <TextList
            empty="Sin actuaciones pendientes."
            items={analysis.actuaciones_pendientes}
          />
          <TextList empty="Sin observaciones." items={analysis.observaciones} />
        </ResultBlock>

        {analysis._metadata.source_file ||
        analysis._metadata.fallback_reason ||
        analysis._metadata.persistence ? (
          <ResultBlock title="Metadata">
            {analysis._metadata.source_file ? (
              <p className="text-sm font-medium text-[#0F2044]/62">
                {analysis._metadata.source_file.name} |{" "}
                {formatBytes(analysis._metadata.source_file.size_bytes)}
              </p>
            ) : null}
            {analysis._metadata.persistence ? (
              <p className="text-sm font-medium text-[#0F2044]/62">
                Analisis #{analysis._metadata.persistence.analysis_id} | documento #
                {analysis._metadata.persistence.document_id}
              </p>
            ) : null}
            {analysis._metadata.fallback_reason ? (
              <p className="text-sm font-medium leading-5 text-[#0F2044]/62">
                {analysis._metadata.fallback_reason}
              </p>
            ) : null}
          </ResultBlock>
        ) : null}
      </div>
    </section>
  );
}

function EmptyBlock({ title }: { title: string }) {
  return (
    <section className="h-24 rounded-lg bg-[#F4F7F5] p-4">
      <h3 className="font-semibold">{title}</h3>
    </section>
  );
}

function ResultBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-2 rounded-lg bg-[#F4F7F5] p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function AnalysisInsights({ analysis }: { analysis: Analysis }) {
  const alertDates = analysis.fechas_relevantes.filter(
    (date) => date.requiere_alerta,
  ).length;
  const facts = analysis.causa.hechos_relevantes.length;

  return (
    <section className="grid gap-3 md:grid-cols-4">
      <InsightCard label="Imputados" value={analysis.imputados.length} />
      <InsightCard label="Fechas" value={analysis.fechas_relevantes.length} />
      <InsightCard label="Alertas" value={alertDates} tone="alert" />
      <InsightCard label="Hechos" value={facts} />
    </section>
  );
}

function InsightCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "alert" | "default";
  value: number;
}) {
  return (
    <article
      className={`rounded-lg px-4 py-3 ${
        tone === "alert" ? "bg-[#A68147]/15" : "bg-[#F4F7F5]"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F2044]/48">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function TextList({
  compact = false,
  empty,
  items,
}: {
  compact?: boolean;
  empty: string;
  items: string[];
}) {
  if (!items.length) {
    return (
      <p
        className={`font-medium text-[#0F2044]/58 ${
          compact ? "mt-2 text-xs" : "text-sm"
        }`}
      >
        {empty}
      </p>
    );
  }

  return (
    <ul
      className={`grid gap-1.5 font-medium leading-5 text-[#0F2044]/68 ${
        compact ? "mt-2 text-xs" : "text-sm"
      }`}
    >
      {items.map((item) => (
        <li className="rounded-md bg-white px-3 py-2" key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function AlertMessage({ message }: { message: string }) {
  return (
    <p
      className="mt-4 rounded-lg border border-[#A68147]/45 bg-[#A68147]/12 px-4 py-3 text-sm font-semibold"
      role="alert"
    >
      {message}
    </p>
  );
}

function analyzeText(
  text: string,
  options: { caseId: number | null; mode: AnalysisMode; persist: boolean },
) {
  return fetch(`${apiUrl}/api/ia/analyze`, {
    body: JSON.stringify({
      case_id: options.caseId,
      mode: options.mode,
      persist: options.persist,
      text,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function analyzeFile(
  file: File,
  options: { caseId: number | null; mode: AnalysisMode; persist: boolean },
) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("mode", options.mode);
  formData.set("persist", String(options.persist));

  if (options.caseId) {
    formData.set("case_id", String(options.caseId));
  }

  return fetch(`${apiUrl}/api/ia/analyze-file`, {
    body: formData,
    method: "POST",
  });
}

function queryRag(caseId: number, question: string) {
  return fetch(`${apiUrl}/api/ia/rag/query`, {
    body: JSON.stringify({
      case_id: caseId,
      question,
      top_k: 5,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parsePositiveInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la accion.";
}
