import BarraBusqueda from "../../../../components/panel/BarraBusqueda";
import EspacioImputados from "../../../../components/casos/EspacioImputados";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";
import NavegacionAreasCaso from "../../../../components/casos/NavegacionAreasCaso";
import PanelAnalisisCaso from "../../../../components/casos/PanelAnalisisCaso";

const cases = {
  "caso-gomez": {
    name: "Caso Gomez",
    deadline: "Vence en 2 dias",
    status: "Activo",
    defendants: [
      {
        caseLink:
          "Figura en la imputacion inicial y aparece en actuaciones que deben compararse con el expediente general.",
        keyData: [
          "Hechos atribuidos y fecha de incorporacion",
          "Defensa o representante registrado",
          "Actuaciones y documentos vinculados",
        ],
        name: "Martin Gomez",
        role: "Imputacion principal bajo revision.",
        status: "Ficha disponible",
        summary: "Imputacion principal con ficha lista para consultar.",
      },
      {
        caseLink:
          "Quedo vinculada al mismo expediente para contrastar datos, actuaciones y documentos con el resto de imputados.",
        keyData: [
          "Datos personales pendientes de validar",
          "Relacion con actuaciones cargadas",
          "Diferencias frente a la imputacion principal",
        ],
        name: "Maria Gimenez",
        role: "Datos comparables con actuaciones del expediente.",
        status: "Pendiente de validar",
        summary: "Tiene datos comparables y puntos pendientes de validacion.",
      },
    ],
  },
  "caso-perez": {
    name: "Caso Perez",
    deadline: "Audiencia en 6 dias",
    status: "Activo",
    defendants: [
      {
        caseLink:
          "Se agrego al expediente por la actuacion que se prepara para la proxima audiencia.",
        keyData: [
          "Audiencia relacionada",
          "Documentacion recibida",
          "Datos de contacto de la defensa",
        ],
        name: "Lucia Perez",
        role: "Ficha individual para completar.",
        status: "En carga",
        summary: "Ficha inicial en carga para la proxima audiencia.",
      },
      {
        caseLink:
          "Comparte actuaciones relevantes dentro del mismo caso y requiere contraste con la ficha principal.",
        keyData: [
          "Actuaciones compartidas",
          "Fechas del expediente",
          "Observaciones de la abogada",
        ],
        name: "Tomas Rivas",
        role: "Actuaciones vinculadas para comparar.",
        status: "Ficha disponible",
        summary: "Actuaciones vinculadas listas para comparar.",
      },
    ],
  },
  "caso-rodriguez": {
    name: "Caso Rodriguez",
    deadline: "Sin vencimiento hoy",
    status: "Revision",
    defendants: [
      {
        caseLink:
          "Fue extraido de la documentacion general del expediente y necesita revision manual.",
        keyData: [
          "Origen de la informacion",
          "Documentos usados para la extraccion",
          "Campos pendientes de confirmar",
        ],
        name: "Nicolas Rodriguez",
        role: "Datos generales extraidos del expediente.",
        status: "En revision",
        summary: "Datos extraidos que todavia necesitan revision.",
      },
    ],
  },
};

export default async function PaginaImputados({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const legalCase = cases[idCaso as keyof typeof cases] ?? cases["caso-gomez"];

  return (
    <MarcoAplicacion activeSection="Casos">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_285px] bg-[#F4F7F5] text-[#0F2044]">
        <section className="h-full overflow-y-auto px-8 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            <BarraBusqueda
              actionLabel="Minimizar"
              actionTone="soft"
              placeholder="Buscar dentro del caso"
            />

            <NavegacionAreasCaso activeArea="Imputados" caseSlug={idCaso} />

            <header className="rounded-lg border border-[#84A2BD]/35 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
                Expediente abierto
              </p>
              <h1 className="mt-1 text-3xl font-semibold">
                {legalCase.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
                  {legalCase.status}
                </span>
                <span className="rounded-full bg-[#F4F7F5] px-3 py-1.5">
                  {legalCase.defendants.length} imputados
                </span>
                <span className="rounded-full bg-[#A68147]/15 px-3 py-1.5 text-[#0F2044]">
                  {legalCase.deadline}
                </span>
              </div>
            </header>

            <EspacioImputados defendants={legalCase.defendants} />
          </div>
        </section>

        <PanelAnalisisCaso />
      </div>
    </MarcoAplicacion>
  );
}
