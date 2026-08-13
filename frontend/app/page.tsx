import Link from "next/link";
import type { ReactNode } from "react";
import MarcoAplicacion from "../components/estructura/MarcoAplicacion";
import {
  CaseDeadline,
  CaseListItem,
  fetchCases,
  fetchDeadlines,
} from "../lib/legalmindServerApi";

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
      <section className="h-full min-h-0 overflow-y-auto bg-[#F4F7F5] text-[#0F2044]">
        <header className="grid min-h-[58px] grid-cols-[minmax(190px,1fr)_minmax(300px,464px)_144px] items-center border-b-4 border-[#88A9C8] bg-white px-10">
          <h1 className="brand-font text-[34px] font-semibold leading-none">
            Dashboard
          </h1>
          <label className="relative block">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold">
              O
            </span>
            <input
              className="h-[35px] w-full rounded-full border-2 border-[#88A9C8] bg-white pl-16 pr-5 text-[28px] leading-none outline-none placeholder:text-[#0F2044]"
              placeholder="Buscar..."
              type="search"
            />
          </label>
          <div className="flex items-center justify-end gap-6">
            <Link
              aria-label="Configuracion"
              className="grid h-10 w-10 place-items-center rounded-md text-2xl font-bold"
              href="/configuracion"
            >
              S
            </Link>
            <Link
              aria-label="Usuario"
              className="grid h-10 w-10 place-items-center rounded-md text-2xl font-bold"
              href="/configuracion"
            >
              U
            </Link>
          </div>
        </header>

        <main className="grid grid-cols-[minmax(0,1fr)_192px] gap-4 px-9 py-9">
          <section className="grid gap-6">
            <TodayCard today={today} />

            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                detail={`${Math.min(cases.length, 3)} actualizados hoy`}
                icon="U"
                label="Casos activos"
                value={String(activeCases.length).padStart(2, "0")}
              />
              <MetricCard
                detail={`${urgentDeadlines.length} vencimientos urgentes`}
                icon="R"
                label="Vencimientos hoy"
                value={String(todayDeadlines.length).padStart(2, "0")}
              />
              <MetricCard
                detail="3 analisis nuevos"
                label="Analisis pendientes"
                value="05"
              />
            </div>

            <div className="grid grid-cols-[minmax(0,1.16fr)_minmax(0,0.92fr)] gap-4">
              <DashboardPanel icon="R" title="Actividad reciente">
                <div className="mt-7 grid gap-5">
                  {buildActivity(cases).map((item) => (
                    <div
                      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3"
                      key={`${item.title}-${item.detail}`}
                    >
                      <span className="text-xl font-bold">{item.icon}</span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[23px] font-semibold leading-none">
                          {item.title}
                        </h3>
                        <p className="text-[17px] leading-tight text-[#0F2044]/85">
                          {item.detail}
                        </p>
                      </div>
                      <span className="text-[17px] text-[#0F2044]/85">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardPanel>

              <DashboardPanel icon="R" title="Vencimientos esta semana">
                <div className="mt-7 grid gap-5">
                  {buildWeekDeadlines(deadlines).map((deadline) => (
                    <Link href={deadline.href} key={deadline.title}>
                      <h3 className="text-[23px] font-semibold leading-none">
                        {deadline.title}
                      </h3>
                      <p className="text-[17px] leading-tight text-[#0F2044]/85">
                        {deadline.detail}
                      </p>
                    </Link>
                  ))}
                </div>
              </DashboardPanel>
            </div>

            <div className="grid grid-cols-[minmax(0,1.16fr)_minmax(0,0.92fr)] gap-4">
              <LineLink href="/casos" label="Ver historial completo" />
              <LineLink href="/agenda" label="Ver todos los vencimientos" />
            </div>

            <div className="w-[330px] rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-2 text-[18px]">
              <span className="mr-2 font-bold">Z</span>
              Accesos rapidos
            </div>

            <div className="grid grid-cols-3 gap-4">
              {dashboardQuickActions.map((action) => (
                <QuickAction key={action.title} {...action} />
              ))}
            </div>
          </section>

          <aside className="grid grid-rows-[1fr_auto] gap-3">
            <DashboardPanel compact icon="!" title="Eventos">
              <div className="mt-3">
                {buildEvents(deadlines).map((event, index) => (
                  <div
                    className={`py-4 ${index ? "border-t border-[#88A9C8]" : ""}`}
                    key={`${event.time}-${event.title}`}
                  >
                    <p className="text-[40px] font-semibold leading-none">
                      {event.time}
                    </p>
                    <h3 className="mt-2 text-[22px] font-semibold leading-none">
                      {event.title}
                    </h3>
                    <p className="text-[18px] leading-tight text-[#0F2044]/85">
                      {event.detail}
                    </p>
                  </div>
                ))}
              </div>
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
    <section className="w-[310px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
      <p className="text-[28px] leading-none">
        <span className="mr-2 text-xl font-bold">D</span>
        Hoy:
      </p>
      <h2 className="mt-4 text-[31px] font-semibold leading-none">
        {formatShortDate(today)}
      </h2>
      <p className="mt-1 text-[18px] leading-none">{formatLongDate(today)}</p>
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
  icon?: string;
  label: string;
  value: string;
}) {
  return (
    <section className="min-h-[141px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
      <p className="text-[28px] leading-none">
        {icon ? <span className="mr-2 text-xl font-bold">{icon}</span> : null}
        {label}
      </p>
      <p className="mt-5 text-[38px] font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[18px] leading-none">{detail}</p>
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
  icon: string;
  title: string;
}) {
  return (
    <section
      className={`rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-6 ${
        compact ? "min-h-[418px]" : "min-h-[253px]"
      }`}
    >
      <h2 className="text-[29px] font-medium leading-none">
        <span className="mr-2 text-xl font-bold">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function LineLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-[43px] items-center justify-between rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 text-[18px] leading-none"
      href={href}
    >
      <span>{label}</span>
      <span className="text-[38px] font-semibold leading-none">&gt;</span>
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
      className="grid min-h-[158px] grid-cols-[minmax(0,1fr)_32px] items-center rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5"
      href={href}
    >
      <span>
        <span className="block text-[48px] font-light leading-none">{icon}</span>
        <span className="mt-4 block text-[24px] leading-none">{title}</span>
        <span className="mt-2 block text-[17px] leading-none">{detail}</span>
      </span>
      <span className="text-[38px] font-semibold leading-none">&gt;</span>
    </Link>
  );
}

function buildActivity(cases: CaseListItem[]) {
  if (!cases.length) {
    return [
      {
        detail: "Documento agregado",
        icon: "P",
        time: "Hace 15 min",
        title: "Caso Gomez",
      },
      {
        detail: "IA detecto inconsistencias",
        icon: "*",
        time: "Hace 1 h",
        title: "Caso Perez",
      },
    ];
  }

  return cases.slice(0, 2).map((legalCase, index) => ({
    detail: index === 0 ? "Documento agregado" : "IA detecto inconsistencias",
    icon: index === 0 ? "P" : "*",
    time: index === 0 ? "Hace 15 min" : "Hace 1 h",
    title: legalCase.name,
  }));
}

function buildWeekDeadlines(deadlines: CaseDeadline[]) {
  if (!deadlines.length) {
    return [
      {
        detail: "Presentacion",
        href: "/agenda",
        title: "Caso Gomez - Lun 29",
      },
      {
        detail: "Audiencia",
        href: "/agenda",
        title: "Caso Perez - Mie 1",
      },
    ];
  }

  return deadlines.slice(0, 2).map((deadline) => ({
    detail: deadline.evento,
    href: `/casos/${deadline.causa_id}/agenda`,
    title: `${deadline.caratula} - ${formatDeadlineDay(deadline)}`,
  }));
}

function buildEvents(deadlines: CaseDeadline[]) {
  if (!deadlines.length) {
    return [
      { detail: "Audiencia", time: "9:00", title: "Caso Gomez" },
      { detail: "Presentacion", time: "14:30", title: "Caso Gomez" },
      { detail: "Revision", time: "16:00", title: "Caso Perez" },
    ];
  }

  return deadlines.slice(0, 3).map((deadline, index) => ({
    detail: deadline.evento,
    time: ["9:00", "14:30", "16:00"][index] || "9:00",
    title: deadline.caratula,
  }));
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(".", "");
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
