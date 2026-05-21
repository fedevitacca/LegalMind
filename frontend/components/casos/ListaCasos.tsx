type CaseArea = {
  label: string;
  path?: string;
  summary: string;
};

type LegalCase = {
  areas: CaseArea[];
  caption: string;
  name: string;
  slug: string;
};

export default function ListaCasos({ cases }: { cases: LegalCase[] }) {
  return (
    <section className="grid gap-4">
      {cases.map((legalCase) => (
        <article
          className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]"
          key={legalCase.name}
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#84A2BD]/35 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
                {legalCase.caption}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{legalCase.name}</h2>
            </div>
            <a
              className="rounded-full bg-[#F4F7F5] px-4 py-2 text-sm font-semibold text-[#0F2044] transition hover:bg-[#84A2BD]/25"
              href={`/casos/${legalCase.slug}/imputados`}
            >
              Abrir caso
            </a>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {legalCase.areas.map((area) =>
              area.path ? (
                <a
                  className="rounded-lg border border-transparent bg-[#F4F7F5] px-4 py-3 transition hover:border-[#84A2BD]/55 hover:bg-white"
                  href={`/casos/${legalCase.slug}/${area.path}`}
                  key={area.label}
                >
                  <AreaCopy area={area} />
                </a>
              ) : (
                <div
                  className="rounded-lg bg-[#F4F7F5] px-4 py-3 text-[#0F2044]/72"
                  key={area.label}
                >
                  <AreaCopy area={area} />
                </div>
              ),
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function AreaCopy({ area }: { area: CaseArea }) {
  return (
    <>
      <p className="font-semibold">{area.label}</p>
      <p className="mt-1 text-sm font-medium text-[#0F2044]/58">
        {area.summary}
      </p>
    </>
  );
}
