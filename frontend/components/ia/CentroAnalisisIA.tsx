"use client";

import { useState } from "react";
import CentroHerramientasIA from "./CentroHerramientasIA";

type PanelId = "a" | "b";
type PanelStatus = "open" | "minimized" | "archived" | "closed";

const panels: { id: PanelId; title: string; shortTitle: string }[] = [
  { id: "a", title: "Herramienta A", shortTitle: "A" },
  { id: "b", title: "Herramienta B", shortTitle: "B" },
];

export default function CentroAnalisisIA() {
  const [dualMode, setDualMode] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>("a");
  const [panelStatuses, setPanelStatuses] = useState<Record<PanelId, PanelStatus>>({
    a: "open",
    b: "open",
  });

  const visiblePanels = dualMode
    ? panels
    : panels.filter((panel) => panel.id === activePanel);
  const activeTab = panels.find((panel) => panel.id === activePanel) || panels[0];
  const openPanels = panels.filter((panel) => panelStatuses[panel.id] === "open");
  const archivedPanels = panels.filter((panel) => panelStatuses[panel.id] === "archived");
  const closedPanels = panels.filter((panel) => panelStatuses[panel.id] === "closed");

  function setPanelStatus(panelId: PanelId, status: PanelStatus) {
    setPanelStatuses((current) => ({ ...current, [panelId]: status }));
    setActivePanel(panelId);
  }

  return (
    <div className="space-y-4">
      <section className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#84A2BD]/35 bg-white/90 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64706e]">
            Modo de trabajo
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#172235]">
            {dualMode ? "Paneles horizontales" : activeTab.title}
          </h2>
        </div>
        <div className="flex rounded-xl bg-[#F4F7F5] p-1">
          <button
            className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
              !dualMode
                ? "bg-white text-[#0F2044] shadow-[0_4px_14px_rgba(15,32,68,0.12)]"
                : "text-[#0F2044]/62 hover:text-[#0F2044]"
            }`}
            onClick={() => setDualMode(false)}
            type="button"
          >
            Simple
          </button>
          <button
            className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
              dualMode
                ? "bg-white text-[#0F2044] shadow-[0_4px_14px_rgba(15,32,68,0.12)]"
                : "text-[#0F2044]/62 hover:text-[#0F2044]"
            }`}
            onClick={() => setDualMode(true)}
            type="button"
          >
            Doble panel
          </button>
        </div>
      </section>

      <section className="surface-card rounded-2xl border border-[#84A2BD]/35 bg-white/85 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e1df] pb-3">
          <div className="flex flex-wrap gap-2">
            {panels.map((panel) => {
              const status = panelStatuses[panel.id];
              const active = activePanel === panel.id;
              return (
                <button
                  aria-pressed={active}
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                    active
                      ? "border-[#546FC0] bg-white text-[#0F2044] shadow-[0_6px_16px_rgba(15,32,68,0.10)]"
                      : "border-[#d8dfdc] bg-[#F4F7F5] text-[#46524f] hover:border-[#9faeaa]"
                  } ${status === "closed" ? "opacity-55" : ""}`}
                  key={panel.id}
                  onClick={() => {
                    setActivePanel(panel.id);
                    if (status === "closed") setPanelStatus(panel.id, "open");
                  }}
                  type="button"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F2044] text-xs font-black text-white">
                    {panel.shortTitle}
                  </span>
                  <span>{panel.title}</span>
                  <span className="text-xs font-medium text-[#64706e]">
                    {statusLabel(status)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {archivedPanels.map((panel) => (
              <button
                className="h-9 rounded-lg border border-[#d9d2c5] bg-[#fbfaf6] px-3 text-xs font-semibold text-[#6b5432]"
                key={panel.id}
                onClick={() => setPanelStatus(panel.id, "open")}
                type="button"
              >
                Restaurar {panel.shortTitle}
              </button>
            ))}
            {closedPanels.map((panel) => (
              <button
                className="h-9 rounded-lg border border-[#d7dee4] bg-white px-3 text-xs font-semibold text-[#31445b]"
                key={panel.id}
                onClick={() => setPanelStatus(panel.id, "open")}
                type="button"
              >
                Reabrir {panel.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {dualMode && openPanels.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#b7c2bf] bg-[#f7faf8] px-5 py-8 text-center">
            <h3 className="text-base font-semibold text-[#263244]">
              No hay paneles abiertos
            </h3>
            <p className="mt-2 text-sm text-[#687180]">
              Restaurá o reabrí una pestaña para volver a trabajar.
            </p>
          </div>
        ) : null}

        <div
          className={
            dualMode
              ? "mt-3 flex gap-4 overflow-x-auto pb-2"
              : "mt-3 grid gap-4"
          }
        >
          {visiblePanels.map((panel) => {
            const status = panelStatuses[panel.id];
            const hidden = status === "archived" || status === "closed";
            const minimized = status === "minimized";

            return (
              <ToolPanel
                compact={dualMode}
                hidden={hidden}
                key={panel.id}
                minimized={minimized}
                onArchive={() => setPanelStatus(panel.id, "archived")}
                onClose={() => setPanelStatus(panel.id, "closed")}
                onMinimize={() =>
                  setPanelStatus(panel.id, minimized ? "open" : "minimized")
                }
                onRestore={() => setPanelStatus(panel.id, "open")}
                title={panel.title}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ToolPanel({
  compact,
  hidden,
  minimized,
  onArchive,
  onClose,
  onMinimize,
  onRestore,
  title,
}: {
  compact?: boolean;
  hidden?: boolean;
  minimized?: boolean;
  onArchive: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  title: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-[#84A2BD]/35 bg-white/60 p-3 shadow-[0_10px_28px_rgba(15,32,68,0.06)] ${
        compact ? "w-[min(720px,calc(100vw-3rem))] shrink-0 xl:w-[calc(50%_-_0.5rem)]" : ""
      } ${hidden ? "hidden" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#546FC0]">
          {title}
        </h3>
        <div className="flex items-center gap-1 rounded-xl bg-white p-1">
          <button
            aria-label={minimized ? `Restaurar ${title}` : `Minimizar ${title}`}
            className="icon-action flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-[#0F2044]/70"
            onClick={onMinimize}
            title={minimized ? "Restaurar" : "Minimizar"}
            type="button"
          >
            {minimized ? "+" : "-"}
          </button>
          <button
            aria-label={`Archivar ${title}`}
            className="icon-action flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-[#8a6a31]"
            onClick={onArchive}
            title="Archivar"
            type="button"
          >
            AR
          </button>
          <button
            aria-label={`Cerrar ${title}`}
            className="icon-action flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-red-700"
            onClick={onClose}
            title="Cerrar"
            type="button"
          >
            x
          </button>
        </div>
      </div>
      {minimized ? (
        <button
          className="w-full rounded-xl border border-dashed border-[#b7c2bf] bg-[#f7faf8] px-4 py-5 text-left text-sm font-semibold text-[#46524f]"
          onClick={onRestore}
          type="button"
        >
          {title} minimizada. Abrir pestaña
        </button>
      ) : (
        <CentroHerramientasIA compact={compact} />
      )}
    </section>
  );
}

function statusLabel(status: PanelStatus) {
  if (status === "minimized") return "min.";
  if (status === "archived") return "arch.";
  if (status === "closed") return "cerr.";
  return "abierta";
}
