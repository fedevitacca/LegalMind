"use client";

import { useEffect, useState, type FormEvent } from "react";

type Documento = {
  id: string;
  nombre_archivo: string;
  tamano_bytes: number;
  modelo_embedding: string | null;
};

type Consulta = {
  respuesta: string;
  modelo: string | null;
  citas: {
    citation_id: string;
    document_name: string;
    location_label: string;
    document_url: string;
    text: string;
  }[];
};

const api = `${process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000"}/api/biblioteca`;
const panel = "min-w-0 rounded-2xl border border-[#88A9C8] bg-white p-5";
const boton = "rounded-lg bg-[#0F2044] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203B67] disabled:opacity-50";

async function solicitar<T>(ruta = "", opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${api}${ruta}`, { credentials: "include", ...opciones });
  if (respuesta.status === 204) return undefined as T;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo completar la operación.");
  return datos;
}

function mensajeDeError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}

export default function BibliotecaJuridica() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [gestionEnCurso, setGestionEnCurso] = useState(false);
  const [aviso, setAviso] = useState("");
  const [errorArchivos, setErrorArchivos] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState("");
  const [resultado, setResultado] = useState<Consulta | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    solicitar<{ documentos: Documento[]; puede_editar: boolean }>("", { signal: controlador.signal })
      .then((datos) => {
        setDocumentos(datos.documentos);
        setPuedeEditar(datos.puede_editar);
      })
      .catch((error) => { if (!controlador.signal.aborted) setErrorArchivos(mensajeDeError(error)); })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    const ancla = window.location.hash.slice(1);
    if (!cargando && ancla.startsWith("documento-")) document.getElementById(ancla)?.scrollIntoView();
  }, [cargando]);

  async function cargarArchivos(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    setGestionEnCurso(true);
    setAviso("");
    setErrorArchivos("");
    const errores: string[] = [];
    let cargados = 0;
    for (const archivo of archivos) {
      try {
        const carga = new FormData();
        carga.append("archivo", archivo);
        const { documento } = await solicitar<{ documento: Documento }>("", { method: "POST", body: carga });
        setDocumentos((actuales) => [documento, ...actuales]);
        cargados++;
      } catch (error) {
        errores.push(`${archivo.name} — ${mensajeDeError(error)}`);
      }
    }
    if (cargados) setAviso(cargados === 1 ? "Se agregó 1 archivo." : `Se agregaron ${cargados} archivos.`);
    if (errores.length) setErrorArchivos(errores.join("\n"));
    formulario.reset();
    setArchivos([]);
    setGestionEnCurso(false);
  }

  async function quitarArchivo(documento: Documento) {
    if (!window.confirm(`¿Eliminar «${documento.nombre_archivo}» de la biblioteca?`)) return;
    setGestionEnCurso(true);
    setErrorArchivos("");
    setAviso("");
    try {
      await solicitar(`/${documento.id}`, { method: "DELETE" });
      setDocumentos((actuales) => actuales.filter(({ id }) => id !== documento.id));
      setResultado((actual) => actual?.citas.some((cita) => cita.document_url === `/biblioteca#documento-${documento.id}`) ? null : actual);
      setAviso("Se eliminó el archivo.");
    } catch (error) {
      setErrorArchivos(mensajeDeError(error));
    } finally {
      setGestionEnCurso(false);
    }
  }

  async function consultar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setConsultando(true);
    setErrorConsulta("");
    setResultado(null);
    try {
      setResultado(await solicitar<Consulta>("/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: pregunta.trim() }),
      }));
    } catch (error) {
      setErrorConsulta(mensajeDeError(error));
    } finally {
      setConsultando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-biblioteca" className="min-h-0 overflow-auto p-4 text-[#0F2044] sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 id="titulo-biblioteca" className="text-3xl font-semibold">Biblioteca jurídica</h1>
          <p className="mt-2 text-sm text-[#0F2044]/75">Los integrantes del estudio pueden consultar estos archivos. El asistente jurídico usa los pasajes relevantes como fuentes de referencia para el análisis de expedientes.</p>
        </header>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <section className={panel} aria-labelledby="archivos-biblioteca">
            <h2 id="archivos-biblioteca" className="text-xl font-semibold">Archivos del estudio</h2>
            {puedeEditar && (
              <form onSubmit={cargarArchivos} className="mt-4 space-y-2 border-b border-[#88A9C8]/40 pb-4">
                <label htmlFor="archivos-carga" className="block text-sm font-semibold">Seleccionar archivos</label>
                <input id="archivos-carga" type="file" accept=".pdf,.docx,.txt,.md,.csv" multiple disabled={gestionEnCurso}
                  onChange={(evento) => setArchivos(Array.from(evento.target.files || []))}
                  aria-describedby="formatos-biblioteca"
                  className="w-full rounded-lg border border-[#88A9C8] p-2 text-sm file:mr-2 file:font-semibold" />
                <p id="formatos-biblioteca" className="text-xs text-[#0F2044]/75">PDF con texto, DOCX, TXT, MD y CSV. Hasta 15 MB por archivo.</p>
                <button className={boton} disabled={gestionEnCurso || !archivos.length} type="submit">
                  {gestionEnCurso && archivos.length ? "Cargando e indexando…" : "Agregar archivos"}
                </button>
              </form>
            )}
            {aviso && <p role="status" className="mt-3 text-sm text-green-800">{aviso}</p>}
            {errorArchivos && <p role="alert" className="mt-3 whitespace-pre-line break-words text-sm text-red-800">{errorArchivos}</p>}
            {cargando && <p role="status" className="mt-3 text-sm">Cargando archivos…</p>}
            {!cargando && !errorArchivos && !documentos.length && <p className="mt-3 text-sm">Todavía no hay archivos cargados.</p>}
            <ul className="mt-2 divide-y divide-[#88A9C8]/40">
              {documentos.map((documento) => (
                <li id={`documento-${documento.id}`} key={documento.id} className="py-3 target:rounded-lg target:bg-[#EAF1FA]">
                  <p className="break-words text-sm font-semibold">{documento.nombre_archivo}</p>
                  <p className="mt-1 text-xs text-[#0F2044]/75">
                    {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(documento.tamano_bytes / 1024)} KB · {documento.modelo_embedding ? "Búsqueda por texto y similitud" : "Búsqueda por texto"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold">
                    <a className="underline" href={`${api}/${documento.id}/archivo`}>Descargar</a>
                    {puedeEditar && <button type="button" className="text-red-800 underline disabled:opacity-50"
                      disabled={gestionEnCurso || consultando} onClick={() => quitarArchivo(documento)}>Eliminar</button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={panel} aria-labelledby="consulta-biblioteca">
            <h2 id="consulta-biblioteca" className="text-xl font-semibold">Consultar la biblioteca</h2>
            <form onSubmit={consultar} className="mt-4 space-y-3">
              <label htmlFor="pregunta-biblioteca" className="block text-sm font-semibold">Pregunta sobre los archivos</label>
              <textarea id="pregunta-biblioteca" rows={3} maxLength={2000} value={pregunta} onChange={(evento) => setPregunta(evento.target.value)}
                className="w-full rounded-lg border border-[#88A9C8] p-3 text-sm" />
              <button className={boton} disabled={consultando || gestionEnCurso || !documentos.length || !pregunta.trim()} type="submit">
                {consultando ? "Consultando…" : "Consultar"}
              </button>
            </form>
            {errorConsulta && <p role="alert" className="mt-3 text-sm text-red-800">{errorConsulta}</p>}
            {resultado && (
              <div className="mt-5 border-t border-[#88A9C8]/40 pt-4">
                <p role="status" className="whitespace-pre-wrap break-words text-sm leading-relaxed">{resultado.respuesta}</p>
                {!!resultado.citas.length && (
                  <>
                    <h3 className="mt-4 font-semibold">Fuentes recuperadas</h3>
                    <p className="mb-2 text-xs text-[#0F2044]/75">{resultado.modelo ? `Respuesta generada con ${resultado.modelo}` : "Respuesta extractiva"}</p>
                    <ol className="space-y-2">
                      {resultado.citas.map((cita, indice) => (
                        <li key={cita.citation_id}>
                          <details className="rounded-lg border border-[#88A9C8]/50 p-3 text-sm">
                            <summary className="cursor-pointer break-words font-semibold">{indice + 1}. {cita.document_name} · {cita.location_label}</summary>
                            <p className="mt-2 whitespace-pre-wrap break-words">{cita.text}</p>
                            <a href={cita.document_url} className="mt-2 inline-block font-semibold underline">Ver archivo en la biblioteca</a>
                          </details>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
