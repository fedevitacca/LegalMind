import DetalleImputadosCaso from "../../../../components/casos/DetalleImputadosCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { fetchCaseDetail } from "../../../../lib/legalmindApi";

export default async function PaginaImputados({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const legalCase = await fetchCaseDetail(idCaso);

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleImputadosCaso
        analisis={legalCase.analisis}
        caso={legalCase}
        idCaso={idCaso}
      />
    </MarcoAplicacion>
  );
}
