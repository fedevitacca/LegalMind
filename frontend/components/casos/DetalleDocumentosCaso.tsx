"use client";

import { useState } from "react";
import BarraBusqueda from "../panel/BarraBusqueda";
import EspacioDocumentos from "./EspacioDocumentos";
import NavegacionAreasCaso from "./NavegacionAreasCaso";
import PanelAnalisisCaso, { AnalisisCaso } from "./PanelAnalisisCaso";

type Documento = {
  categoria: string;
  fecha: string;
  nombre: string;
  resumen: string;
};

export default function DetalleDocumentosCaso({
  analisis,
  caso,
  idCaso,
}: {
  analisis?: AnalisisCaso;
  caso: {
    deadline: string;
    documentos: Documento[];
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
            placeholder="Buscar documentos del caso"
          />

          <NavegacionAreasCaso activeArea="Documentos" caseSlug={idCaso} />

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
                {caso.documentos.length} documentos
              </span>
              <span className="rounded-full bg-[#A68147]/15 px-3 py-1.5 text-[#0F2044]">
                {caso.deadline}
              </span>
            </div>
          </header>

          <EspacioDocumentos documentos={caso.documentos} />
        </div>
      </section>

      {analisisVisible && analisis ? (
        <PanelAnalisisCaso analisis={analisis} />
      ) : null}
    </div>
  );
}
