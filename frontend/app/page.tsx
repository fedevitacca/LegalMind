import BarraBusqueda from "../components/panel/BarraBusqueda";
import CasosRecientes from "../components/panel/CasosRecientes";
import MarcoAplicacion from "../components/estructura/MarcoAplicacion";
import MesaTrabajo from "../components/panel/MesaTrabajo";
import PanelLateralInicio from "../components/panel/PanelLateralInicio";

const recentCases = [
  {
    name: "Caso Gomez",
    detail: "Vence hoy",
    href: "/casos",
    status: "Urgente",
  }
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

const workItems = [
  {
    label: "Proximo paso",
    title: "Revisar escrito del Caso Gomez",
    detail: "Dejar listo el documento antes de cargarlo como presentacion.",
    href: "/casos/caso-gomez/documentos",
  },
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

export default function Home() {
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
