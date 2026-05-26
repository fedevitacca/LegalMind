import BarraBusqueda from "../components/panel/BarraBusqueda";
import CasosRecientes from "../components/panel/CasosRecientes";
import MarcoAplicacion from "../components/estructura/MarcoAplicacion";
import PanelLateralInicio from "../components/panel/PanelLateralInicio";
import PanelVencimientos from "../components/panel/PanelVencimientos";

const recentCases = [
  {
    name: "Caso Gomez",
    detail: "Vence hoy",
    href: "/casos/caso-gomez/agenda",
    status: "Urgente",
  },
  {
    name: "Caso Perez",
    detail: "Audiencia en 6 dias",
    href: "/casos/caso-perez/agenda",
    status: "Proximo",
  },
  {
    name: "Caso Rodriguez",
    detail: "Resumen IA actualizado",
    href: "/casos/caso-rodriguez/imputados",
    status: "Activo",
  },
  {
    name: "Caso Fernandez",
    detail: "Documentacion pendiente",
    href: "/casos",
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
    <MarcoAplicacion activeSection="Dashboard">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_285px] bg-[#F4F7F5] text-[#0F2044]">
        <section className="h-full overflow-y-auto px-8 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <BarraBusqueda />
            <CasosRecientes cases={recentCases} />

            <section className="grid gap-4 lg:grid-cols-2">
              <PanelVencimientos title="Vencimientos hoy" items={todayDeadlines} />
              <PanelVencimientos
                title="Vencimientos esta semana"
                items={weekDeadlines}
              />
            </section>
          </div>
        </section>

        <PanelLateralInicio alerts={alerts} />
      </div>
    </MarcoAplicacion>
  );
}
