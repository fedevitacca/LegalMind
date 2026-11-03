"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCases, type CaseListItem } from "../../lib/legalmindApi";
import ChatExpediente from "./ChatExpediente";

export default function CentroIAUnificado() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const requested = new URLSearchParams(window.location.search).get("case_id") || "";
    fetchCases().then((items) => {
      if (!active) return;
      setCases(items);
      const available = items.some((item) => String(item.id) === requested);
      setCaseId(available ? requested : items[0] ? String(items[0].id) : "");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selectedCase = useMemo(
    () => cases.find((item) => String(item.id) === caseId),
    [caseId, cases],
  );

  function selectCase(value: string) {
    setCaseId(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("case_id", value);
    else url.searchParams.delete("case_id");
    window.history.replaceState(null, "", url);
  }

  return <section className="h-full min-h-0 bg-[#F4F7F5] p-4 text-[#0F2044] sm:p-6">
    <div className="mx-auto flex h-full min-h-0 max-w-[1500px] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-4">
        <div>
          <h1 className="text-[27px] font-semibold leading-none">Asistente jurídico</h1>
          <p className="mt-2 text-sm text-[#0F2044]/65">Preguntas, análisis y herramientas en una sola conversación.</p>
        </div>
        <label className="w-full sm:w-[430px]">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[.08em] text-[#0F2044]/55">Expediente</span>
          <select value={caseId} onChange={(event) => selectCase(event.target.value)} disabled={loading}
            className="h-11 w-full rounded-xl border-2 border-[#88A9C8] bg-white px-3 text-sm font-semibold outline-none focus:border-[#546FC0]">
            <option value="">Seleccionar expediente</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.identificador ? `${item.identificador} · ` : ""}{item.name}</option>)}
          </select>
        </label>
      </header>

      <div className="min-h-0 flex-1">
        {selectedCase ? <ChatExpediente key={caseId} caseId={caseId} caseName={selectedCase.name} embedded /> : (
          <div className="grid h-full min-h-[420px] place-items-center rounded-[23px] border-2 border-[#88A9C8] bg-white p-8 text-center">
            <div><h2 className="text-xl font-semibold">{loading ? "Cargando expedientes..." : "No hay un expediente seleccionado"}</h2>
              {!loading && <p className="mt-2 text-sm text-[#0F2044]/60">Creá o seleccioná un caso para consultar sus documentos y usar las herramientas.</p>}</div>
          </div>
        )}
      </div>
    </div>
  </section>;
}
