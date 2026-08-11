import BarraBusqueda from "../components/panel/BarraBusqueda";
import CasosRecientes from "../components/panel/CasosRecientes";
import MarcoAplicacion from "../components/estructura/MarcoAplicacion";
import MesaTrabajo from "../components/panel/MesaTrabajo";
import PanelLateralInicio from "../components/panel/PanelLateralInicio";
import { CaseDeadline, CaseListItem, fetchCases, fetchDeadlines } from "../lib/legalmindServerApi";

const defaultWorkItems = [
  {
    label: "Agenda",
    title: "Ordenar eventos de la semana",
    detail: "Ver tareas y vencimientos en la agenda general editable.",
    href: "/agenda",
  },
  {
    label: "IA",
    title: "Analizar texto pendiente",
    detail: "Usar el analizador para resumir o extraer datos relevantes.",
    href: "/analisis",
  },
];

export default async function Home() {
  const [cases, deadlines] = await Promise.all([fetchCases(), fetchDeadlines()]);
  const recentCases = buildRecentCases(cases);
  const alerts = buildAlerts(deadlines);
  const workItems = buildWorkItems(cases);

  return (
    <MarcoAplicacion activeSection="Dashboard">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_285px] bg-[#F4F7F5] text-[#0F2044]">
        <section className="h-full overflow-y-auto px-8 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <BarraBusqueda />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.7fr)]">
              <CasosRecientes cases={recentCases} />
              <MesaTrabajo items={workItems} />
            </div>
          </div>
        </section>

        <PanelLateralInicio alerts={alerts} />
      </div>
    </MarcoAplicacion>
  );
}

function buildRecentCases(cases: CaseListItem[]) {
  return cases.slice(0, 4).map((legalCase) => ({
    detail: legalCase.caption,
    href: `/casos/${legalCase.slug}`,
    name: legalCase.name,
    status: getCaseStatus(legalCase),
  }));
}

function buildAlerts(deadlines: CaseDeadline[]) {
  return deadlines
    .slice(0, 2)
    .map((deadline) => ({
      caseName: deadline.caratula,
      detail: formatDeadlineDetail(deadline),
      href: `/casos/${deadline.causa_id}/agenda`,
      title: getDeadlineTitle(deadline),
    }));
}

function getDeadlineTitle(deadline: CaseDeadline) {
  if (deadline.prioridad === "urgente" || (deadline.dias_restantes ?? 8) <= 0) {
    return "Urgente";
  }

  return "Proximo";
}

function formatDeadlineDetail(deadline: CaseDeadline) {
  const dateLabel = deadline.fecha
    ? new Date(deadline.fecha).toLocaleDateString("es-AR")
    : deadline.fecha_texto || "Sin fecha";
  const daysLabel =
    deadline.dias_restantes === null
      ? ""
      : deadline.dias_restantes <= 0
        ? "vence hoy"
        : `faltan ${deadline.dias_restantes} dias`;

  return [deadline.evento, dateLabel, daysLabel].filter(Boolean).join(" | ");
}

function buildWorkItems(cases: CaseListItem[]) {
  const latestCase = cases[0];

  if (!latestCase) {
    return defaultWorkItems;
  }

  return [
    {
      label: "Proximo paso",
      title: `Revisar ${latestCase.name}`,
      detail: "Abrir el expediente guardado y completar documentos, agenda o imputados.",
      href: `/casos/${latestCase.slug}`,
    },
    ...defaultWorkItems,
  ];
}

function getCaseStatus(legalCase: CaseListItem) {
  if (legalCase.alert_level === "urgente") {
    return "Urgente";
  }

  if (legalCase.alert_level === "proximo") {
    return "Proximo";
  }

  return legalCase.estado || "Activo";
}
