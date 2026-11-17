"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NavegacionAreasCaso from "../casos/NavegacionAreasCaso";

type Cita = {
  citation_id: string;
  document_name: string;
  document_url?: string | null;
  location_label: string;
  score: number;
  source_type: string;
  text: string;
};
type FormatoRespuesta = "text" | "table";
type TablaRespuesta = { columns: string[]; rows: string[][]; caption?: string };
type Mensaje = {
  id: number;
  role: "usuario" | "asistente";
  content: string;
  citations?: Cita[];
  metadata?: { suggested_questions?: string[]; limitations?: string[]; evidence?: { status?: string }; response_table?: TablaRespuesta };
  tool_id?: string | null;
  created_at?: string;
};
type Conversacion = {
  id: number;
  title: string;
  messages_count?: number;
  last_message?: string | null;
  updated_at?: string;
};
type OpcionHerramienta = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  comparison?: "documents" | "defendants" | "jurisprudence";
};
type ElementoSeleccionable = { id: number; label: string };
type ContextoExpediente = {
  documents: ElementoSeleccionable[];
  defendants: ElementoSeleccionable[];
  jurisprudence: ElementoSeleccionable[];
};

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const herramientas: OpcionHerramienta[] = [
  { id: "", label: "Pregunta libre", description: "Consultá el expediente o elegí un análisis específico.", prompt: "" },
  { id: "resumen_expediente", label: "Resumir expediente", description: "Revisá qué pasó, el estado del caso y el próximo paso.", prompt: "Prepará un resumen actualizado del expediente." },
  { id: "cronologia", label: "Fechas y vencimientos", description: "Ordená las actuaciones y ubicá los próximos plazos.", prompt: "Ordená la cronología, los plazos y los próximos vencimientos." },
  { id: "teoria_del_caso", label: "Teoría del caso", description: "Explorá una hipótesis a partir de la evidencia disponible.", prompt: "Prepará una teoría provisional del caso basada en la prueba disponible." },
  { id: "comparar_documentos", label: "Comparar documentos", description: "Detectá coincidencias y diferencias entre dos documentos.", prompt: "Compará los dos documentos seleccionados y señalá coincidencias, diferencias y contradicciones.", comparison: "documents" },
  { id: "comparar_imputados", label: "Comparar imputados", description: "Contrastá lo que consta en dos fichas del expediente.", prompt: "Compará las dos personas seleccionadas, su vinculación y la evidencia disponible.", comparison: "defendants" },
  { id: "comparar_jurisprudencia", label: "Comparar fallos", description: "Revisá los criterios de dos fallos y su relación con el caso.", prompt: "Compará los dos fallos seleccionados y explicá su utilidad para este expediente.", comparison: "jurisprudence" },
];
const ejemplos = [
  "¿Cuál es el estado actual del expediente?",
  "¿Qué hechos están respaldados por los documentos?",
  "¿Qué fechas o vencimientos requieren atención?",
];

async function solicitarApi(path: string, opciones?: RequestInit) {
  const respuesta = await fetch(`${apiUrl}${path}`, { credentials: "include",
    headers: { "Content-Type": "application/json", ...(opciones?.headers || {}) }, ...opciones });
  if (respuesta.status === 204) return null;
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const requestId = cuerpo.request_id || respuesta.headers.get("X-Request-Id");
    throw new Error(`${cuerpo.error || "No se pudo completar la operación."}${requestId ? ` Referencia: ${requestId}` : ""}`);
  }
  return cuerpo;
}

