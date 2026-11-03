"use client";

import { useParams } from "next/navigation";
import ChatExpediente from "../../../../components/ia/ChatExpediente";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { useCaseDetailClient } from "../../../../lib/useCaseDetailClient";

export default function PaginaChatExpediente() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase } = useCaseDetailClient(idCaso);
  return <MarcoAplicacion activeSection="Casos">{legalCase
    ? <ChatExpediente caseId={idCaso} caseName={legalCase.name} />
    : <p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p>}
  </MarcoAplicacion>;
}
