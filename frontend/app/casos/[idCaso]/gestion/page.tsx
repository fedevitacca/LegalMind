"use client";

import { useParams } from "next/navigation";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import CentroGestionCaso from "../../../../components/trabajo/CentroGestionCaso";
import { useCaseDetailClient } from "../../../../lib/useCaseDetailClient";

export default function PaginaGestionCaso() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase } = useCaseDetailClient(idCaso);
  return <MarcoAplicacion activeSection="Casos">{legalCase
    ? <CentroGestionCaso caseId={idCaso} caseName={legalCase.name} />
    : <p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p>}
  </MarcoAplicacion>;
}