export default function ChatExpediente({ caseId: idExpediente, caseName: nombreExpediente, embedded: integrado = false }: { caseId: string; caseName: string; embedded?: boolean }) {
  const [conversaciones, cambiarConversaciones] = useState<Conversacion[]>([]);
  const [idConversacion, cambiarIdConversacion] = useState<number | null>(null);
  const [mensajes, cambiarMensajes] = useState<Mensaje[]>([]);
  const [contenido, cambiarContenido] = useState("");
  const [idHerramienta, cambiarIdHerramienta] = useState("");
  const [formatoRespuesta, cambiarFormatoRespuesta] = useState<FormatoRespuesta>("text");
  const [contextoExpediente, cambiarContextoExpediente] = useState<ContextoExpediente>({ documents: [], defendants: [], jurisprudence: [] });
  const [parElegido, cambiarParElegido] = useState<[string, string]>(["", ""]);
  const [errorDeContexto, cambiarErrorDeContexto] = useState("");
  const [cargando, cambiarCarga] = useState(true);
  const [enviando, cambiarEnvio] = useState(false);
  const [error, cambiarError] = useState("");
  const referenciaFinal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;
    cambiarCarga(true); cambiarError("");
    void solicitarApi(`/api/ia/cases/${idExpediente}/chats`).then(async (cuerpo) => {
      const siguiente = cuerpo.conversations || [];
      if (!activo) return;
      cambiarConversaciones(siguiente);
      if (siguiente[0]) {
        const detalle = await solicitarApi(`/api/ia/cases/${idExpediente}/chats/${siguiente[0].id}`);
        if (activo) { cambiarIdConversacion(siguiente[0].id); cambiarMensajes(detalle.conversation.messages || []); }
      }
    }).catch((cause) => { if (activo) cambiarError(cause instanceof Error ? cause.message : "No se pudo abrir el chat."); })
      .finally(() => { if (activo) cambiarCarga(false); });
    return () => { activo = false; };
  }, [idExpediente]);
  useEffect(() => {
    let activo = true;
    cambiarErrorDeContexto("");
    void solicitarApi(`/api/casos/${idExpediente}`).then((cuerpo) => {
      if (!activo) return;
      const legalCase = cuerpo.case || {};
      cambiarContextoExpediente({
        documents: (legalCase.documentos || []).map((elemento: { id: number; nombre?: string }) => ({ id: elemento.id, label: elemento.nombre || `Documento ${elemento.id}` })),
        defendants: (legalCase.defendants || []).map((elemento: { id: number; name?: string }) => ({ id: elemento.id, label: elemento.name || `Imputado ${elemento.id}` })),
        jurisprudence: (legalCase.jurisprudencia || []).map((elemento: { id: number; titulo?: string; anio?: string }) => ({ id: elemento.id, label: `${elemento.titulo || `Fallo ${elemento.id}`}${elemento.anio ? ` · ${elemento.anio}` : ""}` })),
      });
    }).catch((cause) => {
      if (activo) cambiarErrorDeContexto(cause instanceof Error ? cause.message : "No se pudieron cargar las opciones de las herramientas.");
    });
    return () => { activo = false; };
  }, [idExpediente]);
  useEffect(() => { referenciaFinal.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes, enviando]);

  async function abrirConversacion(id: number) {
    cambiarIdConversacion(id); cambiarError("");
    try {
      const cuerpo = await solicitarApi(`/api/ia/cases/${idExpediente}/chats/${id}`);
      cambiarMensajes(cuerpo.conversation.messages || []);
    } catch (cause) { cambiarError(cause instanceof Error ? cause.message : "No se pudo abrir la conversación."); }
  }

  function iniciarConversacionNueva() { cambiarIdConversacion(null); cambiarMensajes([]); cambiarContenido(""); cambiarIdHerramienta(""); cambiarFormatoRespuesta("text"); cambiarParElegido(["", ""]); cambiarError(""); }

  async function asegurarConversacion() {
    if (idConversacion) return idConversacion;
    const cuerpo = await solicitarApi(`/api/ia/cases/${idExpediente}/chats`, { method: "POST", body: JSON.stringify({}) });
    const creada = cuerpo.conversation as Conversacion;
    cambiarIdConversacion(creada.id);
    cambiarConversaciones((actual) => [creada, ...actual]);
    return creada.id;
  }

  async function enviarMensaje(valor = contenido) {
    const herramientaElegida = herramientas.find((elemento) => elemento.id === idHerramienta);
    const limpio = (valor.trim() || herramientaElegida?.prompt || "").trim();
    if (!limpio || enviando) return;
    if (herramientaElegida?.comparison && !esParValido(parElegido)) {
      cambiarError("Seleccioná dos opciones distintas para usar esta herramienta.");
      return;
    }
    cambiarEnvio(true); cambiarError(""); cambiarContenido("");
    const idTemporal = -Date.now();
    cambiarMensajes((actual) => [...actual, { id: idTemporal, role: "usuario", content: limpio }]);
    try {
      const id = await asegurarConversacion();
      const cuerpo = await solicitarApi(`/api/ia/cases/${idExpediente}/chats/${id}/messages`, {
        method: "POST", body: JSON.stringify({ content: limpio, tool_id: idHerramienta || null, response_format: formatoRespuesta,
          tool_parameters: prepararParametrosDeHerramienta(herramientaElegida, parElegido) }),
      });
      cambiarMensajes((actual) => [...actual.filter((elemento) => elemento.id !== idTemporal), cuerpo.user_message, cuerpo.assistant_message]);
      cambiarConversaciones((actual) => actual.map((elemento) => elemento.id === id
        ? { ...elemento, title: cuerpo.title, messages_count: (elemento.messages_count || 0) + 2, last_message: cuerpo.assistant_message.content }
        : elemento).sort((izquierda, derecha) => izquierda.id === id ? -1 : derecha.id === id ? 1 : 0));
    } catch (cause) {
      cambiarMensajes((actual) => actual.filter((elemento) => elemento.id !== idTemporal));
      cambiarContenido(limpio);
      cambiarError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje.");
    } finally { cambiarEnvio(false); }
  }

  const herramientaElegida = herramientas.find((elemento) => elemento.id === idHerramienta) || herramientas[0];
  const opcionesComparacion = herramientaElegida.comparison ? contextoExpediente[herramientaElegida.comparison] : [];
  const comparacionLista = !herramientaElegida.comparison || esParValido(parElegido);
  const puedeEnviar = !enviando && comparacionLista && Boolean(contenido.trim() || herramientaElegida.id);

  return (
    <section className={`case-chat flex h-full min-h-0 flex-col bg-[#F4F7F5] text-[#0F2044] ${integrado ? "overflow-hidden rounded-[23px] border-2 border-[#88A9C8]" : ""}`}>
      <header className="chat-header border-b-2 border-[#88A9C8] bg-white px-6 py-4">
        {!integrado && <NavegacionAreasCaso activeArea="Chat" caseSlug={idExpediente} />}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#546FC0]">Consulta y herramientas</p>
            <h1 className="mt-1 text-2xl font-semibold">{nombreExpediente}</h1></div>
        </div>
      </header>

      <div className="chat-layout grid min-h-0 flex-1 @min-[1024px]:grid-cols-[285px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-r border-[#88A9C8]/55 bg-white p-4">
          <button type="button" onClick={iniciarConversacionNueva} className="w-full rounded-xl bg-[#0F2044] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1C3768]">+ Nueva conversación</button>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[.12em] text-[#0F2044]/45">Historial</p>
          <div className="space-y-2">
            {cargando ? <p className="text-sm text-[#0F2044]/55">Cargando…</p> : conversaciones.map((elemento) => (
              <button type="button" key={elemento.id} onClick={() => void abrirConversacion(elemento.id)}
                className={`w-full rounded-xl border p-3 text-left ${idConversacion === elemento.id ? "border-[#546FC0] bg-[#EEF3F8]" : "border-[#88A9C8]/45 hover:bg-[#F4F7F5]"}`}>
                <strong className="line-clamp-2 block text-sm">{elemento.title}</strong>
                <span className="mt-1 block text-xs text-[#0F2044]/50">{elemento.messages_count || 0} mensajes</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
            {!mensajes.length && !cargando ? (
              <div className="mx-auto mt-8 max-w-3xl rounded-[23px] border-2 border-[#88A9C8] bg-white p-7">
                <h2 className="text-xl font-semibold">Consultá este expediente</h2>
                <p className="mt-2 text-sm text-[#0F2044]/65">Escribí una pregunta o elegí una herramienta. Todo se guarda en esta conversación.</p>
                <div className="mt-5 grid gap-3 @min-[640px]:grid-cols-3">{ejemplos.map((example) => (
                  <button type="button" key={example} onClick={() => void enviarMensaje(example)} className="rounded-xl border border-[#88A9C8] bg-[#F4F7F5] p-3 text-left text-sm font-medium hover:border-[#546FC0]">{example}</button>
                ))}</div>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-5">{mensajes.map((mensaje) => (
                <MensajeDeChat key={mensaje.id} message={mensaje} onSuggestion={(suggestion) => void enviarMensaje(suggestion)} />
              ))}{enviando && <div className="w-fit rounded-2xl border border-[#88A9C8]/55 bg-white px-4 py-3 text-sm text-[#0F2044]/60">Revisando el expediente…</div>}<div ref={referenciaFinal} /></div>
            )}
          </div>

          <div className="@container border-t border-[#88A9C8]/55 bg-white px-4 py-4 sm:px-8">
            <div className="mx-auto max-w-4xl">
              {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <form className="grid items-start gap-3 @min-[560px]:grid-cols-[minmax(15rem,1fr)_minmax(0,2fr)]"
                onSubmit={(evento) => { evento.preventDefault(); if (puedeEnviar) void enviarMensaje(); }}>
                <div className={`min-w-0 rounded-2xl border p-3.5 ${herramientaElegida.id ? "border-[#546FC0] bg-[#E8EEF9]" : "border-[#9EB3D5] bg-[#EFF3FA]"}`}>
                  <label className="block text-sm font-semibold text-[#0F2044]">
                    Herramientas de análisis
                    <span className="relative mt-2 block">
                      <select value={idHerramienta} disabled={enviando} onChange={(evento) => {
                        const siguiente = herramientas.find((herramienta) => herramienta.id === evento.target.value) || herramientas[0];
                        cambiarIdHerramienta(siguiente.id);
                        cambiarFormatoRespuesta(siguiente.comparison || siguiente.id === "cronologia" ? "table" : "text");
                        cambiarParElegido(["", ""]);
                        cambiarError("");
                      }} className="min-h-11 w-full appearance-none truncate rounded-xl border border-[#9EB3D5] bg-white px-3 pr-9 text-sm font-semibold outline-none hover:border-[#546FC0] focus:border-[#546FC0] focus:ring-2 focus:ring-[#546FC0]/30 disabled:opacity-60">
                        <option value="">{herramientas[0].label}</option>
                        <optgroup label="Análisis del expediente">{herramientas.slice(1).map((herramienta) => (
                          <option key={herramienta.id} value={herramienta.id}>{herramienta.label}</option>
                        ))}</optgroup>
                      </select>
                      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-2 -translate-y-2/3 rotate-45 border-b-2 border-r-2 border-[#546FC0]" />
                    </span>
                  </label>
                  <p className="mt-2 text-xs leading-5 text-[#0F2044]/75">{herramientaElegida.description}</p>
                </div>
                <div className="min-w-0 space-y-3 rounded-2xl border border-[#88A9C8]/65 bg-white p-3.5 shadow-sm">
                  {herramientaElegida.comparison && <SelectorDeComparacion
                    label={herramientaElegida.label}
                    options={opcionesComparacion}
                    pair={parElegido}
                    setPair={cambiarParElegido}
                    error={errorDeContexto}
                  />}
                  <label className="block text-sm font-semibold">
                    {herramientaElegida.id ? "Enfoque opcional" : "Tu pregunta"}
                    <textarea rows={2} maxLength={4000} value={contenido} onChange={(evento) => cambiarContenido(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
                          evento.preventDefault();
                          if (puedeEnviar) evento.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder={herramientaElegida.id ? "Indicá qué querés que revise en particular" : "Preguntá sobre hechos, documentos o fechas"}
                      className="mt-2 block max-h-40 min-h-14 w-full resize-y rounded-xl border border-[#88A9C8]/65 bg-[#F4F7F5] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#546FC0] focus:ring-2 focus:ring-[#546FC0]/25" />
                  </label>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <fieldset disabled={enviando}>
                      <legend className="mb-1 text-xs font-semibold text-[#0F2044]">Formato de respuesta</legend>
                      <div className="flex rounded-xl border border-[#9EB3D5] bg-[#EFF3FA] p-1">
                        {(["text", "table"] as const).map((formato) => (
                          <label key={formato} className="relative cursor-pointer">
                            <input className="peer sr-only" type="radio" name="response-format" value={formato}
                              checked={formatoRespuesta === formato} onChange={() => cambiarFormatoRespuesta(formato)} />
                            <span className="block rounded-lg px-3 py-1.5 text-sm font-semibold peer-checked:bg-[#0F2044] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#546FC0] peer-disabled:opacity-60">{formato === "text" ? "Texto" : "Tabla"}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <button type="submit" disabled={!puedeEnviar} className="min-h-11 rounded-xl bg-[#0F2044] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1C3768] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#546FC0] disabled:opacity-45">{herramientaElegida.id ? "Ejecutar análisis" : "Enviar pregunta"}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function SelectorDeComparacion({ label, options: opciones, pair: par, setPair: cambiarPar, error }: {
  label: string;
  options: ElementoSeleccionable[];
  pair: [string, string];
  setPair: (valor: [string, string]) => void;
  error: string;
}) {
  return <div className="rounded-xl border border-[#88A9C8]/60 bg-[#F4F7F5] p-3">
    <p className="mb-2 text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/60">{label}</p>
    {error ? <p className="text-xs text-red-700">{error}</p> : opciones.length < 2 ? (
      <p className="text-xs text-[#0F2044]/60">Este expediente necesita al menos dos elementos para comparar.</p>
    ) : <div className="grid gap-2 sm:grid-cols-2">{([0, 1] as const).map((indice) => (
      <select key={indice} aria-label={indice === 0 ? "Primer elemento para comparar" : "Segundo elemento para comparar"} value={par[indice]} onChange={(evento) => {
        const siguiente: [string, string] = [...par];
        siguiente[indice] = evento.target.value;
        cambiarPar(siguiente);
      }} className="h-11 min-w-0 rounded-lg border border-[#88A9C8] bg-white px-3 text-sm outline-none focus:border-[#546FC0] focus:ring-2 focus:ring-[#546FC0]/25">
        <option value="">Seleccionar {indice === 0 ? "primero" : "segundo"}</option>
        {opciones.map((elemento) => <option key={elemento.id} value={elemento.id} disabled={String(elemento.id) === par[indice === 0 ? 1 : 0]}>{elemento.label}</option>)}
      </select>
    ))}</div>}
  </div>;
}

function esParValido(par: [string, string]) {
  return Boolean(par[0] && par[1] && par[0] !== par[1]);
}

function prepararParametrosDeHerramienta(herramienta: OpcionHerramienta | undefined, par: [string, string]) {
  if (!herramienta?.comparison) return {};
  const clave = herramienta.comparison === "documents" ? "document_ids"
    : herramienta.comparison === "defendants" ? "defendant_ids" : "jurisprudence_ids";
  return { [clave]: par.map(Number) };
}

function MensajeDeChat({ message: mensaje, onSuggestion: alElegirSugerencia }: { message: Mensaje; onSuggestion: (valor: string) => void }) {
  const esAsistente = mensaje.role === "asistente";
  const table = esAsistente ? mensaje.metadata?.response_table : undefined;
  return <article className={table ? "w-full min-w-0" : esAsistente ? "mr-auto max-w-[92%]" : "ml-auto max-w-[82%]"}>
    <div className={`rounded-2xl px-4 py-3 ${esAsistente ? "border border-[#88A9C8]/60 bg-white" : "bg-[#0F2044] text-white"}`}>
      {esAsistente && <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#546FC0]">
        {mensaje.tool_id && <span>{herramientas.find((herramienta) => herramienta.id === mensaje.tool_id)?.label || "Herramienta aplicada"}</span>}
        {mensaje.metadata?.evidence?.status && mensaje.metadata.evidence.status !== "no_requerido" && <span>Respaldo: {mensaje.metadata.evidence.status}</span>}
      </div>}
      {table ? <TablaDeRespuesta table={table} /> : <p className="whitespace-pre-wrap text-sm leading-6">{mensaje.content}</p>}
    </div>
    {esAsistente && Boolean(mensaje.citations?.length) && <details className="mt-2 rounded-xl border border-[#88A9C8]/50 bg-white px-3 py-2">
      <summary className="cursor-pointer text-xs font-bold text-[#546FC0]">Fuentes consultadas ({mensaje.citations?.length})</summary>
      <div className="mt-2 space-y-2">{mensaje.citations?.map((cita, indice) => (
        <div key={cita.citation_id} className="rounded-lg bg-[#F4F7F5] p-3 text-xs">
          <div className="flex items-start justify-between gap-3"><strong>[{indice + 1}] {cita.document_name}</strong><span>{cita.location_label}</span></div>
          <p className="mt-1 line-clamp-3 text-[#0F2044]/65">{cita.text}</p>
          {cita.document_url && <Link href={cita.document_url} className="mt-2 inline-block font-semibold text-[#546FC0]">Abrir fuente →</Link>}
        </div>
      ))}</div>
    </details>}
    {esAsistente && Boolean(mensaje.metadata?.suggested_questions?.length) && <div className="mt-2 flex flex-wrap gap-2">{mensaje.metadata?.suggested_questions?.map((pregunta) => (
      <button type="button" key={pregunta} onClick={() => alElegirSugerencia(pregunta)} className="rounded-full border border-[#88A9C8] bg-white px-3 py-1.5 text-xs font-medium hover:border-[#546FC0]">{pregunta}</button>
    ))}</div>}
  </article>;
}

function TablaDeRespuesta({ table }: { table: TablaRespuesta }) {
  return <div className="overflow-x-auto rounded-xl border border-[#88A9C8]/55 focus-visible:outline-2 focus-visible:outline-[#546FC0]"
    role="region" aria-label={table.caption || "Respuesta en tabla"} tabIndex={0}>
    <table className="w-full min-w-[26rem] border-collapse text-left text-sm leading-5">
      {table.caption && <caption className="bg-[#EFF3FA] px-3 py-2 text-left font-semibold">{table.caption}</caption>}
      <thead className="bg-[#EFF3FA]">
        <tr>{table.columns.map((columna, indice) => <th key={indice} scope="col" className="min-w-24 px-3 py-2.5 font-semibold">{columna}</th>)}</tr>
      </thead>
      <tbody>{table.rows.map((fila, indice) => (
        <tr key={indice} className="border-t border-[#88A9C8]/45 odd:bg-white even:bg-[#F4F7F5]">
          {fila.map((celda, indiceCelda) => <td key={indiceCelda} className="break-words px-3 py-2.5 align-top">{celda}</td>)}
        </tr>
      ))}</tbody>
    </table>
  </div>;
}
