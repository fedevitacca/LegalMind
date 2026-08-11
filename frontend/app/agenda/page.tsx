import EspacioAgenda from "../../components/casos/EspacioAgenda";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BarraBusqueda from "../../components/panel/BarraBusqueda";
import { fetchCases, fetchDeadlines } from "../../lib/legalmindServerApi";

const analisisAgenda = [
  {
    title: "Detectado",
    detail: "Los eventos se toman de las fechas importantes cargadas en cada caso.",
  },
  {
    title: "Recomendaciones",
    detail: "Completa las fechas al crear el expediente para que aparezcan en agenda.",
  },
  {
    title: "Observaciones",
    detail: "Esta agenda general centraliza eventos de todos los casos.",
  },
];

export default async function AgendaPage() {
  const [cases, deadlines] = await Promise.all([fetchCases(), fetchDeadlines()]);
  const agendaGeneral = deadlines
    .filter((deadline) => deadline.fecha)
    .map((deadline) => {
      const date = new Date(deadline.fecha as string);

      return {
        descripcion: `${deadline.caratula} - ${deadline.evento}`,
        dia: `${date.getDate()}/${date.getMonth() + 1}`,
        hora: "09:00",
        id: deadline.id,
        prioridad: toUiPriority(deadline.prioridad),
      };
    });

  return (
    <MarcoAplicacion activeSection="Agenda">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_285px] bg-[#F4F7F5] text-[#0F2044]">
        <section className="h-full overflow-y-auto px-8 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <BarraBusqueda placeholder="Buscar eventos, casos o vencimientos" />

            <header className="rounded-lg border border-[#84A2BD]/35 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
                Agenda general
              </p>
              <h1 className="mt-1 text-3xl font-semibold">Agenda</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#0F2044]/62">
                Vista centralizada para consultar, cargar y ordenar eventos de
                todos los casos sin entrar caso por caso.
              </p>
            </header>

            <EspacioAgenda
              caseOptions={cases.map((legalCase) => ({
                id: legalCase.id || legalCase.slug,
                name: legalCase.name,
              }))}
              editable
              fechas={agendaGeneral}
            />
          </div>
        </section>

        <aside className="h-full overflow-y-auto border-l border-[#84A2BD]/45 bg-white/90 px-5 py-6">
          <h2 className="text-2xl font-semibold">Analisis IA</h2>
          <div className="mt-4 grid gap-3">
            {analisisAgenda.map((item) => (
              <section
                className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)]"
                key={item.title}
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-5 text-[#0F2044]/62">
                  {item.detail}
                </p>
              </section>
            ))}
          </div>
        </aside>
      </div>
    </MarcoAplicacion>
  );
}

function toUiPriority(priority: "baja" | "media" | "alta" | "urgente") {
  if (priority === "urgente" || priority === "alta") {
    return "Alta" as const;
  }

  if (priority === "baja") {
    return "Baja" as const;
  }

  return "Media" as const;
}
