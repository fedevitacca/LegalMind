"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type AccessStatus = "accion" | "cargado" | "ia" | "pendiente";

type AccessItem = {
  detail: string;
  href: string;
  keywords: string;
  label: string;
  status: AccessStatus;
};

const filters: { label: string; value: "todos" | AccessStatus }[] = [
  { label: "Todos", value: "todos" },
  { label: "Pendientes", value: "pendiente" },
  { label: "Cargados", value: "cargado" },
  { label: "Acciones", value: "accion" },
  { label: "IA", value: "ia" },
];

export default function FiltrosAccesosExpediente({
  counts,
  deadline,
  idCaso,
}: {
  counts: {
    documentos: number;
    fechas: number;
    imputados: number;
    jurisprudencia: number;
  };
  deadline: string;
  idCaso: string;
}) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["value"]>("todos");
  const [query, setQuery] = useState("");
  const items = useMemo(
    () => buildAccessItems(idCaso, counts, deadline),
    [counts, deadline, idCaso],
  );
  const normalizedQuery = normalize(query);
  const visibleItems = items.filter((item) => {
    const matchesFilter = activeFilter === "todos" || item.status === activeFilter;
    const matchesQuery =
      !normalizedQuery ||
      normalize(`${item.label} ${item.detail} ${item.keywords}`).includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  return (
    <section className="mt-5 rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
            Control del expediente
          </p>
          <h2 className="mt-1 text-[24px] font-semibold leading-none">
            Filtros y accesos rapidos
          </h2>
        </div>
        <label className="relative block w-full max-w-[340px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            className="h-[42px] w-full rounded-full border border-[#88A9C8]/70 bg-[#F4F7F5] pl-12 pr-4 text-[16px] outline-none placeholder:text-[#0F2044]/45"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por area, accion o estado"
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.value === activeFilter;

          return (
            <button
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-[#0F2044] bg-[#0F2044] text-white"
                  : "border-[#88A9C8]/70 bg-[#F4F7F5] text-[#0F2044] hover:border-[#546FC0]"
              }`}
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {visibleItems.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <Link
              className="grid min-h-[96px] grid-cols-[minmax(0,1fr)_26px] items-center rounded-[18px] border border-[#88A9C8]/70 bg-[#F4F7F5] px-4 py-3 transition hover:border-[#546FC0] hover:bg-white"
              href={item.href}
              key={`${item.status}-${item.label}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[20px] font-semibold leading-none">
                  {item.label}
                </span>
                <span className="mt-2 block line-clamp-2 text-[14px] font-medium leading-5 text-[#0F2044]/66">
                  {item.detail}
                </span>
              </span>
              <span className="text-[30px] font-semibold leading-none">&gt;</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[14px] border-2 border-dashed border-[#88A9C8] bg-[#F4F7F5] px-4 py-4 text-[16px] font-medium text-[#0F2044]/68">
          No hay accesos que coincidan con el filtro actual.
        </p>
      )}
    </section>
  );
}

function buildAccessItems(
  idCaso: string,
  counts: {
    documentos: number;
    fechas: number;
    imputados: number;
    jurisprudencia: number;
  },
  deadline: string,
): AccessItem[] {
  return [
    {
      detail: `${counts.imputados} imputado${counts.imputados === 1 ? "" : "s"} cargado${counts.imputados === 1 ? "" : "s"}`,
      href: `/casos/${idCaso}/imputados`,
      keywords: "personas imputados partes",
      label: "Imputados",
      status: counts.imputados ? "cargado" : "pendiente",
    },
    {
      detail: `${counts.documentos} documento${counts.documentos === 1 ? "" : "s"} en el expediente`,
      href: `/casos/${idCaso}/documentos`,
      keywords: "archivos prueba pdf documentos",
      label: "Documentos",
      status: counts.documentos ? "cargado" : "pendiente",
    },
    {
      detail: counts.fechas ? `${counts.fechas} fecha${counts.fechas === 1 ? "" : "s"} clave | ${deadline}` : deadline,
      href: `/casos/${idCaso}/agenda`,
      keywords: "agenda vencimientos fechas recordatorios",
      label: "Agenda",
      status: counts.fechas ? "cargado" : "pendiente",
    },
    {
      detail: `${counts.jurisprudencia} precedente${counts.jurisprudencia === 1 ? "" : "s"} vinculado${counts.jurisprudencia === 1 ? "" : "s"}`,
      href: `/casos/${idCaso}/jurisprudencia`,
      keywords: "fallos jurisprudencia precedentes",
      label: "Jurisprudencia",
      status: counts.jurisprudencia ? "cargado" : "pendiente",
    },
    {
      detail: "Tareas, audiencias, clientes, honorarios, escritos y control interno",
      href: `/casos/${idCaso}/gestion`,
      keywords: "trabajo tareas checklist audiencia clientes honorarios portal revision",
      label: "Gestion juridica",
      status: "accion",
    },
    {
      detail: "Abrir consultas y analisis guardados del caso",
      href: `/casos/${idCaso}/consultas`,
      keywords: "ia consultas analisis inteligencia artificial",
      label: "Consultas IA",
      status: "ia",
    },
    {
      detail: "Agregar una persona vinculada al expediente",
      href: `/casos/${idCaso}/imputados/nuevo`,
      keywords: "nuevo imputado persona alta",
      label: "Nuevo imputado",
      status: "accion",
    },
    {
      detail: "Subir prueba, escritos, resoluciones o archivos",
      href: `/casos/${idCaso}/documentos/nuevo`,
      keywords: "cargar documento archivo prueba pdf",
      label: "Cargar documento",
      status: "accion",
    },
    {
      detail: "Crear vencimiento, audiencia o fecha relevante",
      href: `/casos/${idCaso}/agenda/nuevo`,
      keywords: "agenda evento vencimiento fecha",
      label: "Agendar evento",
      status: "accion",
    },
    {
      detail: "Vincular un fallo o criterio juridico al caso",
      href: `/casos/${idCaso}/jurisprudencia/nuevo`,
      keywords: "fallo jurisprudencia precedente criterio",
      label: "Cargar fallo",
      status: "accion",
    },
  ];
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}
