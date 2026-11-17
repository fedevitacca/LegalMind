"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type InputMode = "text" | "file";

type AnalysisDate = {
  evento: string;
  fecha: string;
  fecha_normalizada?: string | null;
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

type LegalEntity = {
  caratula?: string | null;
  descripcion?: string;
  detalle?: string;
  fecha?: string;
  identificador?: string | null;
  nombre?: string;
  tipo?: string;
};

type GraphRelation = {
  destino: string;
  evidencia: string;
  origen: string;
  tipo: string;
};

type RagFragment = {
  categorias: string[];
  entidades: string[];
  id: string;
  orden: number;
  relevancia_base: number;
  texto: string;
  tokens_estimados: number;
};

type SmartAlert = {
  descripcion: string;
  fecha: string | null;
  prioridad: string;
  tipo: string;
  titulo: string;
};

type SourceFile = {
  mime_type: string;
  name: string;
  size_bytes: number;
};

type Persistence = {
  analisis_ia_id?: number;
  analysis_id?: number;
  document_id?: number | null;
  error?: string;
  persisted?: boolean;
};

type Analysis = {
  actuaciones_pendientes: string[];
  alertas: SmartAlert[];
  analisis_estrategico: {
    cronologia: { evento: string; fecha: string; fecha_normalizada: string; tipo: string }[];
    inconsistencias: { descripcion: string; evidencia: string[]; severidad: string; tipo: string }[];
    omisiones_posibles: string[];
    puntos_revision: { descripcion: string; prioridad: string; tipo: string }[];
  };
  categorias: string[];
  causa: {
    datos_generales: string[];
    hechos_relevantes: string[];
  };
  entidades_juridicas: {
    actuaciones: LegalEntity[];
    causas: LegalEntity[];
    delitos: LegalEntity[];
    documentos: LegalEntity[];
    fechas: LegalEntity[];
    imputados: LegalEntity[];
    organismos: LegalEntity[];
    victimas: LegalEntity[];
  };
  fechas_relevantes: AnalysisDate[];
  grafo_conocimiento: {
    nodos: LegalEntity[];
    relaciones: GraphRelation[];
  };
  imputados: Defendant[];
  nivel_confianza: string;
  observaciones: string[];
  rag_juridico: {
    consultas_sugeridas: string[];
    fragmentos: RagFragment[];
    indice_vectorial: {
      dimensiones: number;
      fragmentos_indexados: number;
      persistencia: string;
      proveedor: string;
    };
  };
  resumen: string;
  scoring_confianza: {
    factores: string[];
    nivel: string;
    puntaje: number;
    requiere_revision: boolean;
  };
  tipo_documento: string;
  _metadata: {
    engine: "local";
    model?: string;
    persistence?: Persistence;
    source_file?: SourceFile;
  };
};

type Health = {
  local_ai_base_url: string;
  local_ai_configured: boolean;
  local_ai_model: string;
  module: string;
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

export default function AnalizadorIA() {
  const [health, setHealth] = useState<Health>();
  const [healthError, setHealthError] = useState("");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [casesError, setCasesError] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [texto, setText] = useState(sampleText);
  const [archivo, setFile] = useState<File>();
  const [persist, setPersist] = useState(false);
  const [idExpediente, setCaseId] = useState("");
  const [analisis, setAnalysis] = useState<Analysis>();
  const [documentos, setDocuments] = useState<StoredDocument[]>([]);
  const [documentsError, setDocumentsError] = useState("");
  const [pregunta, setQuestion] = useState("Que audiencia o vencimiento esta pendiente?");
  const [ragResult, setRagResult] = useState<RagResult>();
  const [ragError, setRagError] = useState("");
  const [error, cambiarError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRagLoading, setIsRagLoading] = useState(false);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);

  const selectedCaseId = useMemo(() => leerEnteroPositivo(idExpediente), [idExpediente]);

  useEffect(() => {
    const controlador = new AbortController();

    async function loadInitialData() {
      const [healthResult, casesResult] = await Promise.allSettled([
        consultarEstadoDeIA(controlador),
        cargarExpedientes(controlador),
      ]);

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else if (!controlador.signal.aborted) {
        setHealthError(obtenerMensajeDeError(healthResult.reason));
      }

      if (casesResult.status === "fulfilled") {
        setCases(casesResult.value);
      } else if (!controlador.signal.aborted) {
        setCasesError("Las causas reales no estan disponibles. Se puede ingresar el ID manualmente.");
      }
    }

    loadInitialData();

    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      cargarDocumentos(selectedCaseId);
    }
  }, [selectedCaseId]);

  async function enviarAnalisis(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    cambiarError("");
    setAnalysis(undefined);

    if (inputMode === "text" && !texto.trim()) {
      cambiarError("Ingresa texto para analizar.");
      return;
    }

    if (inputMode === "file" && !archivo) {
      cambiarError("Selecciona un archivo TXT.");
      return;
    }

    if (persist && !selectedCaseId) {
      cambiarError("Para guardar el analisis, ingresa el ID numerico de una causa.");
      return;
    }

    setIsLoading(true);

    try {
      const respuesta =
        inputMode === "file"
          ? await analizarArchivo(archivo as File, { caseId: selectedCaseId, persist })
          : await analizarTexto(texto, { caseId: selectedCaseId, persist });
      const cuerpo = (await respuesta.json()) as Analysis & {
        details?: string;
        error?: string;
      };

      if (!respuesta.ok) {
        throw new Error([cuerpo.error, cuerpo.details].filter(Boolean).join(" "));
      }

      setAnalysis(cuerpo);

      if (cuerpo._metadata.persistence?.persisted && selectedCaseId) {
        await cargarDocumentos(selectedCaseId);
      }
    } catch (analysisError) {
      cambiarError(obtenerMensajeDeError(analysisError));
    } finally {
      setIsLoading(false);
    }
  }

  async function enviarConsultaRag(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setRagError("");
    setRagResult(undefined);

    if (!selectedCaseId) {
      setRagError("Ingresa el ID numerico de una causa.");
      return;
    }

    if (!pregunta.trim()) {
      setRagError("Ingresa una pregunta para consultar la causa.");
      return;
    }

    setIsRagLoading(true);

    try {
      const respuesta = await consultarRag(selectedCaseId, pregunta);
      const cuerpo = (await respuesta.json()) as RagResult & {
        details?: string;
        error?: string;
      };

      if (!respuesta.ok) {
        throw new Error([cuerpo.error, cuerpo.details].filter(Boolean).join(" "));
      }

      setRagResult(cuerpo);
    } catch (ragQueryError) {
      setRagError(obtenerMensajeDeError(ragQueryError));
    } finally {
      setIsRagLoading(false);
    }
  }

  async function cargarDocumentos(id: number) {
    setDocumentsError("");
    setIsDocumentsLoading(true);

    try {
      const respuesta = await fetch(`${apiUrl}/api/ia/cases/${id}/documents`);
      const cuerpo = (await respuesta.json()) as {
        details?: string;
        documents?: StoredDocument[];
        error?: string;
      };

      if (!respuesta.ok) {
        throw new Error([cuerpo.error, cuerpo.details].filter(Boolean).join(" "));
      }

      setDocuments(cuerpo.documents || []);
    } catch (loadError) {
      setDocuments([]);
      setDocumentsError(obtenerMensajeDeError(loadError));
    } finally {
      setIsDocumentsLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 @min-[1280px]:grid-cols-[minmax(360px,0.88fr)_minmax(0,1.12fr)]">
        <form
          className="flex min-h-[680px] flex-col rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]"
          onSubmit={enviarAnalisis}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#84A2BD]/28 pb-4">
            <div>
              <h2 className="text-xl font-semibold">Entrada</h2>
              <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
                Backend: {apiUrl}
              </p>
            </div>
            <IndicadorDeEstado error={healthError} health={health} />
          </div>

          <div className="mt-5 grid gap-4">
            <fieldset>
              <legend className="text-sm font-semibold">Origen</legend>
              <div className="mt-2 grid grid-cols-2 rounded-lg bg-[#F4F7F5] p-1">
                <BotonDeModo
                  active={inputMode === "text"}
                  label="Texto"
                  onClick={() => setInputMode("text")}
                />
                <BotonDeModo
                  active={inputMode === "file"}
                  label="Archivo TXT"
                  onClick={() => setInputMode("file")}
                />
              </div>
            </fieldset>

            <ControlesDelExpediente
              caseId={idExpediente}
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
                onChange={(evento) => setText(evento.target.value)}
                value={texto}
              />
            </label>
          ) : (
            <label className="mt-5 grid min-h-[320px] place-items-center rounded-lg border border-dashed border-[#546FC0]/55 bg-[#F4F7F5] p-5 text-center transition focus-within:border-[#546FC0] focus-within:bg-white">
              <span>
                <span className="block text-base font-semibold">
                  {archivo?.name || "Seleccionar TXT"}
                </span>
                <span className="mt-2 block text-sm font-medium text-[#0F2044]/58">
                  {archivo ? formatearBytes(archivo.size) : "Hasta 5 MB"}
                </span>
              </span>
              <input
                accept=".txt,text/plain"
                className="sr-only"
                onChange={(evento) => setFile(evento.target.files?.[0])}
                type="file"
              />
            </label>
          )}

          {error ? <MensajeDeAlerta message={error} /> : null}

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

        <ResultadoDelAnalisis analysis={analisis} />
      </div>

      <EspacioDelExpediente
        caseId={selectedCaseId}
        documents={selectedCaseId ? documentos : []}
        documentsError={selectedCaseId ? documentsError : ""}
        isDocumentsLoading={isDocumentsLoading}
        isRagLoading={isRagLoading}
        onQuestionChange={setQuestion}
        onRefreshDocuments={() => selectedCaseId && cargarDocumentos(selectedCaseId)}
        onSubmit={enviarConsultaRag}
        question={pregunta}
        ragError={ragError}
        ragResult={selectedCaseId ? ragResult : undefined}
      />
    </div>
  );
}

