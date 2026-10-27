"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCase } from "@/lib/legalmindApi";

export default function BotonEliminarCaso({ caseId, caseName, redirect = false }: { caseId: number | string; caseName: string; redirect?: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);

  async function removeCase() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteCase(caseId);
      setDeleted(true);
      dialog.current?.close();
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("legalmind:cases");
        channel.postMessage({ type: "deleted", id: caseId });
        channel.close();
      }
      if (redirect) router.replace("/casos");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el caso.");
    } finally {
      setBusy(false);
    }
  }

  if (deleted) return <p role="status" className="text-sm font-semibold">Caso eliminado.</p>;

  return (
    <>
      <button type="button" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" aria-label={`Eliminar caso ${caseName}`} onClick={() => { setError(""); dialog.current?.showModal(); }}>
        Eliminar caso
      </button>
      <dialog ref={dialog} aria-labelledby={`delete-case-${caseId}`} onCancel={(event) => { if (busy) event.preventDefault(); }} className="m-auto w-[min(440px,calc(100%-32px))] rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044] shadow-xl backdrop:bg-[#0F2044]/45">
        <h2 id={`delete-case-${caseId}`} className="text-xl font-semibold">¿Eliminar este caso?</h2>
        <p className="mt-3 break-words font-semibold">{caseName}</p>
        <p className="mt-2 text-sm">Se eliminarán el expediente y sus datos asociados, incluidos los documentos y las fechas. Esta acción no se puede deshacer.</p>
        <p className="mt-2 text-sm text-[#0F2044]/65">Disponible para administradores.</p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} className="rounded-lg border border-[#88A9C8] px-4 py-2" onClick={() => dialog.current?.close()}>Cancelar</button>
          <button type="button" disabled={busy} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={removeCase}>{busy ? "Eliminando…" : "Sí, eliminar caso"}</button>
        </div>
      </dialog>
    </>
  );
}
