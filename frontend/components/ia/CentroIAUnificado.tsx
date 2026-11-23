"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchCases, type CaseListItem } from "../../lib/legalmindApi";
import ChatExpediente from "./ChatExpediente";

export default function CentroIAUnificado() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [idExpediente, setCaseId] = useState("");
  const [cargando, cambiarCarga] = useState(true);
  const [error, cambiarError] = useState("");

  useEffect(() => {
    let activo = true;
    const requested = new URLSearchParams(window.location.search).get("case_id") || "";
    fetchCases().then((elementos) => {
      if (!activo) return;
      setCases(elementos);
      const available = elementos.some((elemento) => String(elemento.id) === requested);
      setCaseId(available ? requested : elementos[0] ? String(elementos[0].id) : "");
    }).catch((cause) => {
      if (activo) cambiarError(cause instanceof Error ? cause.message : "No se pudieron cargar los expedientes.");
    }).finally(() => {
      if (activo) cambiarCarga(false);
    });
    return () => { activo = false; };
  }, []);

  const selectedCase = useMemo(
    () => cases.find((elemento) => String(elemento.id) === idExpediente),
    [idExpediente, cases],
  );

  function seleccionarExpediente(valor: string) {
    setCaseId(valor);
    const url = new URL(window.location.href);
    if (valor) url.searchParams.set("case_id", valor);
    else url.searchParams.delete("case_id");
    window.history.replaceState(null, "", url);
  }

  return <section className="h-full min-h-0 bg-[#F4F7F5] p-4 text-[#0F2044] sm:p-6">
    <div className="mx-auto flex h-full min-h-0 max-w-[1500px] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-4">
        <div>
          <h1 className="text-[27px] font-semibold leading-none">Asistente jurídico</h1>
          <p className="mt-2 text-sm text-[#0F2044]/65">Preguntas, análisis y herramientas en una sola conversación.</p>
          <Link href="/biblioteca" className="mt-2 inline-block text-sm font-semibold underline">Biblioteca jurídica</Link>
        </div>
        <label className="w-full sm:w-[430px]">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/55">Expediente</span>
          <select value={idExpediente} onChange={(evento) => seleccionarExpediente(evento.target.value)} disabled={cargando}
            className="h-11 w-full rounded-xl border-2 border-[#88A9C8] bg-white px-3 text-sm font-semibold outline-none focus:border-[#546FC0]">
            <option value="">Seleccionar expediente</option>
            {cases.map((elemento) => <option key={elemento.id} value={elemento.id}>{elemento.identificador ? `${elemento.identificador} · ` : ""}{elemento.name}</option>)}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
      <div className="min-h-0 flex-1">
        {selectedCase ? <ChatExpediente key={idExpediente} caseId={idExpediente} caseName={selectedCase.name} embedded /> : (
          <div className="grid h-full min-h-[420px] place-items-center rounded-[23px] border-2 border-[#88A9C8] bg-white p-8 text-center">
            <div><h2 className="text-xl font-semibold">{cargando ? "Cargando expedientes..." : "No hay un expediente seleccionado"}</h2>
              {!cargando && !error && <p className="mt-2 text-sm text-[#0F2044]/60">Creá o seleccioná un caso para consultar sus documentos y usar las herramientas.</p>}</div>
          </div>
        )}
      </div>
    </div>
  </section>;
}
