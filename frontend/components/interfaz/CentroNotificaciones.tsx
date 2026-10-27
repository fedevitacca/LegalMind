"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/authClient";
import { BandejaNotificaciones, createNotification, fetchNotifications, markNotificationsRead, Notificacion, updateNotification } from "@/lib/notificacionesApi";

export default function CentroNotificaciones() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const dialog = useRef<HTMLDialogElement>(null);
  const [inbox, setInbox] = useState<BandejaNotificaciones | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"recibidas" | "programadas">("recibidas");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [email, setEmail] = useState(true);

  useEffect(() => {
    setInbox(null);
    if (!userId) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const data = await fetchNotifications(controller.signal);
        if (!controller.signal.aborted) { setInbox(data); setError(""); }
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la bandeja.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [userId]);

  async function reload() {
    setInbox(await fetchNotifications());
  }

  async function changeNotification(item: Notificacion, action: "leer" | "cancelar") {
    setBusy(true); setError("");
    try { await updateNotification(item.id, action); await reload(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el aviso."); }
    finally { setBusy(false); }
  }

  async function readAll() {
    setBusy(true); setError("");
    try { await markNotificationsRead(); await reload(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudieron marcar los avisos."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    const date = schedule ? new Date(when) : undefined;
    if (schedule && (!date || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now())) {
      setError("Elegí una fecha y hora futura para el recordatorio."); return;
    }
    setBusy(true);
    try {
      await createNotification({ titulo: title.trim(), mensaje: message.trim(), programado_para: date?.toISOString(), email });
      setTitle(""); setMessage(""); setWhen(""); setCreating(false);
      setTab(schedule ? "programadas" : "recibidas");
      setSuccess(schedule ? "Recordatorio programado." : "Notificación creada.");
      await reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo crear el recordatorio."); }
    finally { setBusy(false); }
  }

  if (!userId) return null;
  const items = inbox?.notificaciones.filter((item) => (new Date(item.programado_para).getTime() > Date.now()) === (tab === "programadas")) || [];
  if (tab === "programadas") items.sort((a, b) => new Date(a.programado_para).getTime() - new Date(b.programado_para).getTime());

  return (
    <>
      <button type="button" aria-label={`Notificaciones${inbox?.no_leidas ? `: ${inbox.no_leidas} sin leer` : ""}`} className="relative flex items-center gap-2 rounded-lg border border-[#88A9C8] px-3 py-2 font-semibold hover:bg-[#F3F6F5]" onClick={() => { dialog.current?.showModal(); setSuccess(""); void reload().catch(() => setError("No se pudieron actualizar las notificaciones.")); }}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>Notificaciones</span>
        {inbox?.no_leidas ? <span className="rounded-full bg-[#546FC0] px-2 text-xs text-white">{inbox.no_leidas > 99 ? "99+" : inbox.no_leidas}</span> : null}
      </button>
      <dialog ref={dialog} aria-labelledby="notifications-title" className="m-auto max-h-[90dvh] w-[min(680px,calc(100%-24px))] overflow-y-auto rounded-2xl border border-[#88A9C8] bg-[#F3F6F5] p-5 text-[#0F2044] shadow-xl backdrop:bg-[#0F2044]/45">
        <div className="flex items-center justify-between gap-3">
          <h2 id="notifications-title" className="text-2xl font-semibold">Notificaciones y recordatorios</h2>
          <button type="button" aria-label="Cerrar notificaciones" className="rounded-lg border border-[#88A9C8] px-3 py-2" onClick={() => dialog.current?.close()}>Cerrar</button>
        </div>
        <p className="mt-2 text-sm text-[#0F2044]/70">Los avisos por correo llegan al email de tu cuenta: {session.user.email}.</p>
        {inbox?.email_disponible === false ? <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">El envío de correos todavía no está habilitado. Tus avisos aparecerán aquí y los correos quedarán pendientes hasta que se habilite.</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold">{success}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-[#0F2044] px-3 py-2 text-sm font-semibold text-white" onClick={() => setCreating(!creating)}>{creating ? "Ocultar formulario" : "+ Nuevo recordatorio"}</button>
          <button type="button" disabled={busy || !inbox?.no_leidas} className="rounded-lg border border-[#88A9C8] bg-white px-3 py-2 text-sm disabled:opacity-50" onClick={readAll}>Marcar todas como leídas</button>
        </div>
        {creating ? <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-[#88A9C8] bg-white p-4">
          <label className="text-sm font-semibold">Título<input className="input mt-1" required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="text-sm font-semibold">Mensaje<textarea className="input mt-1 min-h-24" required maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          <label className="text-sm font-semibold">Cuándo avisarme<select className="input mt-1" value={schedule ? "programar" : "ahora"} onChange={(event) => setSchedule(event.target.value === "programar")}><option value="ahora">Ahora</option><option value="programar">Elegir fecha y hora</option></select></label>
          {schedule ? <label className="text-sm font-semibold">Fecha y hora del recordatorio<input className="input mt-1" type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} /><span className="mt-1 block text-xs font-normal">Hora local: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</span></label> : null}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />Enviar también por correo</label>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#546FC0] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar recordatorio"}</button>
        </form> : null}
        <div className="mt-5 flex gap-2" aria-label="Filtrar notificaciones">
          {(["recibidas", "programadas"] as const).map((value) => <button type="button" key={value} aria-pressed={tab === value} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === value ? "bg-[#0F2044] text-white" : "bg-white"}`} onClick={() => setTab(value)}>{value === "recibidas" ? "Recibidas" : "Programadas"}</button>)}
        </div>
        {loading ? <p role="status" className="mt-4 text-sm">Cargando notificaciones…</p> : null}
        {!loading && !items.length ? <p className="mt-4 rounded-xl border border-dashed border-[#88A9C8] p-5 text-sm">{tab === "recibidas" ? "No tenés notificaciones recibidas." : "No tenés recordatorios programados."}</p> : null}
        <div className="mt-3 grid gap-3">
          {items.map((item) => <article key={item.id} className={`rounded-xl border bg-white p-4 ${!item.leido_at && tab === "recibidas" ? "border-[#546FC0]" : "border-[#88A9C8]/50"}`}>
            <div className="flex items-start justify-between gap-3"><h3 className="break-words font-semibold">{item.titulo}</h3>{!item.leido_at && tab === "recibidas" ? <span className="shrink-0 text-xs font-semibold text-[#546FC0]">Sin leer</span> : null}</div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.mensaje}</p>
            <p className="mt-2 text-xs text-[#0F2044]/65">{new Date(item.programado_para).toLocaleString("es-AR")} · {emailStatus(item)}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
              {item.causa_id ? <Link className="underline" href={`/casos/${item.causa_id}/agenda`} onClick={() => { dialog.current?.close(); if (tab === "recibidas" && !item.leido_at) void changeNotification(item, "leer"); }}>Abrir expediente{item.caratula ? `: ${item.caratula}` : ""}</Link> : null}
              {tab === "recibidas" && !item.leido_at ? <button type="button" disabled={busy} className="underline" onClick={() => changeNotification(item, "leer")}>Marcar como leída</button> : null}
              {tab === "programadas" ? <button type="button" disabled={busy} className="text-red-700 underline" onClick={() => changeNotification(item, "cancelar")}>Cancelar recordatorio</button> : null}
            </div>
          </article>)}
        </div>
        <p className="mt-4 text-xs text-[#0F2044]/60">La bandeja muestra hasta 100 avisos por sección. Los recordatorios se revisan aproximadamente cada 30 segundos, incluso si cerrás la página.</p>
      </dialog>
    </>
  );
}

function emailStatus(item: Notificacion) {
  if (item.email_estado === "enviado") return "Correo enviado";
  if (item.email_estado === "error") return item.email_intentos < 5 ? "No se pudo enviar el correo; se reintentará" : "No se pudo enviar el correo después de 5 intentos";
  if (item.email_estado === "pendiente") return "Correo pendiente";
  return "Aviso en la aplicación";
}
