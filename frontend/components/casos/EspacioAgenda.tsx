type FechaAgenda = {
  descripcion: string;
  dia: string;
  hora: string;
  prioridad: "Alta" | "Media" | "Baja";
};

export default function EspacioAgenda({ fechas }: { fechas: FechaAgenda[] }) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#84A2BD]/30 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
            Fechas del expediente
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Agenda</h2>
        </div>
        <button className="rounded-full bg-[#546FC0] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044]">
          + Cargar fechas
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {fechas.map((fecha) => (
          <article
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg bg-[#F4F7F5] px-4 py-3"
            key={`${fecha.descripcion}-${fecha.dia}-${fecha.hora}`}
          >
            <div className="min-w-0">
              <h3 className="text-base font-semibold">{fecha.descripcion}</h3>
              <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
                {fecha.dia} | {fecha.hora}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                fecha.prioridad === "Alta"
                  ? "bg-[#A68147]/18 text-[#0F2044]"
                  : fecha.prioridad === "Media"
                    ? "bg-[#84A2BD]/24 text-[#0F2044]"
                    : "bg-white text-[#0F2044]/68"
              }`}
            >
              {fecha.prioridad}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
