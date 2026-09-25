import Link from "next/link";
import FormularioNuevoEvento from "../../../../../components/casos/FormularioNuevoEvento";
import MarcoAplicacion from "../../../../../components/estructura/MarcoAplicacion";
import BotonSesion from "../../../../../components/interfaz/BotonSesion";

export default async function PaginaNuevoEvento({
  params,
  searchParams,
}: {
  params: Promise<{ idCaso: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const { idCaso } = await params;
  const query = searchParams ? await searchParams : {};
  const returnTo = getSafeReturnTo(query.returnTo, `/casos/${idCaso}/agenda`);
  const isAgendaFlow = returnTo === "/agenda";

  return (
    <MarcoAplicacion activeSection={isAgendaFlow ? "Agenda" : "Casos"}>
      <section className="h-full min-h-0 overflow-hidden bg-[#F4F7F5] text-[#0F2044]">
        <header className="grid h-11 grid-cols-[minmax(150px,1fr)_minmax(240px,420px)_minmax(180px,auto)] items-center gap-4 border-b-[3px] border-[#88A9C8] bg-white px-6">
          <h1 className="brand-font text-[25px] font-semibold leading-none">
            {isAgendaFlow ? "Agenda" : "Casos"}
          </h1>
          <label className="relative block">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              className="h-8 w-full rounded-full border-2 border-[#88A9C8] bg-white pl-11 pr-4 text-[18px] leading-none outline-none placeholder:text-[#0F2044]"
              placeholder="Buscar..."
              type="search"
            />
          </label>
          <div className="flex items-center justify-end gap-3">
            <Link
              aria-label="Configuracion"
              className="grid h-8 w-8 place-items-center rounded-md"
              href="/configuracion"
            >
              <CogIcon className="h-7 w-7" />
            </Link>
            <BotonSesion className="h-8 w-8" />
          </div>
        </header>

        <main className="grid h-[calc(100vh-44px)] min-h-0 grid-rows-[52px_minmax(0,1fr)] gap-3 px-7 py-4">
          <section className="flex h-[52px] w-[238px] items-center gap-3 rounded-[14px] border-2 border-[#88A9C8] bg-white px-4 text-[20px] leading-none">
            <CalendarIcon className="h-7 w-7" />
            Agregar eventos
          </section>

          <FormularioNuevoEvento caseId={idCaso} returnTo={returnTo} />
        </main>
      </section>
    </MarcoAplicacion>
  );
}

function getSafeReturnTo(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function CogIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.7 2h2.6l.7 2.8c.5.1 1 .3 1.5.6L18 3.9l1.9 1.9-1.5 2.5c.3.5.5 1 .6 1.5l2.8.7v2.6l-2.8.7c-.1.5-.3 1-.6 1.5l1.5 2.5-1.9 1.9-2.5-1.5c-.5.3-1 .5-1.5.6l-.7 2.8h-2.6l-.7-2.8c-.5-.1-1-.3-1.5-.6L6 20.1l-1.9-1.9 1.5-2.5c-.3-.5-.5-1-.6-1.5l-2.8-.7v-2.6l2.8-.7c.1-.5.3-1 .6-1.5L4.1 5.8 6 3.9l2.5 1.5c.5-.3 1-.5 1.5-.6l.7-2.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" clipRule="evenodd" />
    </svg>
  );
}

function CalendarIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
