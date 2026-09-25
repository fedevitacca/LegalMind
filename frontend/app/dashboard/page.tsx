import Link from "next/link";
import type { ReactNode } from "react";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BotonSesion from "../../components/interfaz/BotonSesion";
import {
  CaseDeadline,
  CaseListItem,
  fetchCases,
  fetchDeadlines,
} from "../../lib/legalmindServerApi";

const quickActions = [
  {
    detail: "Crear un nuevo caso",
    href: "/nuevo",
    icon: "+",
    title: "Nuevo caso",
  },
  {
    detail: "Analizar documento",
    href: "/analisis",
    icon: "IA",
    title: "Nuevo analisis IA",
  },
];

export default async function Home() {
  const [cases, deadlines] = await Promise.all([fetchCases(), fetchDeadlines()]);
  const today = new Date();
  const activeCases = cases.filter((legalCase) => legalCase.estado !== "archivada");
  const todayDeadlines = deadlines.filter((deadline) => deadline.dias_restantes === 0);
  const urgentDeadlines = deadlines.filter(
    (deadline) => deadline.prioridad === "urgente" || (deadline.dias_restantes ?? 8) <= 1,
  );
  const latestCase = cases[0];
  const dashboardQuickActions = [
    ...quickActions,
    {
      detail: "Abrir ultimo caso abierto",
      href: latestCase ? `/casos/${latestCase.slug}` : "/casos",
      icon: "<",
      title: "Ultimo caso abierto",
    },
  ];

  return (
    <MarcoAplicacion activeSection="Dashboard">
      <section className="h-full min-h-0 overflow-hidden bg-[#F4F7F5] text-[#0F2044]">
        <header className="grid h-11 grid-cols-[minmax(150px,1fr)_minmax(240px,420px)_minmax(220px,auto)] items-center gap-4 border-b-[3px] border-[#88A9C8] bg-white px-6">
          <h1 className="brand-font text-[25px] font-semibold leading-none">
            Dashboard
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

        <main className="grid h-[calc(100vh-44px)] min-h-0 grid-cols-[minmax(0,1fr)_210px] gap-3 px-5 py-4">
          <section className="grid min-h-0 min-w-0 grid-rows-[84px_116px_minmax(0,1fr)_34px_112px] gap-3">
            <TodayCard today={today} />

            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                detail={`${Math.min(cases.length, 3)} actualizados hoy`}
                icon={<UserIcon className="h-7 w-7" />}
                label="Casos activos"
                value={String(activeCases.length).padStart(2, "0")}
              />
              <MetricCard
                detail={`${urgentDeadlines.length} vencimientos urgentes`}
                icon={<ClockIcon className="h-7 w-7" />}
                label="Vencimientos hoy"
                value={String(todayDeadlines.length).padStart(2, "0")}
              />
              <MetricCard
                detail="Sin analisis pendientes"
                label="Analisis pendientes"
                value="00"
              />
            </div>

            <div className="grid min-h-0 grid-cols-[minmax(0,1.16fr)_minmax(0,0.92fr)] gap-3">
              <DashboardPanel icon={<HistoryIcon />} title="Actividad reciente">
                {buildActivity(cases).length ? (
                  <div className="mt-3 grid gap-3">
                    {buildActivity(cases).map((item) => (
                    <div
                      className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2"
                      key={`${item.title}-${item.detail}`}
                    >
                      <span className="text-[#0F2044]">{item.icon}</span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[17px] font-semibold leading-none">
                          {item.title}
                        </h3>
                        <p className="truncate text-[14px] leading-tight text-[#0F2044]/85">
                          {item.detail}
                        </p>
                      </div>
                      <span className="text-[14px] text-[#0F2044]/85">
                        {item.time}
                      </span>
                    </div>
                    ))}
                  </div>
                ) : (
                  <EmptyPanelMessage text="Sin actividad cargada." />
                )}
              </DashboardPanel>

              <DashboardPanel icon={<ClockIcon className="h-7 w-7" />} title="Vencimientos esta semana">
                {buildWeekDeadlines(deadlines).length ? (
                  <div className="mt-3 grid gap-3">
                    {buildWeekDeadlines(deadlines).map((deadline) => (
                    <Link href={deadline.href} key={deadline.title}>
                      <h3 className="truncate text-[17px] font-semibold leading-none">
                        {deadline.title}
                      </h3>
                      <p className="truncate text-[14px] leading-tight text-[#0F2044]/85">
                        {deadline.detail}
                      </p>
                    </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyPanelMessage text="Sin vencimientos cargados." />
                )}
              </DashboardPanel>
            </div>

            <div className="grid grid-cols-[minmax(0,1.16fr)_minmax(0,0.92fr)_330px] gap-3">
              <LineLink href="/casos" label="Ver historial completo" />
              <LineLink href="/agenda" label="Ver todos los vencimientos" />
              <div className="flex h-[34px] items-center gap-2 rounded-[10px] border-2 border-[#88A9C8] bg-white px-4 text-[15px]">
                <BoltIcon />
                Accesos rapidos
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {dashboardQuickActions.map((action) => (
                <QuickAction key={action.title} {...action} />
              ))}
            </div>
          </section>

          <aside className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_34px] gap-3">
            <DashboardPanel compact icon={<AlertIcon />} title="Eventos">
              {buildEvents(deadlines).length ? (
                <div className="mt-2 overflow-hidden">
                  {buildEvents(deadlines).map((event, index) => (
                  <div
                    className={`py-3 ${index ? "border-t border-[#88A9C8]" : ""}`}
                    key={`${event.time}-${event.title}`}
                  >
                    <p className="text-[25px] font-semibold leading-none">
                      {event.time}
                    </p>
                    <h3 className="mt-1 truncate text-[16px] font-semibold leading-none">
                      {event.title}
                    </h3>
                    <p className="line-clamp-2 text-[13px] leading-tight text-[#0F2044]/85">
                      {event.detail}
                    </p>
                  </div>
                  ))}
                </div>
              ) : (
                <EmptyPanelMessage text="Sin eventos cargados." />
              )}
            </DashboardPanel>
            <LineLink href="/agenda" label="Ver agenda" />
          </aside>
        </main>
      </section>
    </MarcoAplicacion>
  );
}

function TodayCard({ today }: { today: Date }) {
  return (
    <section className="flex h-full w-[280px] flex-col justify-center rounded-[14px] border-2 border-[#88A9C8] bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-[20px] leading-none">
        <CalendarSmallIcon />
        Hoy:
      </p>
      <h2 className="mt-2 text-[25px] font-semibold leading-none">
        {formatShortDate(today)}
      </h2>
      <p className="mt-1 text-[15px] leading-none">{formatLongDate(today)}</p>
    </section>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="min-h-0 rounded-[14px] border-2 border-[#88A9C8] bg-white px-4 py-3">
      <p className="truncate text-[19px] leading-tight">
        {icon ? <span className="mr-2 inline-flex align-middle">{icon}</span> : null}
        {label}
      </p>
      <p className="mt-2 text-[31px] font-semibold leading-none">{value}</p>
      <p className="mt-1 truncate text-[14px] leading-none">{detail}</p>
    </section>
  );
}

function DashboardPanel({
  children,
  compact = false,
  icon,
  title,
}: {
  children: ReactNode;
  compact?: boolean;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section
      className={`min-h-0 overflow-hidden rounded-[14px] border-2 border-[#88A9C8] bg-white px-4 py-3 ${
        compact ? "" : ""
      }`}
    >
      <h2 className="flex items-center truncate text-[21px] font-medium leading-tight">
        <span className="mr-2 inline-flex align-middle text-[#0F2044]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyPanelMessage({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-[10px] border-2 border-dashed border-[#88A9C8] bg-white px-3 py-3 text-[14px] leading-5 text-[#0F2044]/70">
      {text}
    </p>
  );
}

function LineLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-[34px] items-center justify-between rounded-[10px] border-2 border-[#88A9C8] bg-white px-4 text-[15px] leading-none"
      href={href}
    >
      <span>{label}</span>
      <span className="text-[26px] font-semibold leading-none">&gt;</span>
    </Link>
  );
}

function QuickAction({
  detail,
  href,
  icon,
  title,
}: {
  detail: string;
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      className="grid min-h-0 grid-cols-[minmax(0,1fr)_26px] items-center rounded-[14px] border-2 border-[#88A9C8] bg-white px-4 py-3"
      href={href}
    >
      <span>
        <span className="block text-[30px] font-light leading-none">{renderQuickIcon(icon)}</span>
        <span className="mt-2 block truncate text-[18px] leading-none">{title}</span>
        <span className="mt-1 block truncate text-[13px] leading-none">{detail}</span>
      </span>
      <span className="text-[26px] font-semibold leading-none">&gt;</span>
    </Link>
  );
}

function buildActivity(cases: CaseListItem[]) {
  if (!cases.length) {
    return [];
  }

  return cases.slice(0, 2).map((legalCase) => ({
    detail: legalCase.identificador || "Caso cargado en el sistema",
    icon: <DocumentIcon />,
    time: "",
    title: legalCase.name,
  }));
}

function buildWeekDeadlines(deadlines: CaseDeadline[]) {
  if (!deadlines.length) {
    return [];
  }

  return deadlines.slice(0, 2).map((deadline) => ({
    detail: deadline.evento,
    href: `/casos/${deadline.causa_id}/agenda`,
    title: `${deadline.caratula} - ${formatDeadlineDay(deadline)}`,
  }));
}

function buildEvents(deadlines: CaseDeadline[]) {
  if (!deadlines.length) {
    return [];
  }

  return deadlines.slice(0, 3).map((deadline) => ({
    detail: deadline.evento,
    time: formatEventTime(deadline.fecha),
    title: deadline.caratula,
  }));
}

function formatShortDate(date: Date) {
  const month = new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(date)
    .replace(".", "");
  return `${date.getDate()} ${capitalize(month)} ${date.getFullYear()}`;
}

function formatLongDate(date: Date) {
  const dayName = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(date);
  return `${capitalize(dayName)} ${date.getDate()}/${date.getMonth() + 1}/${String(
    date.getFullYear(),
  ).slice(-2)}`;
}

function formatDeadlineDay(deadline: CaseDeadline) {
  if (!deadline.fecha) {
    return deadline.fecha_texto || "Sin fecha";
  }

  const date = new Date(deadline.fecha);
  const dayName = new Intl.DateTimeFormat("es-AR", { weekday: "short" })
    .format(date)
    .replace(".", "");
  return `${capitalize(dayName)} ${date.getDate()}`;
}

function formatEventTime(value?: string | null) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderQuickIcon(icon: string) {
  if (icon === "+") {
    return <PlusIcon />;
  }

  if (icon === "IA") {
    return <SparkleLargeIcon />;
  }

  return <BackIcon />;
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

function CalendarSmallIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}

function ClockIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.1" />
      <path d="M12 6.8v5.5l3.6 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg aria-hidden="true" className="h-9 w-9" viewBox="0 0 24 24" fill="none">
      <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M4 4.8v4h4M12 7.5V12l3.2 2.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.2 22 20H2L12 3.2Zm-1.1 5.9.3 6.1h1.6l.3-6.1h-2.2Zm1.1 9.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 3.5h7L18.5 8v12.5h-12v-17Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M13.5 3.5V8h5M9 12h6M9 16h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M13.5 2.8 5.8 13h5l-1.2 8.2 8-10.7h-5l.9-7.7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function SparkleLargeIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <path d="m8 3 1.3 4.7L14 9l-4.7 1.3L8 15l-1.3-4.7L2 9l4.7-1.3L8 3ZM17 10l1 3.5 3.5 1-3.5 1L17 19l-1-3.5-3.5-1 3.5-1 1-3.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <path d="M9 7 4 12l5 5M5 12h9a5 5 0 0 1 5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}
