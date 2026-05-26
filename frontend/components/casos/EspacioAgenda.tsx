"use client";

import { FormEvent, useMemo, useState } from "react";

type FechaAgenda = {
  descripcion: string;
  dia: string;
  hora: string;
  prioridad: "Alta" | "Media" | "Baja";
};

type EventoAgenda = FechaAgenda & {
  dateKey: string;
  id: string;
};

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

const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export default function EspacioAgenda({
  editable = false,
  fechas,
}: {
  editable?: boolean;
  fechas: FechaAgenda[];
}) {
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<EventoAgenda[]>(() =>
    fechas.map((fecha, index) => ({
      ...fecha,
      dateKey: toDateKeyFromDay(fecha.dia, today.getFullYear()),
      id: `agenda-inicial-${index}`,
    })),
  );
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [newDescription, setNewDescription] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newPriority, setNewPriority] =
    useState<FechaAgenda["prioridad"]>("Media");
  const [formVisible, setFormVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const selectedEvents = events.filter((event) => event.dateKey === selectedDate);
  const upcomingEvents = [...events]
    .sort((a, b) => `${a.dateKey} ${a.hora}`.localeCompare(`${b.dateKey} ${b.hora}`))
    .slice(0, 5);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newDescription.trim()) {
      return;
    }

    setEvents((currentEvents) => [
      ...currentEvents,
      {
        dateKey: selectedDate,
        descripcion: newDescription.trim(),
        dia: formatDayLabel(selectedDate),
        hora: newTime,
        id: `agenda-${selectedDate}-${newTime}-${Date.now()}`,
        prioridad: newPriority,
      },
    ]);
    setNewDescription("");
    setNewTime("09:00");
    setNewPriority("Media");
    setFormVisible(false);
  }

  function handleDelete(eventId: string) {
    if (pendingDeleteId !== eventId) {
      setPendingDeleteId(eventId);
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId),
    );
    setPendingDeleteId(null);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)]">
      <aside className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
          Proximas entregas
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Trabajos y vencimientos</h2>

        <div className="mt-4 grid gap-2">
          {upcomingEvents.map((fecha) => (
            <article
              className="rounded-lg bg-[#F4F7F5] px-4 py-3"
              key={fecha.id}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{fecha.descripcion}</h3>
                  <p className="mt-1 text-sm font-medium text-[#0F2044]/60">
                    {formatReadableDate(fecha.dateKey)} | {fecha.hora}
                  </p>
                </div>
                <div
                  className={`grid items-center justify-end gap-2 ${
                    editable ? "grid-cols-[auto_92px_28px]" : "grid-cols-[auto]"
                  }`}
                >
                  <PriorityBadge prioridad={fecha.prioridad} />
                  {editable ? (
                    <>
                      <button
                        className={`h-7 rounded-full px-3 text-xs font-semibold transition ${
                          pendingDeleteId === fecha.id
                            ? "bg-[#A68147] text-white hover:bg-[#0F2044]"
                            : "bg-white text-[#0F2044]/68 hover:bg-[#84A2BD]/20"
                        }`}
                        onClick={() => handleDelete(fecha.id)}
                        type="button"
                      >
                        {pendingDeleteId === fecha.id ? "Confirmar" : "Eliminar"}
                      </button>
                      {pendingDeleteId === fecha.id ? (
                        <button
                          aria-label="Cancelar eliminacion"
                          className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-[#0F2044] transition hover:bg-[#84A2BD]/20"
                          onClick={() => setPendingDeleteId(null)}
                          type="button"
                        >
                          {"<"}
                        </button>
                      ) : (
                        <span aria-hidden="true" className="h-7 w-7" />
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <section className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#84A2BD]/30 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
              {editable ? "Calendario editable" : "Calendario del caso"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-full border border-[#84A2BD]/55 bg-[#F4F7F5] px-3 py-2 text-sm font-semibold transition hover:bg-white"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              type="button"
            >
              Anterior
            </button>
            <button
              className="rounded-full bg-[#546FC0] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0F2044]"
              onClick={() =>
                setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              }
              type="button"
            >
              Hoy
            </button>
            <button
              className="rounded-full border border-[#84A2BD]/55 bg-[#F4F7F5] px-3 py-2 text-sm font-semibold transition hover:bg-white"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => (
            <div
              className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-[0.1em] text-[#0F2044]/48"
              key={day}
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dayEvents = events.filter((event) => event.dateKey === day.dateKey);
            const isSelected = selectedDate === day.dateKey;
            const isToday = toDateKey(today) === day.dateKey;

            return (
              <button
                className={`min-h-24 rounded-lg border p-2 text-left transition ${
                  isSelected
                    ? "border-[#546FC0] bg-[#84A2BD]/20 ring-4 ring-[#84A2BD]/18"
                    : day.isCurrentMonth
                      ? "border-[#84A2BD]/30 bg-[#F4F7F5] hover:border-[#546FC0]/45 hover:bg-white"
                      : "border-transparent bg-[#F4F7F5]/45 text-[#0F2044]/35"
                }`}
                key={day.dateKey}
                onClick={() => setSelectedDate(day.dateKey)}
                type="button"
              >
                <span
                  className={`inline-grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-[#0F2044] text-white" : ""
                  }`}
                >
                  {day.date.getDate()}
                </span>
                <div className="mt-2 grid gap-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      className="truncate rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#0F2044]/72"
                      key={event.id}
                    >
                      {event.hora} {event.descripcion}
                    </span>
                  ))}
                  {dayEvents.length > 2 ? (
                    <span className="text-xs font-semibold text-[#546FC0]">
                      +{dayEvents.length - 2} mas
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#546FC0]">
                Fecha seleccionada
              </p>
              <h3 className="mt-1 text-lg font-semibold">
                {formatReadableDate(selectedDate)}
              </h3>
            </div>
            {selectedEvents.length ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0F2044]/66">
                {selectedEvents.length} eventos
              </span>
            ) : null}
            {editable ? (
              <button
                className="rounded-full bg-[#546FC0] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.18)] transition hover:bg-[#0F2044]"
                onClick={() => setFormVisible((visible) => !visible)}
                type="button"
              >
                {formVisible ? "Ocultar carga" : "+ Agregar evento"}
              </button>
            ) : (
              <a
                className="rounded-full bg-[#546FC0] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.18)] transition hover:bg-[#0F2044]"
                href="/agenda"
              >
                Editar en agenda
              </a>
            )}
          </div>

          {editable && formVisible ? (
            <form
              className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_140px_auto]"
              onSubmit={handleSubmit}
            >
              <label>
                <span className="text-sm font-semibold">Trabajo o entrega</span>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-[#84A2BD]/55 bg-white px-3 text-sm font-medium outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/20"
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Ej. Presentar escrito"
                  type="text"
                  value={newDescription}
                />
              </label>

              <label>
                <span className="text-sm font-semibold">Hora</span>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-[#84A2BD]/55 bg-white px-3 text-sm font-medium outline-none focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/20"
                  onChange={(event) => setNewTime(event.target.value)}
                  type="time"
                  value={newTime}
                />
              </label>

              <label>
                <span className="text-sm font-semibold">Prioridad</span>
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-[#84A2BD]/55 bg-white px-3 text-sm font-medium outline-none focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/20"
                  onChange={(event) =>
                    setNewPriority(event.target.value as FechaAgenda["prioridad"])
                  }
                  value={newPriority}
                >
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </label>

              <button className="h-11 self-end rounded-full bg-[#546FC0] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044]">
                Guardar
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function PriorityBadge({ prioridad }: { prioridad: FechaAgenda["prioridad"] }) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        prioridad === "Alta"
          ? "bg-[#A68147]/18 text-[#0F2044]"
          : prioridad === "Media"
            ? "bg-[#84A2BD]/24 text-[#0F2044]"
            : "bg-white text-[#0F2044]/68"
      }`}
    >
      {prioridad}
    </span>
  );
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
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
      dateKey: toDateKey(date),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toDateKeyFromDay(day: string, year: number) {
  const [rawDay, rawMonth] = day.split("/");
  const date = new Date(year, Number(rawMonth) - 1, Number(rawDay));
  return toDateKey(date);
}

function formatDayLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${Number(day)}/${Number(month)}`;
}

function formatReadableDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}
