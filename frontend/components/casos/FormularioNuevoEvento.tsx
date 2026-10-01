"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCaseDate } from "@/lib/legalmindApi";

export default function FormularioNuevoEvento({
  caseId,
  returnTo,
}: {
  caseId: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const targetHref = returnTo || `/casos/${caseId}/agenda`;
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [duracion, setDuracion] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!titulo.trim()) {
      setError("Ingresa el titulo del evento.");
      return;
    }

    const normalizedDate = normalizeDate(fecha.trim());

    if (!normalizedDate && !fecha.trim()) {
      setError("Ingresa la fecha del evento.");
      return;
    }

    const details = [
      hora.trim() ? `Hora: ${hora.trim()}` : "",
      duracion.trim() ? `Duracion: ${duracion.trim()}` : "",
      lugar.trim() ? `Lugar: ${lugar.trim()}` : "",
      descripcion.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    setIsSaving(true);

    try {
      await createCaseDate(caseId, {
        evento: details ? `${titulo.trim()}\n${details}` : titulo.trim(),
        fecha: normalizedDate || undefined,
        fecha_texto: normalizedDate ? undefined : fecha.trim(),
        prioridad: "media",
        tipo: "agenda",
      });

      router.push(targetHref);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el evento.",
      );
      setIsSaving(false);
    }
  }

  function handleDatePickerOpen() {
    const input = datePickerRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  function handleDatePickerChange(value: string) {
    if (!value) return;
    const [year, month, day] = value.split("-");
    setFecha(`${day}/${month}/${year}`);
  }

  return (
    <form className="max-w-[920px] rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-4">
        <TextField
          label="Titulo del evento"
          onChange={setTitulo}
          placeholder="Ej. Audiencia preliminar"
          required
          value={titulo}
        />
        <label className="block">
          <span className="text-[15px] leading-none">Hora</span>
          <span className="mt-1.5 flex h-10 items-center rounded-[8px] border-2 border-[#88A9C8] bg-[#F4F7F5] px-4">
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#64708B]/75"
              onChange={(event) => setHora(event.target.value)}
              placeholder="--:--"
              type="time"
              value={hora}
            />
            <ClockIcon />
          </span>
        </label>
        <TextField
          label="Duracion (opcional)"
          onChange={setDuracion}
          placeholder="Ej. 1h 30m"
          value={duracion}
        />
      </div>

      <div className="mt-4 grid grid-cols-[270px_minmax(0,520px)] gap-4">
        <label className="block">
          <span className="text-[15px] leading-none">Fecha</span>
          <span className="mt-1.5 flex h-10 items-center rounded-[8px] border-2 border-[#88A9C8] bg-[#F4F7F5] px-4">
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#64708B]"
              onChange={(event) => setFecha(event.target.value)}
              placeholder="dd/mm/aaaa"
              type="text"
              value={fecha}
            />
            <input
              aria-hidden="true"
              className="sr-only"
              onChange={(event) => handleDatePickerChange(event.target.value)}
              ref={datePickerRef}
              tabIndex={-1}
              type="date"
            />
            <button
              aria-label="Seleccionar fecha"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] transition hover:bg-white"
              onClick={handleDatePickerOpen}
              type="button"
            >
              <CalendarIcon />
            </button>
          </span>
        </label>

        <TextField
          label="Lugar"
          onChange={setLugar}
          placeholder="Ej. Juzgado Nacional"
          value={lugar}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-[15px] leading-none">Descripciones</span>
        <textarea
          className="mt-1.5 h-[72px] w-full resize-none rounded-[8px] border-2 border-[#88A9C8] bg-[#F4F7F5] px-4 py-3 text-[15px] outline-none placeholder:text-[#64708B]/75"
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Detalles del evento, temas a tratar, notas importantes, etc."
          value={descripcion}
        />
      </label>

      {error ? (
        <p
          className="mt-4 rounded-[8px] border-2 border-[#A68147]/55 bg-[#A68147]/10 px-4 py-3 text-[15px] font-semibold"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-4">
        <button
          className="h-10 rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[15px] transition hover:bg-[#F4F7F5] disabled:cursor-wait disabled:text-[#0F2044]/50"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Cargando..." : "Cargar evento"}
        </button>
        <Link
          className="grid h-10 place-items-center rounded-[4px] border-2 border-[#88A9C8] bg-white px-6 text-[15px] transition hover:bg-[#F4F7F5]"
          href={targetHref}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function TextField({
  className = "",
  label,
  onChange,
  placeholder,
  required = false,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[15px] leading-none">{label}</span>
      <input
        className="mt-1.5 h-10 w-full rounded-[8px] border-2 border-[#88A9C8] bg-[#F4F7F5] px-4 text-[15px] outline-none placeholder:text-[#64708B]/75"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
    </label>
  );
}

function normalizeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return "";
  }

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.1" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
