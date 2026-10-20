"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWorkDate, workApi } from "../../../lib/trabajoApi";

type PortalData = {
  case: { caratula: string; identificador?: string; estado: string };
  cliente_nombre?: string;
  fechas: {
    id: number;
    evento: string;
    fecha?: string;
    fecha_texto?: string;
    tipo: string;
  }[];
  documentos: {
    id: number;
    nombre_archivo: string;
    tipo_archivo: string;
    created_at: string;
  }[];
  mensajes: {
    id: number;
    autor_tipo: string;
    contenido: string;
    created_at: string;
  }[];
  tareas: {
    id: number;
    titulo: string;
    descripcion?: string;
    fecha_limite?: string;
    estado: string;
    requiere_confirmacion: boolean;
    confirmado_cliente_at?: string;
  }[];
  archivos_enviados: {
    id: number;
    nombre_archivo: string;
    descripcion?: string;
    created_at: string;
  }[];
};

export default function PortalCliente({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  useEffect(() => {
    void params.then((value) => setToken(value.token));
  }, [params]);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      setData(await workApi<PortalData>(`/portal/${token}`));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo abrir el portal.",
      );
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      await workApi(`/portal/${token}/mensajes`, {
        method: "POST",
        body: JSON.stringify({ contenido: message }),
      });
      setMessage("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo enviar.");
    }
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    try {
      const form = new FormData();
      form.append("archivo", file);
      form.append("descripcion", description);
      await workApi(`/portal/${token}/documentos`, {
        method: "POST",
        body: form,
      });
      setFile(null);
      setDescription("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo enviar el archivo.",
      );
    }
  }
  const apiUrl =
    process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
  return (
    <div className="h-full overflow-y-auto bg-[#F4F7F5] px-5 py-10 text-[#0F2044]">
      <main className="mx-auto max-w-5xl">
        <div className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-7">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#546FC0]">
            Portal del cliente
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0F2044]">
            {data?.case.caratula || "Acceso al expediente"}
          </h1>
          {data && (
            <p className="mt-2 text-sm text-[#0F2044]/60">
              {data.case.identificador || "Sin identificador"} · Estado:{" "}
              {data.case.estado}
            </p>
          )}
        </div>
        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </p>
        )}
        {!data && !error && (
          <p className="mt-8 text-center">Validando acceso…</p>
        )}
        {data && (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Section title="Proximas fechas">
              <div className="space-y-3">
                {data.fechas.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border-2 border-[#88A9C8]/45 bg-[#F4F7F5] p-4"
                  >
                    <p className="text-xs font-bold uppercase text-[#546FC0]">
                      {item.tipo}
                    </p>
                    <strong className="mt-1 block">{item.evento}</strong>
                    <span className="text-sm text-[#0F2044]/60">
                      {item.fecha
                        ? formatWorkDate(item.fecha)
                        : item.fecha_texto || "A confirmar"}
                    </span>
                  </article>
                ))}
                {!data.fechas.length && (
                  <Empty>El estudio no publico fechas pendientes.</Empty>
                )}
              </div>
            </Section>
            <Section title="Documentos compartidos">
              <div className="space-y-3">
                {data.documentos.map((item) => (
                  <a
                    key={item.id}
                    href={`${apiUrl}/api/portal/${token}/documentos/${item.id}`}
                    className="flex items-center justify-between rounded-xl border-2 border-[#88A9C8]/45 p-4 transition hover:border-[#546FC0]"
                  >
                    <span>
                      <strong className="block">{item.nombre_archivo}</strong>
                      <small>
                        {item.tipo_archivo} · {formatWorkDate(item.created_at)}
                      </small>
                    </span>
                    <span className="font-semibold text-[#546FC0]">
                      Descargar
                    </span>
                  </a>
                ))}
                {!data.documentos.length && (
                  <Empty>No hay documentos compartidos.</Empty>
                )}
              </div>
            </Section>
            <Section title="Tareas solicitadas">
              <div className="space-y-3">
                {data.tareas.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border-2 border-[#88A9C8]/45 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        <strong>{item.titulo}</strong>
                        <small className="block">
                          {item.descripcion || "Solicitud del estudio"} ·{" "}
                          {formatWorkDate(item.fecha_limite)}
                        </small>
                      </span>
                      {item.confirmado_cliente_at ? (
                        <span className="rounded-full bg-[#EEF3F8] px-2 py-1 text-xs font-bold text-[#0F2044]">
                          Confirmada
                        </span>
                      ) : item.requiere_confirmacion ? (
                        <button
                          onClick={() =>
                            void workApi(
                              `/portal/${token}/tareas/${item.id}/confirmar`,
                              { method: "POST" },
                            ).then(load)
                          }
                          className="rounded-lg bg-[#0F2044] px-3 py-2 text-xs font-semibold text-white"
                        >
                          Confirmar lectura
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!data.tareas.length && (
                  <Empty>No hay tareas publicadas.</Empty>
                )}
              </div>
            </Section>
            <Section title="Enviar documentacion">
              <form onSubmit={upload} className="space-y-3">
                <label className="block rounded-xl border-2 border-dashed border-[#88A9C8] bg-[#F4F7F5] p-5 text-center text-sm font-semibold">
                  <span>{file?.name || "Seleccionar archivo"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion del archivo"
                />
                <button
                  disabled={!file}
                  className="w-full rounded-xl bg-[#0F2044] px-5 py-3 font-semibold text-white disabled:opacity-40"
                >
                  Enviar al estudio
                </button>
              </form>
              {data.archivos_enviados.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  {data.archivos_enviados.map((item) => (
                    <p key={item.id} className="text-sm">
                      <strong>{item.nombre_archivo}</strong> · enviado{" "}
                      {formatWorkDate(item.created_at)}
                    </p>
                  ))}
                </div>
              )}
            </Section>
            <section className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold">Mensajes con el estudio</h2>
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-[#F4F7F5] p-4">
                {data.mensajes.map((item) => (
                  <div
                    key={item.id}
                    className={`max-w-[82%] rounded-2xl p-3 text-sm ${item.autor_tipo === "cliente" ? "ml-auto bg-[#0F2044] text-white" : "bg-white"}`}
                  >
                    <p>{item.contenido}</p>
                    <small className="mt-1 block opacity-60">
                      {formatWorkDate(item.created_at)}
                    </small>
                  </div>
                ))}
                {!data.mensajes.length && (
                  <Empty>Todavia no hay mensajes.</Empty>
                )}
              </div>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input
                  className="input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escriba un mensaje al estudio"
                />
                <button className="rounded-xl bg-[#0F2044] px-6 font-semibold text-white">
                  Enviar
                </button>
              </form>
            </section>
          </div>
        )}
        <p className="mt-8 text-center text-xs text-[#0F2044]/45">
          Este enlace es personal. No lo comparta con terceros.
        </p>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border-2 border-dashed border-[#88A9C8] bg-[#F4F7F5] p-5 text-center text-sm text-[#0F2044]/50">
      {children}
    </p>
  );
}
