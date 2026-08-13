"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCase, createCaseDate, uploadCaseDocument } from "@/lib/legalmindApi";

type EstadoCaso = "activa" | "archivada" | "cerrada";

export default function FormularioNuevoCaso() {
  const router = useRouter();
  const [caratula, setCaratula] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [estado, setEstado] = useState<EstadoCaso>("activa");
  const [descripcion, setDescripcion] = useState("");
  const [fechaCreacion, setFechaCreacion] = useState("");
  const [archivosOficiales, setArchivosOficiales] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!caratula.trim()) {
      setError("Ingresa el nombre o caratula del caso.");
      return;
    }

    setIsSaving(true);

    try {
      const legalCase = await createCase({
        caratula,
        descripcion,
        estado,
        identificador,
      });

      for (const file of archivosOficiales) {
        await uploadCaseDocument(legalCase.id || legalCase.slug, file);
      }

      if (fechaCreacion.trim()) {
        await createCaseDate(legalCase.id || legalCase.slug, {
          ...buildDatePayload(fechaCreacion),
          evento: "Fecha de creacion del caso",
          prioridad: "media",
          tipo: "agenda",
        });
      }

      router.push(`/casos/${legalCase.slug}`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el caso.",
      );
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-[988px]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-8">
        <TextField
          label="Nombre del caso"
          onChange={setCaratula}
          placeholder="Ej. Caso Gomez"
          required
          value={caratula}
        />
        <TextField
          label="N° de expediente"
          onChange={setIdentificador}
          placeholder="Ej. EXP-2026-001908"
          value={identificador}
        />
        <label className="block">
          <span className="text-[19px] leading-none">Estado</span>
          <span className="mt-2 flex h-[70px] items-center rounded-[8px] border-2 border-[#88A9C8] bg-white px-5">
            <span className="mr-3 h-[17px] w-[17px] rounded-full bg-[#6AD233]" />
            <select
              className="h-full min-w-0 flex-1 bg-transparent text-[19px] outline-none"
              onChange={(event) => setEstado(event.target.value as EstadoCaso)}
              value={estado}
            >
              <option value="activa">Activo</option>
              <option value="archivada">Archivado</option>
              <option value="cerrada">Cerrado</option>
            </select>
          </span>
        </label>
      </div>

      <label className="mt-9 block">
        <span className="text-[19px] leading-none">Descripcion</span>
        <textarea
          className="mt-2 h-[114px] w-full resize-none rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-5 text-[18px] outline-none placeholder:text-[#64708B]/75"
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Describir brevemente el caso, hechos relevantes, contexto, etc."
          value={descripcion}
        />
      </label>

      <div className="mt-9 grid grid-cols-[308px_minmax(0,1fr)] items-end gap-8">
        <label className="block">
          <span className="text-[19px] leading-none">Fecha de creacion del caso</span>
          <span className="mt-2 flex h-[74px] items-center rounded-[8px] border-2 border-[#88A9C8] bg-white px-3">
            <input
              className="min-w-0 flex-1 bg-transparent text-[23px] outline-none placeholder:text-[#64708B]"
              onChange={(event) => setFechaCreacion(event.target.value)}
              placeholder="26/6/2011"
              type="text"
              value={fechaCreacion}
            />
            <CalendarIcon />
          </span>
        </label>

        <label className="block">
          <span className="text-[19px] leading-none">Archivos oficiales</span>
          <span className="mt-2 grid h-[74px] grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[8px] border-2 border-[#88A9C8] bg-white px-4">
            <span className="grid h-[43px] place-items-center rounded-[4px] border-2 border-[#88A9C8] px-4 text-[18px]">
              Agregar archivos
            </span>
            <span className="truncate text-[18px] text-[#64708B]">
              {archivosOficiales.length
                ? `${archivosOficiales.length} archivo${archivosOficiales.length === 1 ? "" : "s"} seleccionado${archivosOficiales.length === 1 ? "" : "s"}`
                : "Ningun archivo seleccionado"}
            </span>
          </span>
          <input
            accept=".pdf,.doc,.docx,.txt,.md,.csv,image/*"
            className="sr-only"
            multiple
            onChange={(event) =>
              setArchivosOficiales(Array.from(event.target.files || []))
            }
            type="file"
          />
        </label>
      </div>

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
          {isSaving ? "Creando..." : "Crear caso"}
        </button>
        <Link
          className="grid h-[61px] place-items-center rounded-[4px] border-2 border-[#88A9C8] bg-white px-7 text-[19px] transition hover:bg-white/80"
          href="/casos"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block">
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

function buildDatePayload(value: string) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const argMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (isoMatch) {
    return { fecha: trimmed };
  }

  if (argMatch) {
    const [, day, month, year] = argMatch;
    return {
      fecha: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    };
  }

  return { fecha_texto: trimmed || "Sin fecha definida" };
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-9 w-9 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
