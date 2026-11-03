"use client";

import { useParams } from "next/navigation";
import ResumenCaso from "../../../components/casos/ResumenCaso";
import MarcoAplicacion from "../../../components/estructura/MarcoAplicacion";
import { useCaseDetailClient } from "../../../lib/useCaseDetailClient";

export default function PaginaResumenCaso() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase } = useCaseDetailClient(idCaso);

  return (
    <MarcoAplicacion activeSection="Casos">
      {legalCase ? <ResumenCaso caso={legalCase} idCaso={idCaso} /> : <EstadoCarga error={error} />}
    </MarcoAplicacion>
  );
}

function EstadoCarga({ error }: { error: string }) {
  return <p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p>;
}
