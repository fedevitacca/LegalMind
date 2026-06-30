import DetalleAgendaCaso from "../../../../components/casos/DetalleAgendaCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { fetchCaseDetail } from "../../../../lib/legalmindApi";

export default async function PaginaAgenda({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const savedCase = await fetchCaseDetail(idCaso);
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
