"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCaseDocument } from "@/lib/legalmindApi";

export default function FormularioNuevoDocumento({
  caseId,
}: {
  caseId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [url, setUrl] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nombreDocumento = nombre.trim() || archivo?.name || "";

    if (!nombreDocumento) {
      setError("Ingresa el nombre del documento o selecciona un archivo.");
      return;
    }

    const texto = [descripcion.trim(), url.trim() ? `URL: ${url.trim()}` : ""]
      .filter(Boolean)
      .join("\n\n");

    setIsSaving(true);

    try {
      await createCaseDocument(caseId, {
        archivo,
        nombre_archivo: nombreDocumento,
        texto_extraido: archivo
          ? undefined
          : texto || "Documento cargado sin contenido textual inicial.",
        tipo_archivo: tipo.trim() || "oficial",
      });

      router.push(`/casos/${caseId}/documentos`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el documento.",
      );
      setIsSaving(false);
    }
  }

  function handleFile(file: File | null) {
    setArchivo(file);
    if (file && !nombre.trim()) {
      setNombre(file.name);
    }
  }

  return (
    <form className="max-w-[988px]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-8">
        <TextField
          label="Nombre del documento"
          onChange={setNombre}
          placeholder="Ej. Denuncia penal"
          required={!archivo}
          value={nombre}
        />
        <TextField
          label="Tipo de documento"
          onChange={setTipo}
          placeholder="Ej."
          value={tipo}
        />
        <TextField
          label="URL (opcional)"
          onChange={setUrl}
          placeholder="Ej."
          type="url"
          value={url}
        />
      </div>

      <label className="mt-9 block">
        <span className="text-[19px] leading-none">Archivo (opcional)</span>
        <button
          className="mt-2 flex h-[306px] w-full flex-col items-center justify-center rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 text-center transition hover:bg-white/80"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files.item(0));
          }}
          type="button"
        >
          <UploadIcon />
          <span className="mt-10 text-[19px] leading-none">
            {archivo ? archivo.name : "Arrastra y suelta el archivo aqui"}
          </span>
          <span className="mt-6 text-[19px] leading-none">o</span>
          <span className="mt-8 rounded-[14px] border-2 border-[#88A9C8] bg-white px-3 py-2 text-[18px] leading-none">
            Seleccionar archivo
          </span>
        </button>
        <input
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.item(0) || null)}
          ref={fileInputRef}
          type="file"
        />
      </label>

      <label className="mt-9 block">
        <span className="text-[19px] leading-none">Descripcion</span>
        <textarea
          className="mt-2 h-[114px] w-full resize-none rounded-[14px] border-2 border-[#88A9C8] bg-white px-5 py-5 text-[18px] outline-none placeholder:text-[#64708B]/75"
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Describe el contenido del documento, su relevancia, etc."
          value={descripcion}
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
          className="h-[61px] rounded-[4px] border-2 border-[#88A9C8] bg-white px-2 text-[19px] transition hover:bg-white/80 disabled:cursor-wait disabled:text-[#0F2044]/50"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Cargando..." : "Cargar documento"}
        </button>
        <Link
          className="grid h-[61px] place-items-center rounded-[4px] border-2 border-[#88A9C8] bg-white px-7 text-[19px] transition hover:bg-white/80"
          href={`/casos/${caseId}/documentos`}
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
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
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
        type={type}
        value={value}
      />
    </label>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" className="h-[67px] w-[67px]" viewBox="0 0 24 24" fill="none">
      <path d="M12 16V4M7 9l5-5 5 5M5 16v3.5h14V16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}
