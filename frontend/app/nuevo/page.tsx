import Link from "next/link";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BotonSesion from "../../components/interfaz/BotonSesion";
import FormularioNuevoCaso from "../../components/nuevo/FormularioNuevoCaso";

export default function NewCasePage() {
  return (
    <MarcoAplicacion activeSection="Casos">
      <section className="app-page h-full min-h-0 overflow-y-auto text-[#0F2044]">
        <header className="app-header sticky top-0 z-30 grid min-h-[64px] grid-cols-[minmax(180px,1fr)_minmax(300px,464px)_minmax(286px,auto)] items-center gap-6 px-12">
          <h1 className="brand-font text-[34px] font-semibold leading-none">
            Casos
          </h1>
          <label className="relative block">
            <span className="absolute left-5 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              className="h-10 w-full rounded-full border border-[#88A9C8]/60 bg-white/90 pl-[52px] pr-5 text-[18px] leading-none shadow-[0_5px_16px_rgba(15,32,68,0.05)] outline-none placeholder:text-[#0F2044]/45"
              placeholder="Buscar..."
              type="search"
            />
          </label>
          <div className="flex items-center justify-end gap-6">
            <Link
              aria-label="Configuracion"
              className="icon-action grid h-10 w-10 place-items-center rounded-xl"
              href="/configuracion"
            >
              <CogIcon className="h-10 w-10" />
            </Link>
            <BotonSesion className="h-9 w-9" />
          </div>
        </header>

        <main className="mx-auto max-w-[1540px] px-9 py-9">
          <section className="surface-card mb-[50px] flex h-[90px] w-[288px] items-center gap-2 rounded-[23px] border border-[#88A9C8] bg-white px-5 text-[28px] leading-none">
            <FolderIcon className="h-9 w-9" />
            Nuevo caso
          </section>

          <FormularioNuevoCaso />
        </main>
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

function CogIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.7 2h2.6l.7 2.8c.5.1 1 .3 1.5.6L18 3.9l1.9 1.9-1.5 2.5c.3.5.5 1 .6 1.5l2.8.7v2.6l-2.8.7c-.1.5-.3 1-.6 1.5l1.5 2.5-1.9 1.9-2.5-1.5c-.5.3-1 .5-1.5.6l-.7 2.8h-2.6l-.7-2.8c-.5-.1-1-.3-1.5-.6L6 20.1l-1.9-1.9 1.5-2.5c-.3-.5-.5-1-.6-1.5l-2.8-.7v-2.6l2.8-.7c.1-.5.3-1 .6-1.5L4.1 5.8 6 3.9l2.5 1.5c.5-.3 1-.5 1.5-.6l.7-2.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" clipRule="evenodd" />
    </svg>
  );
}

function FolderIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5.1l2 2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
    </svg>
  );
}
