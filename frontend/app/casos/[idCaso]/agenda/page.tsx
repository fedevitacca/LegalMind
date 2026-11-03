"use client";

import { useParams } from "next/navigation";
import DetalleAgendaCaso from "../../../../components/casos/DetalleAgendaCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { useCaseDetailClient } from "../../../../lib/useCaseDetailClient";

export default function PaginaAgenda() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase: savedCase } = useCaseDetailClient(idCaso);
  if (!savedCase) return <MarcoAplicacion activeSection="Casos"><p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p></MarcoAplicacion>;
  const caso = {
    analisis: savedCase.analisis,
    deadline: savedCase.deadline,
    fechas: savedCase.fechas || [],
    name: savedCase.name,
    status: savedCase.status,
  };

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleAgendaCaso analisis={caso.analisis} caso={caso} idCaso={idCaso} />
    </MarcoAplicacion>
  );
}
