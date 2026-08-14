"use client";

import Link from "next/link";
import { useState } from "react";
import BotonSesion from "../interfaz/BotonSesion";
import PanelAnalisisCaso, { AnalisisCaso } from "./PanelAnalisisCaso";

type Documento = {
  categoria: string;
  confianza_extraccion?: number | null;
  download_url?: string | null;
  estado?: string;
  fecha: string;
  id?: number;
  nombre: string;
  requiere_ocr?: boolean;
  resumen: string;
  sha256?: string | null;
  version?: number;
};

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";

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
          <SummaryCard caseName={caso.name} documents={caso.documentos} />

          <div className="mt-6 grid gap-[13px]">
            {caso.documentos.length ? (
              caso.documentos.slice(0, 8).map((documento, index) => (
                <DocumentRow
                  document={documento}
                  index={index}
                  key={`${documento.nombre}-${documento.id || index}`}
                />
              ))
            ) : (
              <section className="rounded-[23px] border-2 border-dashed border-[#88A9C8] bg-white px-5 py-6">
                <h2 className="text-[28px] font-semibold leading-none">
                  Sin documentos cargados
                </h2>
                <p className="mt-3 text-[18px] leading-6">
                  Agrega documentos para completar el expediente.
                </p>
              </section>
            )}

            <Link
              className="mt-3 grid min-h-[140px] w-[408px] grid-cols-[minmax(0,1fr)_32px] items-center rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5 transition hover:bg-white/80"
              href={`/casos/${idCaso}/documentos/nuevo`}
            >
              <span>
                <PlusIcon />
                <span className="mt-3 block text-[24px] leading-none">
                  Cargar documentos
                </span>
                <span className="mt-2 block text-[18px] leading-none">
                  Agregar documentos al caso
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
  documents,
}: {
  caseName: string;
  documents: Documento[];
}) {
  const analyzed = documents.filter((document) =>
    ["texto_extraido", "analizado"].includes(document.estado || ""),
  ).length;

  return (
    <section className="w-[408px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
      <h2 className="flex items-center gap-2 text-[28px] leading-none">
        <DocumentIcon className="h-9 w-9" />
        <span>Documentos</span>
        <strong className="font-semibold">{caseName}</strong>
      </h2>
      <p className="mt-5 text-[38px] font-semibold leading-none">
        {String(documents.length).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[18px] leading-none">
        {analyzed} analizados recientemente
      </p>
    </section>
  );
}

function DocumentRow({
  document,
  index,
}: {
  document: Documento;
  index: number;
}) {
  const downloadHref = document.download_url ? `${apiUrl}${document.download_url}` : "#";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_166px] gap-6">
      <article className="flex h-[42px] items-center rounded-[21px] border-2 border-[#88A9C8] bg-white px-5">
        <DocumentIcon className="mr-3 h-7 w-7 shrink-0" />
        <span className="truncate text-[18px] leading-none">
          {document.nombre || `Documento ${index + 1}`}
        </span>
      </article>
      <a
        className={`flex h-[42px] items-center justify-center gap-2 rounded-[21px] border-2 border-[#88A9C8] bg-white px-4 text-[18px] leading-none transition ${
          document.download_url ? "hover:bg-white/80" : "pointer-events-none opacity-55"
        }`}
        href={downloadHref}
      >
        <DownloadIcon />
        Descargar
      </a>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
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

function DocumentIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path d="M6.5 3.5h7L18.5 8v12.5h-12v-17Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M13.5 3.5V8h5M9 12h6M9 16h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v10M8 10l4 4 4-4M5 18.5h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
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
