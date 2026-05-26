"use client";

import { FormEvent, useEffect, useState } from "react";

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
    source_file?: SourceFile;
  };
};

type Health = {
  module: string;
  openai_configured: boolean;
  openai_model: string;
  status: string;
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
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [mode, setMode] = useState<AnalysisMode>("auto");
  const [text, setText] = useState(sampleText);
  const [file, setFile] = useState<File>();
  const [analysis, setAnalysis] = useState<Analysis>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch(`${apiUrl}/api/ia/health`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as Health;

        if (!response.ok) {
          throw new Error("No se pudo consultar el backend de IA.");
        }

        setHealth(body);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setHealthError(getErrorMessage(loadError));
        }
      }
    }

    loadHealth();

    return () => controller.abort();
  }, []);

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

    setIsLoading(true);

    try {
      const response =
        inputMode === "file"
          ? await analyzeFile(file as File, mode)
          : await analyzeText(text, mode);
      const body = (await response.json()) as Analysis & {
        details?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error([body.error, body.details].filter(Boolean).join(" "));
      }

      setAnalysis(body);
    } catch (analysisError) {
      setError(getErrorMessage(analysisError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.88fr)_minmax(0,1.12fr)]">
      <form
        className="flex min-h-[620px] flex-col rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]"
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

        {error ? (
          <p
            className="mt-4 rounded-lg border border-[#A68147]/45 bg-[#A68147]/12 px-4 py-3 text-sm font-semibold"
            role="alert"
          >
            {error}
          </p>
        ) : null}

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
            {isLoading ? "Analizando..." : "Analizar"}
          </button>
        </div>
      </form>

      <AnalysisResult analysis={analysis} />
    </div>
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
      <section className="min-h-[620px] rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
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
    <section className="min-h-[620px] rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
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

        {analysis._metadata.source_file || analysis._metadata.fallback_reason ? (
          <ResultBlock title="Metadata">
            {analysis._metadata.source_file ? (
              <p className="text-sm font-medium text-[#0F2044]/62">
                {analysis._metadata.source_file.name} |{" "}
                {formatBytes(analysis._metadata.source_file.size_bytes)}
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

function analyzeText(text: string, mode: AnalysisMode) {
  return fetch(`${apiUrl}/api/ia/analyze`, {
    body: JSON.stringify({ mode, text }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function analyzeFile(file: File, mode: AnalysisMode) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("mode", mode);

  return fetch(`${apiUrl}/api/ia/analyze-file`, {
    body: formData,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo analizar.";
}
