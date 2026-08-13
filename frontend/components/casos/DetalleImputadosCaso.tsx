"use client";

import Link from "next/link";
import { useState } from "react";
import BotonSesion from "../interfaz/BotonSesion";
import PanelAnalisisCaso, { AnalisisCaso } from "./PanelAnalisisCaso";

type Imputado = {
  caseLink: string;
  keyData: string[];
  name: string;
  role: string;
  status: string;
  summary: string;
};

export default function DetalleImputadosCaso({
  analisis,
  caso,
  idCaso,
}: {
  analisis?: AnalisisCaso;
  caso: {
    deadline: string;
    defendants: Imputado[];
    name: string;
    status: string;
  };
  idCaso: string;
}) {
  const [analisisVisible, setAnalisisVisible] = useState(Boolean(analisis));

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-[#F4F7F5] text-[#0F2044]">
      <PageHeader />

      <main
        className={`grid gap-6 px-9 py-9 ${
          analisisVisible && analisis
            ? "grid-cols-[minmax(0,792px)_280px]"
            : "grid-cols-[minmax(0,792px)]"
        }`}
      >
        <section className="min-w-0">
          <SummaryCard caseName={caso.name} defendants={caso.defendants} />

          <div className="mt-6 grid gap-6">
            {caso.defendants.length ? (
              caso.defendants.map((defendant) => (
                <DefendantRow defendant={defendant} key={defendant.name} />
              ))
            ) : (
              <section className="rounded-[23px] border-2 border-dashed border-[#88A9C8] bg-white px-5 py-6">
                <h2 className="text-[28px] font-semibold leading-none">
                  Sin imputados cargados
                </h2>
                <p className="mt-3 text-[18px] leading-6">
                  Agrega personas vinculadas para completar el expediente.
                </p>
              </section>
            )}

            <Link
              className="grid min-h-[140px] w-[408px] grid-cols-[minmax(0,1fr)_32px] items-center rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5 transition hover:bg-white/80"
              href={`/casos/${idCaso}/imputados/nuevo`}
            >
              <span>
                <PlusIcon />
                <span className="mt-3 block text-[24px] leading-none">
                  Cargar imputados
                </span>
                <span className="mt-2 block text-[18px] leading-none">
                  Agregar imputados al caso
                </span>
              </span>
              <span className="text-[38px] font-semibold leading-none">&gt;</span>
            </Link>
          </div>
        </section>

        {analisisVisible && analisis ? (
          <aside className="min-w-0">
            <button
              className="mb-5 flex h-[43px] w-full items-center justify-between rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 text-[18px] leading-none transition hover:bg-white/80"
              onClick={() => setAnalisisVisible(false)}
              type="button"
            >
              <span>Minimizar</span>
              <span className="text-[28px] font-semibold leading-none">-</span>
            </button>
            <PanelAnalisisCaso analisis={analisis} variant="wireframe" />
          </aside>
        ) : analisis ? (
          <button
            className="h-[43px] w-[280px] rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 text-left text-[18px] transition hover:bg-white/80"
            onClick={() => setAnalisisVisible(true)}
            type="button"
          >
            Mostrar analisis IA
          </button>
        ) : null}
      </main>
    </section>
  );
}

function PageHeader() {
  return (
    <header className="grid min-h-[58px] grid-cols-[minmax(180px,1fr)_minmax(300px,464px)_144px] items-center border-b-4 border-[#88A9C8] bg-white px-20">
      <h1 className="brand-font text-[34px] font-semibold leading-none">
        Casos
      </h1>
      <label className="relative block">
        <span className="absolute left-5 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          className="h-[35px] w-full rounded-full border-2 border-[#88A9C8] bg-white pl-[60px] pr-5 text-[28px] leading-none outline-none placeholder:text-[#0F2044]"
          placeholder="Buscar..."
          type="search"
        />
      </label>
      <div className="flex items-center justify-end gap-6">
        <Link
          aria-label="Configuracion"
          className="grid h-10 w-10 place-items-center rounded-md"
          href="/configuracion"
        >
          <CogIcon className="h-10 w-10" />
        </Link>
        <BotonSesion className="h-9 w-9" />
      </div>
    </header>
  );
}

function SummaryCard({
  caseName,
  defendants,
}: {
  caseName: string;
  defendants: Imputado[];
}) {
  return (
    <section className="w-[408px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
      <h2 className="flex items-center gap-2 text-[28px] leading-none">
        <UserIcon className="h-9 w-9" />
        <span>Imputados</span>
        <strong className="font-semibold">{caseName}</strong>
      </h2>
      <p className="mt-5 text-[38px] font-semibold leading-none">
        {String(defendants.length).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[18px] leading-none">
        {Math.min(defendants.length, 1)} agregados recientemente
      </p>
    </section>
  );
}

function DefendantRow({ defendant }: { defendant: Imputado }) {
  const age = extractAge(defendant);
  const description = defendant.summary || defendant.caseLink;

  return (
    <article className="rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h2 className="flex items-center gap-2 text-[28px] leading-none">
          <UserIcon className="h-9 w-9" />
          {defendant.name}
        </h2>
        <span className="text-[17px] leading-none">{defendant.role}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[18px] leading-none">
        <span>{age}</span>
        <span>{description}</span>
      </div>
    </article>
  );
}

function extractAge(defendant: Imputado) {
  const source = [defendant.summary, defendant.caseLink, ...defendant.keyData].join(" ");
  const match = source.match(/(\d{1,3})\s*a[nñ]os/i);
  return match ? `${match[1]} anos` : defendant.status;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function UserIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12.2a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4ZM3.4 21.1c.8-4.3 4-6.7 8.6-6.7s7.8 2.4 8.6 6.7H3.4Z" />
    </svg>
  );
}

function CogIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.7 2h2.6l.7 2.8c.5.1 1 .3 1.5.6L18 3.9l1.9 1.9-1.5 2.5c.3.5.5 1 .6 1.5l2.8.7v2.6l-2.8.7c-.1.5-.3 1-.6 1.5l1.5 2.5-1.9 1.9-2.5-1.5c-.5.3-1 .5-1.5.6l-.7 2.8h-2.6l-.7-2.8c-.5-.1-1-.3-1.5-.6L6 20.1l-1.9-1.9 1.5-2.5c-.3-.5-.5-1-.6-1.5l-2.8-.7v-2.6l2.8-.7c.1-.5.3-1 .6-1.5L4.1 5.8 6 3.9l2.5 1.5c.5-.3 1-.5 1.5-.6l.7-2.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 7v10M7 12h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}
