import Link from "next/link";
import BotonSesion from "../interfaz/BotonSesion";

type CasoResumen = {
  analisis?: {
    documentosBase: string[];
    resumen: string;
  };
  deadline: string;
  defendants: {
    name: string;
    status: string;
    summary: string;
  }[];
  descripcion?: string | null;
  documentos?: unknown[];
  fechas?: unknown[];
  id?: number;
  identificador?: string | null;
  jurisprudencia?: unknown[];
  name: string;
  status: string;
};

const caseSections = [
  { label: "Imputados", path: "imputados" },
  { label: "Documentos", path: "documentos" },
  { label: "Agenda", path: "agenda" },
  { label: "Jurisprudencia", path: "jurisprudencia" },
  { label: "Consultas IA", path: "consultas" },
];

export default function ResumenCaso({
  caso,
  idCaso,
}: {
  caso: CasoResumen;
  idCaso: string;
}) {
  const expediente = caso.identificador || `Expediente N° ${caso.id || idCaso}`;
  const documentsCount = caso.documentos?.length ?? caso.analisis?.documentosBase.length ?? 0;
  const meta = [
    formatCount(caso.defendants.length, "imputado", "imputados"),
    formatCount(documentsCount, "documento", "documentos"),
    caso.deadline || "Sin vencimiento",
    formatCount(caso.jurisprudencia?.length, "precedente", "precedentes"),
  ];

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-[#F4F7F5] text-[#0F2044]">
      <PageHeader caseName={caso.name} />

      <main className="px-9 py-9">
        <div className="max-w-[940px]">
          <article className="rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h1 className="flex items-center gap-2 text-[29px] font-semibold leading-none">
                <UserIcon className="h-9 w-9" />
                {caso.name}
              </h1>
              <span className="text-[17px] leading-none">{expediente}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[18px] leading-none">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <p className="mt-5 max-w-[760px] text-[17px] font-medium leading-6 text-[#0F2044]/75">
              {caso.descripcion || caso.analisis?.resumen || "Descripcion pendiente del expediente."}
            </p>
          </article>

          <div className="mt-[13px] grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {caseSections.map((section) => (
              <SectionLink
                href={`/casos/${idCaso}/${section.path}`}
                key={section.label}
                label={section.label}
              />
            ))}
          </div>

          <section className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_288px]">
            <div className="rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
              <h2 className="text-[23px] font-semibold leading-none">Estado del caso</h2>
              <div className="mt-5 grid gap-3 text-[18px] leading-none sm:grid-cols-3">
                <StatusItem label="Situacion" value={caso.status || "Activa"} />
                <StatusItem label="Agenda" value={caso.deadline || "Sin vencimiento"} />
                <StatusItem label="Fechas" value={formatCount(caso.fechas?.length, "cargada", "cargadas")} />
              </div>
            </div>

            <Link
              className="grid min-h-[140px] grid-cols-[minmax(0,1fr)_28px] items-center rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5 transition hover:bg-white/80"
              href="/casos"
            >
              <span>
                <span className="grid h-10 w-10 place-items-start">
                  <FolderIcon className="h-10 w-10" />
                </span>
                <span className="mt-3 block text-[23px] leading-none">Todos los casos</span>
                <span className="mt-2 block text-[17px] leading-none">
                  Volver al listado
                </span>
              </span>
              <span className="text-[38px] font-semibold leading-none">&gt;</span>
            </Link>
          </section>
        </div>
      </main>
    </section>
  );
}

function PageHeader({ caseName }: { caseName: string }) {
  return (
    <header className="grid min-h-[58px] grid-cols-[minmax(180px,1fr)_minmax(300px,464px)_minmax(286px,auto)] items-center gap-6 border-b-4 border-[#88A9C8] bg-white px-20">
      <h2 className="brand-font text-[34px] font-semibold leading-none">
        Casos
      </h2>
      <label className="relative block">
        <span className="absolute left-5 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          className="h-[35px] w-full rounded-full border-2 border-[#88A9C8] bg-white pl-[60px] pr-5 text-[28px] leading-none outline-none placeholder:text-[#0F2044]"
          placeholder={`Buscar en ${caseName}`}
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

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-[43px] items-center justify-between rounded-[14px] border-2 border-[#88A9C8] bg-white px-[18px] text-[18px] leading-none transition hover:bg-white/80"
      href={href}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-[36px] font-semibold leading-none">&gt;</span>
    </Link>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[15px] font-semibold leading-none text-[#0F2044]/55">{label}</p>
      <p className="mt-2 text-[19px] leading-none">{value}</p>
    </div>
  );
}

function formatCount(value: number | null | undefined, singular: string, plural: string) {
  const count = value || 0;
  return `${count} ${count === 1 ? singular : plural}`;
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
