import DetalleJurisprudenciaCaso from "../../../../components/casos/DetalleJurisprudenciaCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { fetchCaseDetail } from "../../../../lib/legalmindApi";

const fallos = [
  {
    anio: "2022",
    detalle:
      "Criterio reciente para revisar operaciones patrimoniales, trazabilidad documental y elementos subjetivos.",
    titulo: "Lavado de dinero",
  },
  {
    anio: "2021",
    detalle:
      "Antecedente util para contrastar ingreso, circulacion y documentacion de mercaderia observada.",
    titulo: "Contrabando",
  },
  {
    anio: "2020",
    detalle:
      "Fallo de consulta para ordenar roles, acuerdos previos y prueba comun entre personas imputadas.",
    titulo: "Asociacion ilicita",
  },
];

export default async function PaginaJurisprudencia({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const caso = await fetchCaseDetail(idCaso);

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleJurisprudenciaCaso caso={caso} fallos={fallos} idCaso={idCaso} />
    </MarcoAplicacion>
  );
}
