import ChatExpediente from "../../../../components/ia/ChatExpediente";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { fetchCaseDetail } from "../../../../lib/legalmindServerApi";

export default async function PaginaChatExpediente({ params }: { params: Promise<{ idCaso: string }> }) {
  const { idCaso } = await params;
  const legalCase = await fetchCaseDetail(idCaso);
  return <MarcoAplicacion activeSection="Casos"><ChatExpediente caseId={idCaso} caseName={legalCase.name} /></MarcoAplicacion>;
}
