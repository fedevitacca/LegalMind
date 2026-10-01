import Link from "next/link";
import AgendaInteractiva from "./AgendaInteractiva";
import BotonSesion from "../../components/interfaz/BotonSesion";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import { fetchCases, fetchDeadlines } from "../../lib/legalmindServerApi";

export default async function AgendaPage() {
  const [cases, deadlines] = await Promise.all([fetchCases(), fetchDeadlines()]);
  const addEventHref = cases[0]
    ? `/casos/${cases[0].slug}/agenda/nuevo?returnTo=%2Fagenda`
    : "/casos";

  return (
    <MarcoAplicacion activeSection="Agenda">
      <section className="h-full min-h-0 overflow-hidden bg-[#F4F7F5] text-[#0F2044]">
        <header className="grid h-11 grid-cols-[minmax(150px,1fr)_minmax(260px,464px)_minmax(180px,auto)] items-center gap-4 border-b-[3px] border-[#88A9C8] bg-white px-6">
          <h1 className="brand-font text-[25px] font-semibold leading-none">
            Agenda
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
          <div className="flex items-center justify-end gap-4">
            <Link
              aria-label="Configuracion"
              className="grid h-8 w-8 place-items-center rounded-md"
              href="/configuracion"
            >
              <CogIcon />
            </Link>
            <BotonSesion className="h-8 w-8" />
          </div>
        </header>

        <AgendaInteractiva addEventHref={addEventHref} deadlines={deadlines} />
      </section>
    </MarcoAplicacion>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.7 2h2.6l.7 2.8c.5.1 1 .3 1.5.6L18 3.9l1.9 1.9-1.5 2.5c.3.5.5 1 .6 1.5l2.8.7v2.6l-2.8.7c-.1.5-.3 1-.6 1.5l1.5 2.5-1.9 1.9-2.5-1.5c-.5.3-1 .5-1.5.6l-.7 2.8h-2.6l-.7-2.8c-.5-.1-1-.3-1.5-.6L6 20.1l-1.9-1.9 1.5-2.5c-.3-.5-.5-1-.6-1.5l-2.8-.7v-2.6l2.8-.7c.1-.5.3-1 .6-1.5L4.1 5.8 6 3.9l2.5 1.5c.5-.3 1-.5 1.5-.6l.7-2.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" clipRule="evenodd" />
    </svg>
  );
}
