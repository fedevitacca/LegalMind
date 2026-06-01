import Link from "next/link";
import BarraBusqueda from "../panel/BarraBusqueda";
import NavegacionAreasCaso from "./NavegacionAreasCaso";

type CasoResumen = {
  analisis?: {
    documentosBase: string[];
    resumen: string;
  };
  deadline: string;
  defendants: {
    name: string;
    status: string;
    summary: string;
  }[];
  descripcion?: string | null;
  name: string;
  status: string;
};

const previewAreas = [
  {
    href: "imputados",
    label: "Imputados",
    action: "Ver fichas",
    fallback: "Fichas de personas vinculadas al expediente.",
  },
  {
    href: "documentos",
    label: "Documentos",
    action: "Ver documentos",
    fallback: "Escritos, informes y archivos asociados al caso.",
  },
  {
    href: "agenda",
    label: "Agenda",
    action: "Ver agenda",
    fallback: "Fechas clave, vencimientos y audiencias del expediente.",
  },
  {
    href: "jurisprudencia",
    label: "Jurisprudencia",
    action: "Ver jurisprudencia",
    fallback: "Criterios, fallos y material de consulta para el caso.",
  },
];

export default function ResumenCaso({
  caso,
  idCaso,
}: {
  caso: CasoResumen;
  idCaso: string;
}) {
  const firstDefendant = caso.defendants[0];

  const previews = previewAreas.map((area) => {
    if (area.href === "imputados") {
      return {
        ...area,
        metric: `${caso.defendants.length} cargados`,
        summary: firstDefendant
          ? `${firstDefendant.name}: ${firstDefendant.summary}`
          : area.fallback,
      };
    }

    if (area.href === "documentos") {
      return {
        ...area,
        metric: `${caso.analisis?.documentosBase.length ?? 0} referenciados`,
        summary: caso.analisis?.documentosBase[0]
          ? `Ultima referencia: ${caso.analisis.documentosBase[0]}`
          : area.fallback,
      };
    }

    if (area.href === "agenda") {
      return {
        ...area,
        metric: caso.deadline,
        summary: "Seguimiento rapido de plazos y proximas tareas del expediente.",
      };
    }

    return {
      ...area,
      metric: "Base inicial",
      summary: "Espacio para guardar fallos, criterios y busquedas utiles.",
    };
  });

  return (
    <section className="h-full overflow-y-auto bg-[#F4F7F5] px-8 py-5 text-[#0F2044]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <BarraBusqueda
          actionHref={`/casos/${idCaso}/documentos`}
          actionLabel="Cargar documentos"
          placeholder="Buscar dentro del caso"
        />

        <NavegacionAreasCaso activeArea="Resumen" caseSlug={idCaso} />

        <header className="rounded-lg border border-[#84A2BD]/35 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
                Expediente abierto
              </p>
              <h1 className="mt-1 text-3xl font-semibold">{caso.name}</h1>
            </div>
            <Link
              className="rounded-full bg-[#F4F7F5] px-4 py-2 text-sm font-semibold text-[#0F2044] transition hover:bg-[#84A2BD]/25"
              href="/casos"
            >
              Ver todos los casos
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
              {caso.status}
            </span>
            <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
              {caso.defendants.length} imputados
            </span>
            <span className="rounded-full bg-[#A68147]/15 px-3 py-1.5">
              {caso.deadline}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-[#0F2044]/68">
            {caso.analisis?.resumen || caso.descripcion || "Resumen operativo del expediente."}
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {previews.map((area) => (
            <Link
              className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)] transition hover:border-[#546FC0]/55 hover:shadow-[0_14px_30px_rgba(15,32,68,0.1)]"
              href={`/casos/${idCaso}/${area.href}`}
              key={area.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
                    {area.metric}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{area.label}</h2>
                </div>
                <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5 text-xs font-semibold">
                  {area.action}
                </span>
              </div>
              <p className="mt-4 text-sm font-medium leading-6 text-[#0F2044]/64">
                {area.summary}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
