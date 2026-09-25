import Link from "next/link";
import BotonSesion from "../../components/interfaz/BotonSesion";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import {
  CaseDeadline,
  fetchCases,
  fetchDeadlines,
} from "../../lib/legalmindServerApi";

const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default async function AgendaPage() {
  const [cases, deadlines] = await Promise.all([fetchCases(), fetchDeadlines()]);
  const datedDeadlines = deadlines.filter((deadline) => deadline.fecha);
  const selectedDate = getSelectedDate(datedDeadlines);
  const visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const calendarDays = getCalendarDays(visibleMonth);
  const selectedKey = toDateKey(selectedDate);
  const eventsByDate = groupEventsByDate(datedDeadlines);
  const selectedEvents = eventsByDate.get(selectedKey) || [];
  const displayEvents = selectedEvents.length ? selectedEvents : datedDeadlines.slice(0, 4);
  const upcomingThisWeek = countUpcomingThisWeek(datedDeadlines);
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

        <main className="grid h-[calc(100vh-44px)] min-h-0 grid-rows-[88px_minmax(0,1fr)] gap-3 px-7 py-4">
          <section className="w-[340px] rounded-[14px] border-2 border-[#88A9C8] bg-white px-4 py-3">
            <h2 className="flex items-center gap-2 text-[19px] leading-none">
              <ClockIcon />
              Proximos vencimientos
            </h2>
            <p className="mt-3 text-[29px] font-semibold leading-none">
              {String(upcomingThisWeek).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[14px] leading-none">Esta semana</p>
          </section>

          <section className="grid min-h-0 grid-cols-[minmax(0,720px)_306px] gap-3">
            <section className="min-h-0 rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <h2 className="flex items-center gap-2 text-[23px] leading-none">
                  <CalendarIcon />
                  {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                  <span className="flex items-center gap-2 text-[22px] font-semibold">
                    <span aria-hidden="true">&lsaquo;</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </span>
                </h2>
                <Link
                  className="flex h-9 items-center rounded-[5px] border-2 border-[#88A9C8] px-3 text-[14px] leading-none"
                  href={addEventHref}
                >
                  + Agregar evento
                </Link>
              </div>

              <div className="mx-auto mt-3 max-w-[560px]">
                <div className="grid grid-cols-7">
                  {weekDays.map((day) => (
                    <div
                      className="pb-2 text-center text-[19px] leading-none"
                      key={day}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 overflow-hidden rounded-[4px] border border-[#88A9C8]">
                  {calendarDays.map((day) => {
                    const dateKey = toDateKey(day.date);
                    const isSelected = dateKey === selectedKey;
                    const hasEvents = eventsByDate.has(dateKey);

                    return (
                      <div
                        className={`relative h-[61px] border-b border-r border-[#88A9C8] px-3 py-2 text-[19px] leading-none ${
                          day.isCurrentMonth ? "bg-[#F4F7F5]" : "bg-white text-[#0F2044]/48"
                        } ${isSelected ? "bg-[#88A9C8] font-semibold ring-2 ring-inset ring-[#0F2044]" : ""}`}
                        key={dateKey}
                      >
                        {day.date.getDate()}
                        {hasEvents ? (
                          <span className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-[#0F2044]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="min-h-0 overflow-hidden rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-4">
              <h2 className="text-[20px] leading-none">
                Eventos {formatPanelDate(selectedDate)}
              </h2>
              <div className="mt-3">
                {displayEvents.length ? (
                  displayEvents.map((event, index) => (
                    <article
                      className={`py-3 ${index ? "border-t border-[#88A9C8]" : ""}`}
                      key={event.id}
                    >
                      <p className="text-[30px] font-semibold leading-none">
                        {formatTime(event.fecha)}
                      </p>
                      <h3 className="mt-2 truncate text-[18px] font-semibold leading-none">
                        {event.caratula}
                      </h3>
                      <p className="mt-1 truncate text-[16px] leading-none">
                        {event.evento}
                      </p>
                      <p className="mt-1 truncate text-[13px] leading-none">
                        {event.expediente || event.fecha_texto || "Fecha relevante"}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-[12px] border-2 border-dashed border-[#88A9C8] px-4 py-5 text-[16px] leading-5 text-[#0F2044]/70">
                    Sin eventos cargados.
                  </p>
                )}
              </div>
            </aside>
          </section>
        </main>
      </section>
    </MarcoAplicacion>
  );
}

function getSelectedDate(deadlines: CaseDeadline[]) {
  const firstDate = deadlines.find((deadline) => deadline.fecha)?.fecha;
  if (!firstDate) {
    return new Date();
  }

  const parsedDate = new Date(firstDate);
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

function groupEventsByDate(deadlines: CaseDeadline[]) {
  return deadlines.reduce((groups, deadline) => {
    if (!deadline.fecha) return groups;
    const date = new Date(deadline.fecha);
    if (Number.isNaN(date.getTime())) return groups;

    const key = toDateKey(date);
    const current = groups.get(key) || [];
    current.push(deadline);
    groups.set(key, current);
    return groups;
  }, new Map<string, CaseDeadline[]>());
}

function getCalendarDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (start.getDay() + 6) % 7;
  const firstVisibleDay = new Date(start);
  firstVisibleDay.setDate(start.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function countUpcomingThisWeek(deadlines: CaseDeadline[]) {
  return deadlines.filter((deadline) => {
    if (deadline.dias_restantes === null) return false;
    return deadline.dias_restantes >= 0 && deadline.dias_restantes <= 7;
  }).length;
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatPanelDate(date: Date) {
  return `${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()}`;
}

function formatTime(value?: string | null) {
  if (!value) return "09:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "09:00";

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.1" />
      <path d="M12 6.8v5.5l3.6 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
