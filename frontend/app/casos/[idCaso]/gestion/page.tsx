import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import CentroGestionCaso from "../../../../components/trabajo/CentroGestionCaso";
import { fetchCaseDetail } from "../../../../lib/legalmindServerApi";

export default async function PaginaGestionCaso({params}:{params:Promise<{idCaso:string}>}) {
  const {idCaso}=await params; const legalCase=await fetchCaseDetail(idCaso);
  return <MarcoAplicacion activeSection="Casos"><CentroGestionCaso caseId={idCaso} caseName={legalCase.name} /></MarcoAplicacion>;
}
