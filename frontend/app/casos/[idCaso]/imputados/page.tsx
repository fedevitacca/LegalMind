"use client";

import { useParams } from "next/navigation";
import DetalleImputadosCaso from "../../../../components/casos/DetalleImputadosCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { useCaseDetailClient } from "../../../../lib/useCaseDetailClient";

export default function PaginaImputados() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase } = useCaseDetailClient(idCaso);

  return (
    <MarcoAplicacion activeSection="Casos">
      {legalCase ? <DetalleImputadosCaso
        analisis={legalCase.analisis}
        caso={legalCase}
        idCaso={idCaso}
      /> : <p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p>}
    </MarcoAplicacion>
  );
}
