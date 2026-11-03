"use client";

import { useParams } from "next/navigation";
import DetalleDocumentosCaso from "../../../../components/casos/DetalleDocumentosCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { useCaseDetailClient } from "../../../../lib/useCaseDetailClient";

export default function PaginaDocumentos() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase: savedCase } = useCaseDetailClient(idCaso);
  if (!savedCase) return <MarcoAplicacion activeSection="Casos"><EstadoCarga error={error} /></MarcoAplicacion>;
  const caso = {
    analisis: savedCase.analisis,
    deadline: savedCase.deadline,
    documentos: savedCase.documentos || [],
    name: savedCase.name,
    status: savedCase.status,
  };

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleDocumentosCaso
        analisis={caso.analisis}
        caso={caso}
        idCaso={idCaso}
      />
    </MarcoAplicacion>
  );
}

function EstadoCarga({ error }: { error: string }) { return <p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p>; }
