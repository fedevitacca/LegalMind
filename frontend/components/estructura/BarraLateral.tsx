import Link from "next/link";
import Image from "next/image";

const sideItems = [
  { icon: HomeIcon, label: "Dashboard", href: "/dashboard" },
  { icon: FolderIcon, label: "Casos", href: "/casos" },
  { icon: SparkIcon, label: "Analisis IA", href: "/analisis" },
  { icon: CalendarIcon, label: "Agenda", href: "/agenda" },
  { icon: SettingsIcon, label: "Configuracion", href: "/configuracion" },
];

export default function BarraLateral({
  activeSection,
}: {
  activeSection: string;
}) {
  return (
    <aside className="h-full overflow-y-auto bg-[#0F2044] px-6 py-8 text-white">
      <Link
        className="block w-fit rounded-[6px]"
        href="/dashboard"
        aria-label="Ir al dashboard de LegalMind"
      >
        <Image
          alt="LegalMind"
          className="h-[118px] w-[118px]"
          height={118}
          priority
          src="/legalmind-logo.png"
          width={118}
        />
      </Link>

      <nav className="mt-[42px] space-y-[30px]">
        {sideItems.map((item) => {
          const isActive = item.label === activeSection;
          const Icon = item.icon;

          return (
            <Link
              className={`flex h-10 items-center gap-[14px] rounded-[6px] px-0 text-[28px] font-normal leading-none transition ${
                isActive
                  ? "text-white"
                  : "text-white/88 hover:text-white"
              }`}
              href={item.href}
              key={item.label}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center text-white">
                <Icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="h-[31px] w-[31px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6.4H9V21H3.5a.5.5 0 0 1-.5-.5v-9.7Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="h-[34px] w-[34px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5.1l2 2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-[34px] w-[34px]" viewBox="0 0 24 24" fill="none">
      <path d="M6 3.5v3M18 3.5v3M4 8.5h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-[34px] w-[34px]" viewBox="0 0 24 24" fill="none">
      <path d="M10 3 8.4 8.4 3 10l5.4 1.6L10 17l1.6-5.4L17 10l-5.4-1.6L10 3ZM17 13l-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="h-[37px] w-[37px]" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.6 2h2.8l.7 3a7.4 7.4 0 0 1 1.5.6l2.6-1.6 2 2-1.6 2.6c.3.5.5 1 .6 1.5l3 .7v2.8l-3 .7a7.4 7.4 0 0 1-.6 1.5l1.6 2.6-2 2-2.6-1.6c-.5.3-1 .5-1.5.6l-.7 3h-2.8l-.7-3a7.4 7.4 0 0 1-1.5-.6l-2.6 1.6-2-2 1.6-2.6a7.4 7.4 0 0 1-.6-1.5l-3-.7v-2.8l3-.7c.1-.5.3-1 .6-1.5L3.8 6l2-2 2.6 1.6c.5-.3 1-.5 1.5-.6l.7-3ZM12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z" clipRule="evenodd" />
    </svg>
  );
}
