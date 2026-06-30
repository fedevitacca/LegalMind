import DetalleDocumentosCaso from "../../../../components/casos/DetalleDocumentosCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { fetchCaseDetail } from "../../../../lib/legalmindApi";

export default async function PaginaDocumentos({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const savedCase = await fetchCaseDetail(idCaso);
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
