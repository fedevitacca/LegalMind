import DetalleImputadosCaso from "../../../../components/casos/DetalleImputadosCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";

const cases = {
  "caso-gomez": {
    analisis: {
      datosClave: [
        "Hay dos imputados que deben compararse dentro del mismo expediente.",
        "El vencimiento informado requiere revisar actuaciones pendientes.",
        "Parte de los datos personales todavia necesita validacion manual.",
      ],
      documentosBase: [
        "Escrito de inicio",
        "Informe policial",
        "Actuaciones cargadas del expediente",
      ],
      generado: "al crear el caso",
      observacion:
        "Este resumen sirve como lectura rapida. Las fichas de imputados siguen siendo la fuente de trabajo editable.",
      resumen:
        "La causa contiene una imputacion principal y una persona vinculada para contrastar datos, actuaciones y documentacion antes del proximo vencimiento.",
    },
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
    analisis: {
      datosClave: [
        "La audiencia proxima concentra la prioridad del caso.",
        "Hay fichas individuales en distinto estado de carga.",
        "Conviene revisar las actuaciones compartidas entre imputados.",
      ],
      documentosBase: [
        "Citacion a audiencia",
        "Documentacion recibida",
        "Notas iniciales del expediente",
      ],
      generado: "durante la carga inicial",
      observacion:
        "El analisis muestra contexto general del expediente y no reemplaza la revision profesional.",
      resumen:
        "El expediente tiene dos imputados vinculados a actuaciones previas a audiencia, con informacion lista para ordenar y comparar.",
    },
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
    analisis: {
      datosClave: [
        "La informacion surgio de la documentacion general cargada.",
        "Los campos extraidos necesitan confirmacion.",
      ],
      documentosBase: [
        "Documentacion general del expediente",
        "Informe preliminar",
      ],
      generado: "cuando se subieron los archivos",
      observacion:
        "El resumen queda disponible para consulta aunque los datos editables se completen despues.",
      resumen:
        "El caso esta en revision inicial y el material cargado permitio extraer una primera ficha del imputado.",
    },
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
      <DetalleImputadosCaso
        analisis={legalCase.analisis}
        caso={legalCase}
        idCaso={idCaso}
      />
    </MarcoAplicacion>
  );
}
