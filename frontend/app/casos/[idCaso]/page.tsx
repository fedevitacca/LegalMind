import ResumenCaso from "../../../components/casos/ResumenCaso";
import MarcoAplicacion from "../../../components/estructura/MarcoAplicacion";
import { fetchCaseDetail } from "../../../lib/legalmindApi";

export default async function PaginaResumenCaso({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const legalCase = await fetchCaseDetail(idCaso);

  return (
    <MarcoAplicacion activeSection="Casos">
      <ResumenCaso caso={legalCase} idCaso={idCaso} />
    </MarcoAplicacion>
  );
}
