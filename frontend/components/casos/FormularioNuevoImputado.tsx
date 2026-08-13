"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCaseDefendant } from "@/lib/legalmindApi";

export default function FormularioNuevoImputado({
  caseId,
}: {
  caseId: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const fullName = [nombre.trim(), apellido.trim()].filter(Boolean).join(" ");

    if (!fullName) {
      setError("Ingresa el nombre del imputado.");
      return;
    }

    setIsSaving(true);

    try {
      await createCaseDefendant(caseId, {
        datos_contexto: {
          estado: "Ficha inicial",
          fecha_nacimiento: fechaNacimiento.trim() || null,
          resumen: observaciones.trim() || "Imputado cargado manualmente.",
        },
        documento_identidad: dni.trim(),
        nombre: fullName,
        notas: observaciones.trim(),
        rol: "imputado",
      });

      router.push(`/casos/${caseId}/imputados`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el imputado.",
      );
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-[988px]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-8">
        <TextField
          label="Nombre"
          onChange={setNombre}
          placeholder="Ej. Juan"
          required
          value={nombre}
        />
        <TextField
          label="Apellido"
          onChange={setApellido}
          placeholder="Ej. Fernandez"
          value={apellido}
        />
        <TextField
          label="DNI"
          onChange={setDni}
          placeholder="Ej. 12.345.678"
          value={dni}
        />
      </div>

      <label className="mt-9 block">
        <span className="text-[19px] leading-none">Observaciones</span>
        <textarea
          className="mt-2 h-[114px] w-full resize-none rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-5 text-[18px] outline-none placeholder:text-[#64708B]/75"
          onChange={(event) => setObservaciones(event.target.value)}
          placeholder="Informacion adicional relevante"
          value={observaciones}
        />
      </label>

      <label className="mt-9 block w-[308px]">
        <span className="text-[19px] leading-none">Fecha de nacimiento</span>
        <span className="mt-2 flex h-[74px] items-center rounded-[8px] border-2 border-[#88A9C8] bg-white px-3">
          <input
            className="min-w-0 flex-1 bg-transparent text-[23px] outline-none placeholder:text-[#64708B]"
            onChange={(event) => setFechaNacimiento(event.target.value)}
            placeholder="dd/mm/aaaa"
            type="text"
            value={fechaNacimiento}
          />
          <CalendarIcon />
        </span>
      </label>

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
          {isSaving ? "Cargando..." : "Cargar imputado"}
        </button>
        <Link
          className="grid h-[61px] place-items-center rounded-[4px] border-2 border-[#88A9C8] bg-white px-7 text-[19px] transition hover:bg-white/80"
          href={`/casos/${caseId}/imputados`}
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

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-9 w-9 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}
