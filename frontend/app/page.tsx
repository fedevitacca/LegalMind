import DashboardAside from "../components/dashboard/DashboardAside";
import DeadlinePanel from "../components/dashboard/DeadlinePanel";
import RecentCases from "../components/dashboard/RecentCases";
import SearchBar from "../components/dashboard/SearchBar";
import AppFrame from "../components/layout/AppFrame";

const recentCases = [
  {
    name: "Caso Gomez",
    detail: "Vence hoy",
    status: "Urgente",
  },
  {
    name: "Caso Perez",
    detail: "Audiencia en 6 dias",
    status: "Proximo",
  },
  {
    name: "Caso Rodriguez",
    detail: "Resumen IA actualizado",
    status: "Activo",
  },
  {
    name: "Caso Fernandez",
    detail: "Documentacion pendiente",
    status: "Revision",
  },
];

const todayDeadlines = [
  "Presentar escrito en Caso Gomez",
  "Controlar documentacion de Caso Fernandez",
  "Confirmar turno con fiscalia",
];

const weekDeadlines = [
  "Audiencia preliminar de Caso Perez",
  "Actualizar ficha de imputados en Caso Rodriguez",
  "Revisar jurisprudencia enviada por IA",
  "Preparar cedula de notificacion",
];

const alerts = [
  {
    title: "Urgente",
    caseName: "Caso Gomez",
    detail: "Vence hoy",
  },
  {
    title: "Proximo",
    caseName: "Caso Perez",
    detail: "Vence en 6 dias",
  },
];

export default function Home() {
  return (
    <AppFrame>
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_285px] bg-[#F4F7F5] text-[#0F2044]">
        <section className="h-full overflow-y-auto px-8 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <SearchBar />
            <RecentCases cases={recentCases} />

            <section className="grid gap-4 lg:grid-cols-2">
              <DeadlinePanel title="Vencimientos hoy" items={todayDeadlines} />
              <DeadlinePanel
                title="Vencimientos esta semana"
                items={weekDeadlines}
              />
            </section>
          </div>
        </section>

        <DashboardAside alerts={alerts} />
      </div>
    </AppFrame>
  );
}
