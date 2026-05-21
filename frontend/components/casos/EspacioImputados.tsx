type Defendant = {
  caseLink: string;
  keyData: string[];
  name: string;
  role: string;
  status: string;
  summary: string;
};

export default function EspacioImputados({
  defendants,
}: {
  defendants: Defendant[];
}) {
  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-[#84A2BD]/35 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
          Personas vinculadas
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Imputados</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {defendants.map((defendant) => (
            <div className="group relative" key={defendant.name}>
              <button className="rounded-full border border-[#84A2BD]/45 bg-[#F4F7F5] px-4 py-2 text-sm font-semibold transition hover:border-[#546FC0]/55 hover:bg-white focus-visible:border-[#546FC0]/55 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#84A2BD]/20">
                {defendant.name}
              </button>
              <div className="pointer-events-none invisible absolute left-0 top-[calc(100%+0.6rem)] z-10 w-64 rounded-lg border border-[#84A2BD]/35 bg-white p-3 opacity-0 shadow-[0_14px_34px_rgba(15,32,68,0.16)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <p className="text-sm font-semibold">{defendant.name}</p>
                <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/62">
                  {defendant.summary}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#546FC0]">
                  {defendant.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <article className="min-h-[290px] rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#84A2BD]/30 pb-4">
          <div>
            <h2 className="text-2xl font-semibold">Info de los imputados</h2>
            <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
              Vista general con datos de ejemplo del expediente.
            </p>
          </div>
          <button className="rounded-full bg-[#546FC0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F2044]">
            Editar ficha
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {defendants.map((defendant) => (
            <section
              className="rounded-lg bg-[#F4F7F5] p-4"
              key={defendant.name}
            >
              <h3 className="text-lg font-semibold">{defendant.name}</h3>
              <p className="mt-2 text-sm font-medium text-[#0F2044]/62">
                {defendant.role}
              </p>
              <div className="mt-3 rounded-lg bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#546FC0]">
                  Por que esta en el caso
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/66">
                  {defendant.caseLink}
                </p>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F2044]/48">
                  Datos para revisar
                </p>
                <ul className="mt-2 grid gap-1.5">
                  {defendant.keyData.map((item) => (
                    <li
                      className="rounded-md bg-white px-3 py-2 text-sm font-medium text-[#0F2044]/66"
                      key={item}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0F2044]">
                {defendant.status}
              </p>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}
