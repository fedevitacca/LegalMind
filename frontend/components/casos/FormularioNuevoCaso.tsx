"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "../../lib/legalmindApi";

type CreateCaseResponse = {
  case?: {
    slug: string;
  };
  details?: string;
  error?: string;
};

export default function FormularioNuevoCaso() {
  const router = useRouter();
  const [caratula, setCaratula] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [juzgado, setJuzgado] = useState("");
  const [fechaImportante, setFechaImportante] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imputados, setImputados] = useState("");
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
      const response = await fetch(`${apiUrl}/api/casos`, {
        body: JSON.stringify({
          caratula,
          descripcion: buildDescription({ descripcion, fechaImportante, juzgado }),
          identificador,
          imputados: imputados
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json()) as CreateCaseResponse;

      if (!response.ok || !body.case) {
        throw new Error([body.error, body.details].filter(Boolean).join(" "));
      }

      router.push(`/casos/${body.case.slug}/imputados`);
      router.refresh();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nombre del caso"
          onChange={setCaratula}
          placeholder="Caso Gomez"
          required
          value={caratula}
        />
        <Field
          label="Numero de expediente"
          onChange={setIdentificador}
          placeholder="EXP-000123"
          value={identificador}
        />
        <Field
          label="Juzgado o fiscalia"
          onChange={setJuzgado}
          placeholder="Fiscalia N. 4"
          value={juzgado}
        />
        <Field
          label="Fecha importante"
          onChange={setFechaImportante}
          placeholder="dd/mm/aaaa"
          value={fechaImportante}
        />
      </div>

      <Field
        label="Imputados iniciales"
        onChange={setImputados}
        placeholder="Juan Perez, Ana Gomez"
        value={imputados}
      />

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Observaciones iniciales</span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 py-3 text-sm font-medium outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Datos que conviene tener presentes al abrir el caso."
          value={descripcion}
        />
      </label>

      <section className="mt-4 rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4">
        <div className="flex items-start gap-3">
          <input
            className="mt-1 h-4 w-4 accent-[#546FC0]"
            defaultChecked
            id="analisis-ia-inicial"
            type="checkbox"
          />
          <label htmlFor="analisis-ia-inicial">
            <span className="block text-sm font-semibold">
              Preparar el caso para analisis IA
            </span>
            <span className="mt-1 block text-sm font-medium leading-5 text-[#0F2044]/62">
              La causa queda lista para asociar documentos y guardar resultados
              de IA cuando se carguen archivos.
            </span>
          </label>
        </div>
      </section>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-[#A68147]/45 bg-[#A68147]/12 px-4 py-3 text-sm font-semibold"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[#84A2BD]/28 pt-4">
        <a
          className="rounded-full px-4 py-2 text-sm font-semibold text-[#0F2044] transition hover:bg-[#84A2BD]/20"
          href="/casos"
        >
          Cancelar
        </a>
        <button
          className="rounded-full bg-[#546FC0] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044] disabled:cursor-wait disabled:bg-[#84A2BD]"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Creando..." : "Crear caso"}
        </button>
      </div>
    </form>
  );
}

function Field({
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
    <label className="mt-4 block first:mt-0">
      <span className="text-sm font-semibold">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 text-sm font-medium outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
    </label>
  );
}

function buildDescription({
  descripcion,
  fechaImportante,
  juzgado,
}: {
  descripcion: string;
  fechaImportante: string;
  juzgado: string;
}) {
  return [
    juzgado.trim() ? `Juzgado o fiscalia: ${juzgado.trim()}` : "",
    fechaImportante.trim() ? `Fecha importante: ${fechaImportante.trim()}` : "",
    descripcion.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "No se pudo crear el caso.";
}
