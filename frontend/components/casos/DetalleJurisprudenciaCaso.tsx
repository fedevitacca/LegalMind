"use client";

import { useState } from "react";
import BarraBusqueda from "../panel/BarraBusqueda";
import NavegacionAreasCaso from "./NavegacionAreasCaso";
import PanelAnalisisCaso, { AnalisisCaso } from "./PanelAnalisisCaso";

type Fallo = {
  anio: string;
  detalle: string;
  titulo: string;
};

export default function DetalleJurisprudenciaCaso({
  caso,
  fallos,
  idCaso,
}: {
  caso: {
    analisis?: AnalisisCaso;
    deadline: string;
    name: string;
    status: string;
  };
  fallos: Fallo[];
  idCaso: string;
}) {
  const [analisisVisible, setAnalisisVisible] = useState(Boolean(caso.analisis));
  const [falloActivo, setFalloActivo] = useState(fallos[0]);

  return (
    <div
      className={`grid h-full min-h-0 bg-[#F4F7F5] text-[#0F2044] ${
        analisisVisible && caso.analisis
          ? "grid-cols-[minmax(0,1fr)_285px]"
          : "grid-cols-1"
      }`}
    >
      <section className="h-full overflow-y-auto px-8 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <BarraBusqueda
            actionLabel={
              analisisVisible && caso.analisis
                ? "- Minimizar"
                : "Mostrar analisis"
            }
            actionOnClick={() => setAnalisisVisible((visible) => !visible)}
            actionTone="soft"
            placeholder="Buscar"
          />

          <NavegacionAreasCaso activeArea="Jurisprudencia" caseSlug={idCaso} />

          <header className="px-1">
            <h1 className="text-3xl font-semibold">{caso.name}</h1>
            <p className="mt-2 text-xl font-medium text-[#0F2044]/82">
              {caso.status} | {fallos.length} fallos relacionados |{" "}
              {caso.deadline}
            </p>
          </header>

          <main className="max-w-3xl px-1">
            <h2 className="text-3xl font-semibold">Jurisprudencia</h2>

            <div className="mt-4 divide-y divide-[#84A2BD]/35 border-t border-[#84A2BD]/45">
              {fallos.map((fallo) => {
                const activo = fallo.titulo === falloActivo.titulo;

                return (
                  <button
                    className={`grid w-full grid-cols-[minmax(0,1fr)_96px] items-center gap-4 py-3 text-left transition ${
                      activo
                        ? "text-[#0F2044]"
                        : "text-[#0F2044]/72 hover:text-[#0F2044]"
                    }`}
                    key={fallo.titulo}
                    onClick={() => setFalloActivo(fallo)}
                    type="button"
                  >
                    <span className="text-2xl font-medium">{fallo.titulo}</span>
                    <span className="text-right text-2xl font-medium">
                      {fallo.anio}
                    </span>
                  </button>
                );
              })}
            </div>

            <section className="mt-6 min-h-56 rounded-lg border border-[#84A2BD]/55 bg-white px-6 py-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
              <h3 className="text-center text-2xl font-semibold">
                Detalles de los fallos
              </h3>
              <div className="mt-6 rounded-lg bg-[#F4F7F5] px-4 py-3">
                <p className="text-sm font-semibold text-[#546FC0]">
                  {falloActivo.titulo} | {falloActivo.anio}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#0F2044]/68">
                  {falloActivo.detalle}
                </p>
              </div>
            </section>

            <button
              className="mt-12 rounded-full border border-[#0F2044]/24 bg-white px-8 py-3 text-lg font-semibold text-[#0F2044] shadow-[0_8px_20px_rgba(15,32,68,0.07)] transition hover:bg-[#84A2BD]/20"
              type="button"
            >
              + Cargar fallo
            </button>
          </main>
        </div>
      </section>

      {analisisVisible && caso.analisis ? (
        <PanelAnalisisCaso analisis={caso.analisis} />
      ) : null}
    </div>
  );
}
