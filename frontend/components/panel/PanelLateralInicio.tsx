"use client";

import { useState } from "react";

type Alert = {
  caseName: string;
  detail: string;
  href: string;
  title: string;
};

const shortcuts = [
  { label: "Analisis IA", href: "/analisis" },
  { label: "Nuevo caso", href: "/nuevo" },
  { label: "Agenda", href: "/agenda" },
];

export default function PanelLateralInicio({ alerts }: { alerts: Alert[] }) {
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const activeAlert = alerts[activeAlertIndex];

  function goToPreviousAlert() {
    setActiveAlertIndex((index) => (index === 0 ? alerts.length - 1 : index - 1));
  }

  function goToNextAlert() {
    setActiveAlertIndex((index) => (index + 1) % alerts.length);
  }

  return (
    <aside className="h-full overflow-y-auto border-l border-[#84A2BD]/45 bg-white/90 px-5 py-6">
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <section className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)]">
            <h2 className="text-2xl font-semibold">Sin alertas</h2>
            <p className="mt-3 text-base font-medium text-[#0F2044]/60">
              Los vencimientos apareceran cuando cargues fechas importantes.
            </p>
          </section>
        ) : null}

        {activeAlert ? (
          <a
            className="block rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)] transition hover:border-[#546FC0]/55"
            href={activeAlert.href}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold">{activeAlert.title}</h2>
              {alerts.length > 1 ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0F2044]/60">
                  {activeAlertIndex + 1}/{alerts.length}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-lg font-semibold">{activeAlert.caseName}</p>
            <p className="text-base font-medium text-[#0F2044]/60">
              {activeAlert.detail}
            </p>
          </a>
        ) : null}

        {alerts.length > 1 ? (
          <div className="flex justify-end gap-2">
            <button
              aria-label="Alerta anterior"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#84A2BD]/45 bg-[#F4F7F5] text-base font-bold transition hover:bg-white"
              onClick={goToPreviousAlert}
              type="button"
            >
              {"<"}
            </button>
            <button
              aria-label="Alerta siguiente"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#84A2BD]/45 bg-[#F4F7F5] text-base font-bold transition hover:bg-white"
              onClick={goToNextAlert}
              type="button"
            >
              {">"}
            </button>
          </div>
        ) : null}

        <section className="rounded-lg bg-[#0F2044] p-4 text-white shadow-[0_10px_26px_rgba(15,32,68,0.18)]">
          <h2 className="text-xl font-semibold">Atajos</h2>
          <div className="mt-4 grid gap-2">
            {shortcuts.map((shortcut) => (
              <a
                className="rounded-lg bg-white/10 px-3 py-2 font-medium transition hover:bg-white/15"
                href={shortcut.href}
                key={shortcut.label}
              >
                {shortcut.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
