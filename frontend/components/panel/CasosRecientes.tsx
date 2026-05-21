type RecentCase = {
  detail: string;
  name: string;
  status: string;
};

export default function CasosRecientes({ cases }: { cases: RecentCase[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
            Inicio
          </p>
          <h1 className="text-3xl font-semibold">Casos recientes</h1>
        </div>
        <a className="text-sm font-medium text-[#546FC0]" href="#">
          Ver todos
        </a>
      </div>

      <div className="grid gap-3">
        {cases.map((legalCase) => (
          <article
            className="grid grid-cols-[4px_1fr_auto] items-center gap-4 rounded-lg border border-[#84A2BD]/35 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,32,68,0.06)]"
            key={legalCase.name}
          >
            <span className="h-10 rounded-full bg-[#546FC0]" />
            <div>
              <h2 className="text-xl font-semibold">{legalCase.name}</h2>
              <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
                {legalCase.detail}
              </p>
            </div>
            <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5 text-sm font-semibold text-[#0F2044]">
              {legalCase.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
