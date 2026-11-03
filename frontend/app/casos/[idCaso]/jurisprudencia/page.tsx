"use client";

import { useParams } from "next/navigation";
import DetalleJurisprudenciaCaso from "../../../../components/casos/DetalleJurisprudenciaCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import { useCaseDetailClient } from "../../../../lib/useCaseDetailClient";

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

export default function PaginaJurisprudencia() {
  const { idCaso } = useParams<{ idCaso: string }>();
  const { error, legalCase: caso } = useCaseDetailClient(idCaso);
  if (!caso) return <MarcoAplicacion activeSection="Casos"><p className="m-8 rounded-2xl border border-[#88A9C8] bg-white p-6 text-[#0F2044]">{error || "Cargando expediente..."}</p></MarcoAplicacion>;
  const fallosDelCaso = caso.jurisprudencia?.length
    ? caso.jurisprudencia
    : fallos;

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleJurisprudenciaCaso
        caso={caso}
        fallos={fallosDelCaso}
        idCaso={idCaso}
      />
    </MarcoAplicacion>
  );
}
