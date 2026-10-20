import Link from "next/link";
import Image from "next/image";

const sideItems = [
  { icon: HomeIcon, label: "Dashboard", href: "/dashboard" },
  { icon: FolderIcon, label: "Casos", href: "/casos" },
  { icon: SparkIcon, label: "Analisis", href: "/analisis" },
  { icon: CalendarIcon, label: "Agenda", href: "/agenda" },
  { icon: WorkIcon, label: "Trabajo", href: "/trabajo" },
  { icon: SettingsIcon, label: "Configuracion", href: "/configuracion" },
];

export default function BarraLateral({
  activeSection,
}: {
  activeSection: string;
}) {
  return (
    <aside className="relative z-20 h-full overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#10254d_0%,#0b1935_100%)] px-5 py-7 text-white shadow-[10px_0_35px_rgba(15,32,68,0.16)]">
      <Link
        className="group block w-fit rounded-xl outline-none transition duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/70"
        href="/dashboard"
        aria-label="Ir al dashboard de LegalMind"
      >
        <Image
          alt="LegalMind"
          className="h-[104px] w-[104px] rounded-2xl drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] transition duration-300 group-hover:drop-shadow-[0_14px_24px_rgba(0,0,0,0.3)]"
          height={118}
          priority
          src="/legalmind-logo.png"
          width={118}
        />
      </Link>

      <nav className="mt-10 space-y-2" aria-label="Navegacion principal">
        {sideItems.map((item) => {
          const isActive = item.label === activeSection;
          const Icon = item.icon;

          return (
            <Link
              className={`group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-xl px-3 text-[19px] font-medium leading-none transition duration-200 ${
                isActive
                  ? "bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.12)]"
                  : "text-white/75 hover:translate-x-1 hover:bg-white/8 hover:text-white"
              }`}
              href={item.href}
              key={item.label}
            >
              {isActive ? (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#88A9C8] shadow-[0_0_12px_rgba(136,169,200,0.8)]" />
              ) : null}
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center transition duration-200 ${isActive ? "text-[#B9D2EA]" : "text-white/70 group-hover:text-white"}`}
              >
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
    <svg
      aria-hidden="true"
      className="h-[31px] w-[31px]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6.4H9V21H3.5a.5.5 0 0 1-.5-.5v-9.7Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[34px] w-[34px]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5.1l2 2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[34px] w-[34px]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6 3.5v3M18 3.5v3M4 8.5h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[34px] w-[34px]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M10 3 8.4 8.4 3 10l5.4 1.6L10 17l1.6-5.4L17 10l-5.4-1.6L10 3ZM17 13l-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[37px] w-[37px]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10.6 2h2.8l.7 3a7.4 7.4 0 0 1 1.5.6l2.6-1.6 2 2-1.6 2.6c.3.5.5 1 .6 1.5l3 .7v2.8l-3 .7a7.4 7.4 0 0 1-.6 1.5l1.6 2.6-2 2-2.6-1.6c-.5.3-1 .5-1.5.6l-.7 3h-2.8l-.7-3a7.4 7.4 0 0 1-1.5-.6l-2.6 1.6-2-2 1.6-2.6a7.4 7.4 0 0 1-.6-1.5l-3-.7v-2.8l3-.7c.1-.5.3-1 .6-1.5L3.8 6l2-2 2.6 1.6c.5-.3 1-.5 1.5-.6l.7-3ZM12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[34px] w-[34px]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M8 6V4.8C8 3.8 8.8 3 9.8 3h4.4c1 0 1.8.8 1.8 1.8V6M4 8h16v11.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M4 12h16M10 12v2h4v-2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
