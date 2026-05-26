import EspacioAgenda from "../../components/casos/EspacioAgenda";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BarraBusqueda from "../../components/panel/BarraBusqueda";

const agendaGeneral = [
  {
    descripcion: "Caso Gomez - Presentar escrito",
    dia: "28/5",
    hora: "18:30",
    prioridad: "Alta" as const,
  },
  {
    descripcion: "Caso Gomez - Audiencia",
    dia: "30/5",
    hora: "16:00",
    prioridad: "Alta" as const,
  },
  {
    descripcion: "Caso Perez - Audiencia oral",
    dia: "1/6",
    hora: "17:00",
    prioridad: "Media" as const,
  },
  {
    descripcion: "Caso Rodriguez - Revision inicial",
    dia: "3/6",
    hora: "10:30",
    prioridad: "Baja" as const,
  },
];

const analisisAgenda = [
  {
    title: "Detectado",
    detail: "Hay dos eventos de prioridad alta esta semana.",
  },
  {
    title: "Recomendaciones",
    detail: "Revisar el escrito antes de la audiencia del Caso Gomez.",
  },
  {
    title: "Observaciones",
    detail: "Esta agenda general centraliza eventos de todos los casos.",
  },
];

export default function AgendaPage() {
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

            <EspacioAgenda editable fechas={agendaGeneral} />
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
