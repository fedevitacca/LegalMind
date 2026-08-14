"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCaseJurisprudence } from "@/lib/legalmindApi";

export default function FormularioNuevaJurisprudencia({
  caseId,
}: {
  caseId: string;
}) {
  const router = useRouter();
  const [nombreFallo, setNombreFallo] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [anio, setAnio] = useState("");
  const [tipoFallo, setTipoFallo] = useState("");
  const [relacion, setRelacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!nombreFallo.trim()) {
      setError("Ingresa el nombre del fallo.");
      return;
    }

    setIsSaving(true);

    try {
      await createCaseJurisprudence(caseId, {
        anio: anio.trim(),
        referencia: [tipoFallo.trim(), relacion.trim()].filter(Boolean).join(" | "),
        resumen: observaciones.trim(),
        titulo: nombreFallo.trim(),
        tribunal: tribunal.trim(),
      });

      router.push(`/casos/${caseId}/jurisprudencia`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la jurisprudencia.",
      );
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-[988px]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-8">
        <TextField
          label="Nombre del fallo"
          onChange={setNombreFallo}
          placeholder="Ej. Causa Acosta"
          required
          value={nombreFallo}
        />
        <TextField
          label="Tribunal"
          onChange={setTribunal}
          placeholder="Ej. Corte suprema de Justicia"
          value={tribunal}
        />
        <TextField
          label="Anio"
          onChange={setAnio}
          placeholder="Ej. 2024"
          value={anio}
        />
      </div>

      <TextField
        className="mt-9"
        label="Tipo de fallo"
        onChange={setTipoFallo}
        placeholder="Definir tipo de fallo"
        value={tipoFallo}
      />

      <TextField
        className="mt-8"
        label="Relacion con el caso"
        onChange={setRelacion}
        placeholder="Relacion con el caso"
        value={relacion}
      />

      <label className="mt-8 block">
        <span className="text-[19px] leading-none">Observaciones</span>
        <textarea
          className="mt-2 h-[114px] w-full resize-none rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-5 text-[18px] outline-none placeholder:text-[#64708B]/75"
          onChange={(event) => setObservaciones(event.target.value)}
          placeholder="Explicar la relevancia de este fallo para el caso"
          value={observaciones}
        />
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
          className="h-[61px] rounded-[4px] border-2 border-[#88A9C8] bg-white px-3 text-[19px] transition hover:bg-white/80 disabled:cursor-wait disabled:text-[#0F2044]/50"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Cargando..." : "Cargar jurisprudencia"}
        </button>
        <Link
          className="grid h-[61px] place-items-center rounded-[4px] border-2 border-[#88A9C8] bg-white px-7 text-[19px] transition hover:bg-white/80"
          href={`/casos/${caseId}/jurisprudencia`}
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
