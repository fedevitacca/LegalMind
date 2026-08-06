import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import HistorialConsultasIA from "../../../../components/ia/HistorialConsultasIA";

export default async function PaginaConsultas({ params }: { params: Promise<{ idCaso: string }> }) {
  const { idCaso } = await params;
  return <MarcoAplicacion activeSection="Casos"><HistorialConsultasIA caseId={idCaso} /></MarcoAplicacion>;
}