function ControlesDelExpediente({
  caseId: idExpediente,
  cases,
  casesError,
  onCaseIdChange,
  onPersistChange,
  persist,
}: {
  caseId: string;
  cases: CaseOption[];
  casesError: string;
  onCaseIdChange: (valor: string) => void;
  onPersistChange: (valor: boolean) => void;
  persist: boolean;
}) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4">
      <div className="flex items-start gap-3">
        <input
          checked={persist}
          className="mt-1 h-4 w-4 accent-[#546FC0]"
          id="guardar-analisis"
          onChange={(evento) => onPersistChange(evento.target.checked)}
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
          onChange={(evento) => onCaseIdChange(evento.target.value)}
          placeholder="Ejemplo: 1"
          value={idExpediente}
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

function EspacioDelExpediente({
  caseId: idExpediente,
  documents: documentos,
  documentsError,
  isDocumentsLoading,
  isRagLoading,
  onQuestionChange,
  onRefreshDocuments,
  onSubmit,
  question: pregunta,
  ragError,
  ragResult,
}: {
  caseId: number | null;
  documents: StoredDocument[];
  documentsError: string;
  isDocumentsLoading: boolean;
  isRagLoading: boolean;
  onQuestionChange: (valor: string) => void;
  onRefreshDocuments: () => void;
  onSubmit: (evento: FormEvent<HTMLFormElement>) => void;
  question: string;
  ragError: string;
  ragResult?: RagResult;
}) {
  return (
    <section className="grid gap-5 rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)] @min-[1280px]:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#84A2BD]/28 pb-4">
          <div>
            <h2 className="text-xl font-semibold">Documentos guardados</h2>
            <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
              {idExpediente ? `Causa ${idExpediente}` : "Selecciona una causa"}
            </p>
          </div>
          <button
            className="rounded-full bg-[#F4F7F5] px-4 py-2 text-sm font-semibold transition hover:bg-[#84A2BD]/22 disabled:cursor-not-allowed disabled:text-[#0F2044]/38"
            disabled={!idExpediente || isDocumentsLoading}
            onClick={onRefreshDocuments}
            type="button"
          >
            {isDocumentsLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {documentsError ? <MensajeDeAlerta message={documentsError} /> : null}
          {!idExpediente ? <BloqueVacio title="Sin causa seleccionada" /> : null}
          {idExpediente && !documentsError && !documentos.length ? (
            <BloqueVacio title="Sin documentos guardados" />
          ) : null}
          {documentos.map((documento) => (
            <article
              className="rounded-lg border border-[#84A2BD]/30 bg-[#F4F7F5] p-4"
              key={documento.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{documento.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[#0F2044]/58">
                    {documento.status} | {documento.type || "texto"}
                  </p>
                </div>
                {documento.size_bytes ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold">
                    {formatearBytes(documento.size_bytes)}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="border-b border-[#84A2BD]/28 pb-4">
          <h2 className="text-xl font-semibold">Consulta RAG con Ollama</h2>
          <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
            Responde usando documentos guardados de la causa.
          </p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Pregunta</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-none rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 py-3 text-sm font-medium leading-6 outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
            onChange={(evento) => onQuestionChange(evento.target.value)}
            value={pregunta}
          />
        </label>

        {ragError ? <MensajeDeAlerta message={ragError} /> : null}

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
            <BloqueDeResultados title={`Respuesta | confianza ${ragResult.confidence}`}>
              <p className="text-sm font-medium leading-6 text-[#0F2044]/72">
                {ragResult.answer}
              </p>
            </BloqueDeResultados>
            <BloqueDeResultados title="Fragmentos usados">
              {ragResult.retrieved_chunks.length ? (
                <div className="grid gap-2">
                  {ragResult.retrieved_chunks.map((fragmento) => (
                    <article
                      className="rounded-lg bg-white px-3 py-2"
                      key={`${fragmento.document_id}-${fragmento.chunk_index}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{fragmento.document_name}</h4>
                        <span className="rounded-full bg-[#F4F7F5] px-2 py-1 text-xs font-semibold">
                          {fragmento.score.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/62">
                        {fragmento.text}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-[#0F2044]/58">
                  Sin fragmentos recuperados.
                </p>
              )}
            </BloqueDeResultados>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function IndicadorDeEstado({ error, health }: { error: string; health?: Health }) {
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
      {health.local_ai_configured ? health.local_ai_model : "Configurar API local"}
    </span>
  );
}

function BotonDeModo({
  active: activo,
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
        activo
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

function ResultadoDelAnalisis({ analysis: analisis }: { analysis?: Analysis }) {
  if (!analisis) {
    return (
      <section className="min-h-[680px] rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <h2 className="text-xl font-semibold">Resultado</h2>
        <div className="mt-5 grid gap-3">
          <BloqueVacio title="Resumen" />
          <BloqueVacio title="Causa" />
          <BloqueVacio title="Imputados" />
          <BloqueVacio title="Fechas y actuaciones" />
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
            {analisis.tipo_documento} | confianza {analisis.nivel_confianza}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-[#84A2BD]/22 px-3 py-1.5">
            {analisis._metadata.engine}
          </span>
          {analisis._metadata.persistence ? (
            <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
              {analisis._metadata.persistence.persisted ? "guardado" : "sin guardar"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <HallazgosDelAnalisis analysis={analisis} />

        <BloqueDeResultados title="Resumen">
          <p className="text-sm font-medium leading-6 text-[#0F2044]/72">
            {analisis.resumen || "Sin resumen."}
          </p>
        </BloqueDeResultados>

        <BloqueDeResultados title="Causa">
          <ListaDeTexto empty="Sin datos generales." items={analisis.causa.datos_generales} />
          <ListaDeTexto empty="Sin hechos relevantes." items={analisis.causa.hechos_relevantes} />
        </BloqueDeResultados>

        <BloqueDeResultados title="Imputados">
          {analisis.imputados.length ? (
            <div className="grid gap-3 @min-[768px]:grid-cols-2">
              {analisis.imputados.map((defendant) => (
                <article
                  className="rounded-lg border border-[#84A2BD]/30 bg-white p-3"
                  key={defendant.nombre}
                >
                  <h4 className="font-semibold">{defendant.nombre}</h4>
                  <ListaDeTexto compact empty="Sin datos asociados." items={defendant.datos_asociados} />
                  <ListaDeTexto compact empty="Sin imputaciones detectadas." items={defendant.imputaciones} />
                  <ListaDeTexto compact empty="Sin hechos vinculados." items={defendant.hechos_vinculados} />
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#0F2044]/58">Sin imputados detectados.</p>
          )}
        </BloqueDeResultados>

        <BloqueDeResultados title="Fechas">
          {analisis.fechas_relevantes.length ? (
            <div className="grid gap-2">
              {analisis.fechas_relevantes.map((date) => (
                <article className="rounded-lg bg-white px-3 py-2" key={`${date.fecha}-${date.evento}`}>
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
            <p className="text-sm font-medium text-[#0F2044]/58">Sin fechas detectadas.</p>
          )}
        </BloqueDeResultados>

        <BloqueDeResultados title="Alertas inteligentes">
          <ListaDeTexto
            empty="Sin alertas generadas."
            items={analisis.alertas.map((alert) => `${alert.prioridad}: ${alert.titulo} - ${alert.descripcion}`)}
          />
        </BloqueDeResultados>

        <BloqueDeResultados title="Analisis estrategico">
          <ListaDeTexto
            empty="Sin puntos de revision."
            items={analisis.analisis_estrategico.puntos_revision.map(
              (point) => `${point.prioridad}: ${point.descripcion}`,
            )}
          />
          <ListaDeTexto
            empty="Sin inconsistencias detectadas."
            items={analisis.analisis_estrategico.inconsistencias.map(
              (elemento) => `${elemento.severidad}: ${elemento.descripcion}`,
            )}
          />
          <ListaDeTexto empty="Sin omisiones posibles." items={analisis.analisis_estrategico.omisiones_posibles} />
        </BloqueDeResultados>

        <BloqueDeResultados title="Base juridica y grafo">
          <ListaDeTexto empty="Sin entidades estructuradas." items={resumirEntidades(analisis)} />
          <ListaDeTexto
            empty="Sin relaciones detectadas."
            items={analisis.grafo_conocimiento.relaciones
              .slice(0, 8)
              .map((relation) => `${relation.tipo}: ${relation.origen} -> ${relation.destino}`)}
          />
        </BloqueDeResultados>

        <BloqueDeResultados title="RAG juridico">
          <p className="text-sm font-medium leading-6 text-[#0F2044]/62">
            {analisis.rag_juridico.indice_vectorial.proveedor} |{" "}
            {analisis.rag_juridico.indice_vectorial.fragmentos_indexados} fragmentos
          </p>
          <ListaDeTexto
            empty="Sin fragmentos recuperables."
            items={analisis.rag_juridico.fragmentos
              .slice(0, 5)
              .map((fragmento) => `${fragmento.id}: ${fragmento.texto.slice(0, 180)}`)}
          />
          <ListaDeTexto empty="Sin consultas sugeridas." items={analisis.rag_juridico.consultas_sugeridas} />
        </BloqueDeResultados>

        <BloqueDeResultados title="Actuaciones y observaciones">
          <ListaDeTexto empty="Sin actuaciones pendientes." items={analisis.actuaciones_pendientes} />
          <ListaDeTexto empty="Sin observaciones." items={analisis.observaciones} />
        </BloqueDeResultados>

        {analisis._metadata.source_file || analisis._metadata.persistence ? (
          <BloqueDeResultados title="Metadata">
            {analisis._metadata.source_file ? (
              <p className="text-sm font-medium text-[#0F2044]/62">
                {analisis._metadata.source_file.name} | {formatearBytes(analisis._metadata.source_file.size_bytes)}
              </p>
            ) : null}
            {analisis._metadata.persistence ? (
              <p className="text-sm font-medium text-[#0F2044]/62">
                Analisis #{analisis._metadata.persistence.analysis_id ?? analisis._metadata.persistence.analisis_ia_id ?? "-"} | documento #
                {analisis._metadata.persistence.document_id ?? "-"}
                {analisis._metadata.persistence.error ? ` | ${analisis._metadata.persistence.error}` : ""}
              </p>
            ) : null}
          </BloqueDeResultados>
        ) : null}
      </div>
    </section>
  );
}

function BloqueVacio({ title: titulo }: { title: string }) {
  return (
    <section className="h-24 rounded-lg bg-[#F4F7F5] p-4">
      <h3 className="font-semibold">{titulo}</h3>
    </section>
  );
}

function BloqueDeResultados({ children, title: titulo }: { children: React.ReactNode; title: string }) {
  return (
    <section className="grid gap-2 rounded-lg bg-[#F4F7F5] p-4">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

function HallazgosDelAnalisis({ analysis: analisis }: { analysis: Analysis }) {
  return (
    <section className="grid gap-3 @min-[768px]:grid-cols-4">
      <TarjetaDeHallazgo label="Imputados" value={analisis.imputados.length} />
      <TarjetaDeHallazgo label="Fechas" value={analisis.fechas_relevantes.length} />
      <TarjetaDeHallazgo label="Alertas" value={analisis.alertas.length} tone="alert" />
      <TarjetaDeHallazgo label="Grafo" value={analisis.grafo_conocimiento.relaciones.length} />
    </section>
  );
}

function TarjetaDeHallazgo({
  label,
  tone = "default",
  value: valor,
}: {
  label: string;
  tone?: "alert" | "default";
  value: number;
}) {
  return (
    <article className={`rounded-lg px-4 py-3 ${tone === "alert" ? "bg-[#A68147]/15" : "bg-[#F4F7F5]"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F2044]/48">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </article>
  );
}

function ListaDeTexto({
  compact = false,
  empty,
  items: elementos,
}: {
  compact?: boolean;
  empty: string;
  items: string[];
}) {
  if (!elementos.length) {
    return <p className={`font-medium text-[#0F2044]/58 ${compact ? "mt-2 text-xs" : "text-sm"}`}>{empty}</p>;
  }

  return (
    <ul className={`grid gap-1.5 font-medium leading-5 text-[#0F2044]/68 ${compact ? "mt-2 text-xs" : "text-sm"}`}>
      {elementos.map((elemento) => (
        <li className="rounded-md bg-white px-3 py-2" key={elemento}>
          {elemento}
        </li>
      ))}
    </ul>
  );
}

function MensajeDeAlerta({ message: mensaje }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-[#A68147]/45 bg-[#A68147]/12 px-4 py-3 text-sm font-semibold" role="alert">
      {mensaje}
    </p>
  );
}

function resumirEntidades(analisis: Analysis) {
  const entities = analisis.entidades_juridicas;

  return [
    `Causas: ${entities.causas.length}`,
    `Imputados: ${entities.imputados.length}`,
    `Victimas/damnificados: ${entities.victimas.length}`,
    `Delitos: ${entities.delitos.length}`,
    `Organismos: ${entities.organismos.length}`,
    `Documentos: ${entities.documentos.length}`,
    `Fechas: ${entities.fechas.length}`,
    `Actuaciones: ${entities.actuaciones.length}`,
  ];
}

async function consultarEstadoDeIA(controlador: AbortController) {
  const respuesta = await fetch(`${apiUrl}/api/ia/health`, { signal: controlador.signal });
  const cuerpo = (await respuesta.json()) as Health;

  if (!respuesta.ok) {
    throw new Error("No se pudo consultar el backend de IA.");
  }

  return cuerpo;
}

async function cargarExpedientes(controlador: AbortController) {
  const respuesta = await fetch(`${apiUrl}/api/casos`, { signal: controlador.signal });
  const cuerpo = (await respuesta.json()) as {
    cases?: CaseOption[];
    details?: string;
    error?: string;
  };

  if (!respuesta.ok) {
    throw new Error([cuerpo.error, cuerpo.details].filter(Boolean).join(" "));
  }

  return cuerpo.cases || [];
}

function analizarTexto(texto: string, opciones: { caseId: number | null; persist: boolean }) {
  return fetch(`${apiUrl}/api/ia/analyze`, {
    body: JSON.stringify({
      case_id: opciones.caseId,
      persist: opciones.persist,
      text: texto,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function analizarArchivo(archivo: File, opciones: { caseId: number | null; persist: boolean }) {
  const formData = new FormData();
  formData.set("file", archivo);
  formData.set("persist", String(opciones.persist));

  if (opciones.caseId) {
    formData.set("case_id", String(opciones.caseId));
  }

  return fetch(`${apiUrl}/api/ia/analyze-file`, {
    body: formData,
    method: "POST",
  });
}

function consultarRag(idExpediente: number, pregunta: string) {
  return fetch(`${apiUrl}/api/ia/rag/query`, {
    body: JSON.stringify({ case_id: idExpediente, question: pregunta, top_k: 5 }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function formatearBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function leerEnteroPositivo(valor: string) {
  const number = Number(valor);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function obtenerMensajeDeError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la accion.";
}
