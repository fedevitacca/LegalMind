"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CentroNotificaciones from "../interfaz/CentroNotificaciones";

const sections = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/casos", label: "Casos" },
  { href: "/nuevo", label: "Nuevo caso" },
  { href: "/analisis", label: "Análisis" },
  { href: "/agenda", label: "Agenda / Calendario" },
  { href: "/trabajo", label: "Trabajo" },
  { href: "/configuracion", label: "Configuración" },
];

function isInternalPage(path: string) {
  return sections.some(({ href }) => path === href || path.startsWith(`${href}/`));
}

export default function EspacioTrabajo({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [embedded, setEmbedded] = useState(false);
  const [ready, setReady] = useState(false);
  const [split, setSplit] = useState(false);
  const [secondary, setSecondary] = useState("/agenda");
  const [secondarySource, setSecondarySource] = useState("/agenda");
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const inFrame = window.self !== window.top;
    setEmbedded(inFrame);
    document.body.classList.toggle("workspace-embedded", inFrame);
    if (!inFrame) {
      try {
        const saved = JSON.parse(sessionStorage.getItem("legalmind.workspace") || "null");
        if (saved && typeof saved.path === "string" && isInternalPage(saved.path)) {
          setSecondary(saved.path);
          setSecondarySource(saved.path);
          setSplit(saved.split === true);
        }
      } catch { /* Las preferencias no son necesarias para abrir el espacio. */ }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (embedded) {
      window.parent.postMessage({ type: "legalmind:workspace-route", path: pathname }, window.location.origin);
    }
  }, [embedded, pathname]);

  useEffect(() => {
    function receiveRoute(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "legalmind:workspace-route" && typeof event.data.path === "string") {
        setSecondary(event.data.path);
      }
    }
    window.addEventListener("message", receiveRoute);
    return () => window.removeEventListener("message", receiveRoute);
  }, []);

  useEffect(() => {
    if (!ready || embedded) return;
    try {
      sessionStorage.setItem("legalmind.workspace", JSON.stringify({ split, path: isInternalPage(secondary) ? secondary : "/agenda" }));
    } catch { /* Puede estar deshabilitado el almacenamiento del navegador. */ }
  }, [ready, embedded, split, secondary]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("legalmind:cases");
    channel.onmessage = (event) => {
      if (event.data?.type !== "deleted" || !/^\d+$/.test(String(event.data.id))) return;
      const casePath = `/casos/${event.data.id}`;
      if (pathname === casePath || pathname.startsWith(`${casePath}/`)) router.replace("/casos");
      router.refresh();
    };
    return () => channel.close();
  }, [pathname, router]);

  const internal = isInternalPage(pathname);
  const divided = split && internal && !embedded;

  return (
    <div className={`workspace flex h-full min-h-0 flex-col ${divided ? "workspace-split" : ""}`}>
      {ready && internal && !embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#88A9C8]/50 bg-white px-4 py-2 text-sm">
          <span className="font-semibold">Espacio de trabajo</span>
          <div className="flex flex-wrap items-center gap-2">
          <CentroNotificaciones />
          <button className="rounded-lg border border-[#88A9C8] px-3 py-2 font-semibold hover:bg-[#F3F6F5]" type="button" aria-pressed={split} onClick={() => { if (!split) setSecondarySource(isInternalPage(secondary) ? secondary : "/agenda"); setSplit(!split); }}>
            {split ? "Cerrar segunda ventana" : "Abrir segunda ventana"}
          </button>
          </div>
        </div>
      ) : null}
      <div className={`grid min-h-0 flex-1 ${divided ? "grid-rows-2 md:grid-cols-2 md:grid-rows-1" : "grid-cols-1"}`}>
        <div className="workspace-pane flex min-h-0 min-w-0 flex-col overflow-hidden">
          {divided ? <PaneNavigation label="Ventana principal" path={pathname} navigate={(path) => router.push(path)} /> : null}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
        {ready && split && !embedded ? (
          <div className={`workspace-pane min-h-0 min-w-0 flex-col border-t-2 border-[#88A9C8] md:border-l-2 md:border-t-0 ${divided ? "flex" : "hidden"}`}>
            <PaneNavigation label="Segunda ventana" path={secondary} navigate={(path) => { setSecondary(path); frame.current?.contentWindow?.location.assign(path); }} />
            <iframe ref={frame} className="min-h-0 w-full flex-1 border-0 bg-[#F3F6F5]" src={secondarySource} title="Segunda ventana de LegalMind" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PaneNavigation({ label, path, navigate }: { label: string; path: string; navigate: (path: string) => void }) {
  return (
    <label className="flex flex-wrap items-center gap-2 border-b border-[#88A9C8]/40 bg-white px-3 py-2 text-sm font-semibold">
      {label}
      <select className="min-w-0 flex-1 rounded-lg border border-[#88A9C8] bg-white p-2" value={path} onChange={(event) => navigate(event.target.value)}>
        {!sections.some(({ href }) => href === path) ? <option value={path}>{isInternalPage(path) ? `Expediente · ${path}` : "Seleccionar sección"}</option> : null}
        {sections.map(({ href, label }) => <option key={href} value={href}>{label}</option>)}
      </select>
    </label>
  );
}
