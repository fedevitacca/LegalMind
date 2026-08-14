"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCaseDate } from "@/lib/legalmindApi";

export default function FormularioNuevoEvento({
  caseId,
}: {
  caseId: string;
}) {
  const router = useRouter();
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

      router.push(`/casos/${caseId}/agenda`);
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

  return (
    <form className="max-w-[988px]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-8">
        <TextField
          label="Titulo del evento"
          onChange={setTitulo}
          placeholder="Ej. Audiencia preliminar"
          required
          value={titulo}
        />
        <label className="block">
          <span className="text-[19px] leading-none">Hora</span>
          <span className="mt-2 flex h-[70px] items-center rounded-[14px] border-2 border-[#88A9C8] bg-white px-5">
            <input
              className="min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-[#64708B]/75"
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

      <label className="mt-9 block w-[308px]">
        <span className="text-[19px] leading-none">Fecha</span>
        <span className="mt-2 flex h-[74px] items-center rounded-[8px] border-2 border-[#88A9C8] bg-white px-3">
          <input
            className="min-w-0 flex-1 bg-transparent text-[23px] outline-none placeholder:text-[#64708B]"
            onChange={(event) => setFecha(event.target.value)}
            placeholder="dd/mm/aaaa"
            type="text"
            value={fecha}
          />
          <CalendarIcon />
        </span>
      </label>

      <label className="mt-8 block">
        <span className="text-[19px] leading-none">Descripciones</span>
        <textarea
          className="mt-2 h-[114px] w-full resize-none rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-5 text-[18px] outline-none placeholder:text-[#64708B]/75"
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Detalles del evento, temas a tratar, notas importantes, etc."
          value={descripcion}
        />
      </label>

      <TextField
        className="mt-8"
        label="Lugar"
        onChange={setLugar}
        placeholder="Ej. Juzgado Nacional"
        value={lugar}
      />

      {error ? (
        <p
          className="mt-6 max-w-[988px] rounded-[8px] border-2 border-[#A68147]/55 bg-[#A68147]/10 px-5 py-3 text-[17px] font-semibold"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex gap-5">
        <button
          className="h-[61px] rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[19px] transition hover:bg-white/80 disabled:cursor-wait disabled:text-[#0F2044]/50"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Cargando..." : "Cargar evento"}
        </button>
        <Link
          className="grid h-[61px] place-items-center rounded-[4px] border-2 border-[#88A9C8] bg-white px-7 text-[19px] transition hover:bg-white/80"
          href={`/casos/${caseId}/agenda`}
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
      <span className="text-[19px] leading-none">{label}</span>
      <input
        className="mt-2 h-[70px] w-full rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 text-[18px] outline-none placeholder:text-[#64708B]/75"
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
    <svg aria-hidden="true" className="h-9 w-9 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.1" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-9 w-9 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
