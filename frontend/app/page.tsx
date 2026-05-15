const recentCases = [
  {
    name: "Gomez",
    detail: "Expediente general actualizado",
    tag: "Penal federal",
  },
  {
    name: "Perez",
    detail: "Ficha por imputado pendiente",
    tag: "Documentos",
  },
  {
    name: "Rodriguez",
    detail: "Resumen automatico disponible",
    tag: "IA",
  },
];

const todayDeadlines = [
  "Presentacion de escrito en Caso Gomez",
  "Revision de prueba documental",
];

const weekDeadlines = [
  "Audiencia preliminar de Caso Perez",
  "Control de documentacion de Caso Rodriguez",
  "Comparacion de imputaciones pendientes",
];

const sideItems = ["Dashboard", "Casos", "Agenda", "Configuracion"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4F7F5] text-[#0F2044]">
      <header className="flex h-16 items-center justify-between border-b-4 border-[#0F2044] bg-white px-6 md:px-8">
        <div className="text-3xl font-black tracking-tight">LegalMind</div>
        <nav className="flex items-center gap-4 text-base font-semibold md:text-xl">
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[#0F2044] text-white transition hover:bg-[#546FC0]">
            <span aria-hidden="true">⚙</span>
            <span className="sr-only">Configuracion</span>
          </button>
          <a className="transition hover:text-[#546FC0]" href="#">
            Login
          </a>
          <a
            className="rounded-md bg-[#A68147] px-4 py-2 text-white transition hover:bg-[#546FC0]"
            href="#"
          >
            Sign Up
          </a>
        </nav>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[17rem_1fr_15.5rem]">
        <aside className="border-b-2 border-[#0F2044] bg-white md:border-b-0 md:border-r-4">
          <nav className="flex gap-2 overflow-x-auto px-4 py-4 md:block md:px-3 md:py-8">
            {sideItems.map((item) => (
              <a
                className="block min-w-fit border-[#84A2BD] px-4 py-3 text-lg font-semibold transition hover:bg-[#84A2BD]/20 md:border-b md:text-3xl"
                href="#"
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-8 md:px-16 lg:px-28">
          <div className="mx-auto flex max-w-3xl flex-col gap-12">
            <label className="relative block">
              <span className="sr-only">Buscar causas o documentos</span>
              <input
                className="h-12 w-full rounded-full border-4 border-[#0F2044] bg-white px-8 text-2xl font-semibold outline-none transition placeholder:text-[#0F2044]/45 focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/35"
                placeholder="Buscar"
                type="search"
              />
            </label>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#546FC0]">
                    Panorama general
                  </p>
                  <h1 className="mt-1 text-3xl font-black md:text-4xl">
                    Casos recientes
                  </h1>
                </div>
                <button className="rounded-md bg-[#0F2044] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#546FC0]">
                  Nuevo caso
                </button>
              </div>

              <div className="grid gap-3">
                {recentCases.map((legalCase) => (
                  <article
                    className="rounded-lg border border-[#84A2BD]/55 bg-white p-4 shadow-sm"
                    key={legalCase.name}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">
                          Caso {legalCase.name}
                        </h2>
                        <p className="mt-1 text-[#0F2044]/70">
                          {legalCase.detail}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#84A2BD]/25 px-3 py-1 text-sm font-bold text-[#0F2044]">
                        {legalCase.tag}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <DeadlineBlock title="2 vencimientos hoy" items={todayDeadlines} />
              <DeadlineBlock
                title="3 vencimientos esta semana"
                items={weekDeadlines}
              />
            </section>
          </div>
        </section>

        <aside className="border-t-2 border-[#0F2044] bg-white px-6 py-8 md:border-l md:border-t-0">
          <div className="sticky top-8 space-y-9 text-center">
            <AlertBlock
              detail="Caso Gomez"
              title="Urgente"
              tone="danger"
              value="Vence hoy"
            />
            <AlertBlock
              detail="Caso Perez"
              title="Proximo"
              tone="next"
              value="Vence en 6 dias"
            />
            <div className="rounded-lg bg-[#0F2044] p-4 text-left text-white">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#84A2BD]">
                Asistente IA
              </p>
              <p className="mt-2 text-sm leading-6">
                Resumenes, fichas por imputado, fechas clave y comparaciones en
                un mismo espacio de trabajo.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function DeadlineBlock({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <article className="rounded-lg border border-[#84A2BD]/55 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li className="flex gap-3 text-lg" key={item}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#A68147]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function AlertBlock({
  detail,
  title,
  tone,
  value,
}: {
  detail: string;
  title: string;
  tone: "danger" | "next";
  value: string;
}) {
  const color = tone === "danger" ? "bg-[#A68147]" : "bg-[#546FC0]";

  return (
    <article>
      <h2 className="text-3xl font-black">{title}</h2>
      <div className={`mx-auto mt-4 h-1 w-16 rounded-full ${color}`} />
      <p className="mt-5 text-2xl font-semibold">{detail}</p>
      <p className="mt-1 text-2xl leading-tight text-[#0F2044]/80">{value}</p>
    </article>
  );
}
