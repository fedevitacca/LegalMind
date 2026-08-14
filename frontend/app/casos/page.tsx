import Link from "next/link";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BotonSesion from "../../components/interfaz/BotonSesion";
import { CaseListItem, fetchCases } from "../../lib/legalmindServerApi";

const caseSections = [
  { label: "Imputados", path: "imputados" },
  { label: "Documentos", path: "documentos" },
  { label: "Agenda", path: "agenda" },
  { label: "Jurisprudencia", path: "jurisprudencia" },
];

export default async function CasesPage() {
  const cases = await fetchCases();
  const activeCases = cases.filter((legalCase) => legalCase.estado !== "archivada");

  return (
    <MarcoAplicacion activeSection="Casos">
      <section className="h-full min-h-0 overflow-y-auto bg-[#F4F7F5] text-[#0F2044]">
        <PageHeader />

        <main className="px-9 py-9">
          <section className="w-[288px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
            <p className="flex items-center gap-2 text-[28px] leading-none">
              <FolderIcon className="h-9 w-9" />
              Casos activos
            </p>
            <p className="mt-5 text-[38px] font-semibold leading-none">
              {String(activeCases.length).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[18px] leading-none">
              {Math.min(cases.length, 3)} actualizados hoy
            </p>
          </section>

          <section className="mt-5 grid max-w-[792px] gap-[20px]">
            {cases.length ? (
              cases.map((legalCase, index) => (
                <CaseRow
                  key={legalCase.slug}
                  legalCase={legalCase}
                  showRichMeta={index === 0}
                />
              ))
            ) : (
              <EmptyState />
            )}

            <NewCaseCard />
          </section>
        </main>
      </section>
    </MarcoAplicacion>
  );
}

function PageHeader() {
  return (
    <header className="grid min-h-[58px] grid-cols-[minmax(180px,1fr)_minmax(300px,464px)_minmax(286px,auto)] items-center gap-6 border-b-4 border-[#88A9C8] bg-white px-20">
      <h1 className="brand-font text-[34px] font-semibold leading-none">
        Casos
      </h1>
      <label className="relative block">
        <span className="absolute left-5 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          className="h-[35px] w-full rounded-full border-2 border-[#88A9C8] bg-white pl-[60px] pr-5 text-[28px] leading-none outline-none placeholder:text-[#0F2044]"
          placeholder="Buscar..."
          type="search"
        />
      </label>
      <div className="flex items-center justify-end gap-6">
        <Link
          aria-label="Configuracion"
          className="grid h-10 w-10 place-items-center rounded-md"
          href="/configuracion"
        >
          <CogIcon className="h-10 w-10" />
        </Link>
        <BotonSesion className="h-9 w-9" />
      </div>
    </header>
  );
}

function CaseRow({
  legalCase,
  showRichMeta,
}: {
  legalCase: CaseListItem;
  showRichMeta: boolean;
}) {
  const expediente = legalCase.identificador || `Expediente N° ${legalCase.id || legalCase.slug}`;
  const meta = showRichMeta
    ? [
        `${legalCase.imputados_count || 0} imputados`,
        "28 documentos",
        legalCase.proxima_alerta ? `Presentacion ${formatShortDay(legalCase.proxima_alerta)}` : "Sin vencimiento",
        "4 precedentes",
      ]
    : [expediente];

  return (
    <article>
      <Link
        className="block rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-4 transition hover:bg-white/80"
        href={`/casos/${legalCase.slug}`}
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="flex items-center gap-2 text-[29px] font-semibold leading-none">
            <UserIcon className="h-9 w-9" />
            {legalCase.name}
          </h2>
          {showRichMeta ? (
            <span className="text-[17px] leading-none">{expediente}</span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[18px] leading-none">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </Link>

      <div className="mt-[13px] grid grid-cols-4 gap-2">
        {caseSections.map((section) => (
          <SectionLink
            href={`/casos/${legalCase.slug}/${section.path}`}
            key={section.label}
            label={section.label}
          />
        ))}
      </div>
    </article>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-[43px] items-center justify-between rounded-[14px] border-2 border-[#88A9C8] bg-white px-[18px] text-[18px] leading-none transition hover:bg-white/80"
      href={href}
    >
      <span>{label}</span>
      <span className="text-[36px] font-semibold leading-none">&gt;</span>
    </Link>
  );
}

function NewCaseCard() {
  return (
    <Link
      className="mt-1 grid min-h-[140px] w-[288px] grid-cols-[minmax(0,1fr)_28px] items-center rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5 transition hover:bg-white/80"
      href="/nuevo"
    >
      <span>
        <span className="grid h-10 w-10 place-items-start">
          <PlusIcon />
        </span>
        <span className="mt-3 block text-[23px] leading-none">Nuevo caso</span>
        <span className="mt-2 block text-[17px] leading-none">
          Crear un nuevo caso
        </span>
      </span>
      <span className="text-[38px] font-semibold leading-none">&gt;</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[23px] border-2 border-dashed border-[#88A9C8] bg-white px-5 py-6">
      <h2 className="text-[28px] font-semibold leading-none">
        No hay casos guardados
      </h2>
      <p className="mt-3 text-[18px] leading-6">
        Los expedientes que crees desde Nuevo caso van a aparecer en este listado.
      </p>
    </section>
  );
}

function formatShortDay(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "short" })
    .format(date)
    .replace(".", "");
  return `${capitalize(weekday)} ${date.getDate()}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function UserIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12.2a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4ZM3.4 21.1c.8-4.3 4-6.7 8.6-6.7s7.8 2.4 8.6 6.7H3.4Z" />
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

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 7v10M7 12h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}
