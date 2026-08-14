"use client";

import Link from "next/link";
import { useState } from "react";
import BarraBusqueda from "../panel/BarraBusqueda";
import EspacioAgenda from "./EspacioAgenda";
import NavegacionAreasCaso from "./NavegacionAreasCaso";
import PanelAnalisisCaso, { AnalisisCaso } from "./PanelAnalisisCaso";

type FechaAgenda = {
  descripcion: string;
  dia: string;
  hora: string;
  prioridad: "Alta" | "Media" | "Baja";
};

export default function DetalleAgendaCaso({
  analisis,
  caso,
  idCaso,
}: {
  analisis?: AnalisisCaso;
  caso: {
    deadline: string;
    fechas: FechaAgenda[];
    name: string;
    status: string;
  };
  idCaso: string;
}) {
  const [analisisVisible, setAnalisisVisible] = useState(Boolean(analisis));

  return (
    <div
      className={`grid h-full min-h-0 bg-[#F4F7F5] text-[#0F2044] ${
        analisisVisible && analisis
          ? "grid-cols-[minmax(0,1fr)_285px]"
          : "grid-cols-1"
      }`}
    >
      <section className="h-full overflow-y-auto px-8 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <BarraBusqueda
            actionLabel={
              analisisVisible && analisis ? "Minimizar analisis" : "Mostrar analisis"
            }
            actionOnClick={() => setAnalisisVisible((visible) => !visible)}
            actionTone="soft"
            placeholder="Buscar fechas del caso"
          />

          <NavegacionAreasCaso activeArea="Agenda" caseSlug={idCaso} />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <header className="rounded-lg border border-[#84A2BD]/35 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
                Expediente abierto
              </p>
              <h1 className="mt-1 text-3xl font-semibold">{caso.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
                  {caso.status}
                </span>
                <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
                  {caso.fechas.length} fechas clave
                </span>
                <span className="rounded-full bg-[#A68147]/15 px-3 py-1.5 text-[#0F2044]">
                  {caso.deadline}
                </span>
              </div>
            </header>
            <Link
              className="flex min-h-[96px] items-center justify-between rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 text-[22px] leading-none transition hover:bg-white/80"
              href={`/casos/${idCaso}/agenda/nuevo`}
            >
              <span className="flex items-center gap-3">
                <CalendarIcon />
                Agregar eventos
              </span>
              <span className="text-[36px] font-semibold leading-none">&gt;</span>
            </Link>
          </div>

          <EspacioAgenda caseId={idCaso} editable fechas={caso.fechas} />
        </div>
      </section>

      {analisisVisible && analisis ? (
        <PanelAnalisisCaso analisis={analisis} />
      ) : null}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
