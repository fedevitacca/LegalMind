"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CaseDeadline } from "../../lib/legalmindApi";

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

export default function AgendaInteractiva({
  addEventHref,
  deadlines,
}: {
  addEventHref: string;
  deadlines: CaseDeadline[];
}) {
  const datedDeadlines = useMemo(
    () => deadlines.filter((deadline) => deadline.fecha),
    [deadlines],
  );
  const initialDate = useMemo(() => getSelectedDate(datedDeadlines), [datedDeadlines]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const selectedKey = toDateKey(selectedDate);
  const eventsByDate = useMemo(() => groupEventsByDate(datedDeadlines), [datedDeadlines]);
  const displayEvents = eventsByDate.get(selectedKey) || [];
  const upcomingThisWeek = countUpcomingThisWeek(datedDeadlines);

  function selectDay(date: Date) {
    setSelectedDate(date);
    if (date.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  return (
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
                <button
                  aria-label="Mes anterior"
                  className="leading-none transition hover:text-[#88A9C8]"
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                  type="button"
                >
                  &lsaquo;
                </button>
                <button
                  aria-label="Mes siguiente"
                  className="leading-none transition hover:text-[#88A9C8]"
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                  type="button"
                >
                  &rsaquo;
                </button>
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
                <div className="pb-2 text-center text-[19px] leading-none" key={day}>
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
                  <button
                    aria-label={`Ver eventos del ${dateKey}`}
                    className={`relative h-[61px] border-b border-r border-[#88A9C8] px-3 py-2 text-left text-[19px] leading-none transition hover:bg-[#88A9C8]/35 ${
                      day.isCurrentMonth ? "bg-[#F4F7F5]" : "bg-white text-[#0F2044]/48"
                    } ${isSelected ? "bg-[#88A9C8] font-semibold ring-2 ring-inset ring-[#0F2044]" : ""}`}
                    key={dateKey}
                    onClick={() => selectDay(day.date)}
                    type="button"
                  >
                    {day.date.getDate()}
                    {hasEvents ? (
                      <span className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-[#0F2044]" />
                    ) : null}
                  </button>
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
  );
}

function getSelectedDate(deadlines: CaseDeadline[]) {
  const firstDate = deadlines.find((deadline) => deadline.fecha)?.fecha;
  if (!firstDate) return new Date();

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

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
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
