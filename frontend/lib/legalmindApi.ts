export type CaseArea = {
  label: string;
  path?: string;
  summary: string;
};

export type CaseListItem = {
  areas: CaseArea[];
  caption: string;
  descripcion?: string | null;
  estado?: string;
  id?: number;
  identificador?: string | null;
  imputados_count?: number;
  name: string;
  slug: string;
};

export type CaseAnalysis = {
  datosClave: string[];
  documentosBase: string[];
  generado: string;
  observacion: string;
  resumen: string;
};

export type CaseDefendant = {
  caseLink: string;
  keyData: string[];
  name: string;
  role: string;
  status: string;
  summary: string;
};

export type CaseDetail = {
  analisis?: CaseAnalysis;
  deadline: string;
  defendants: CaseDefendant[];
  descripcion?: string | null;
  name: string;
  slug: string;
  status: string;
};

export const caseAreas: CaseArea[] = [
  {
    label: "Imputados",
    summary: "Fichas y comparaciones",
    path: "imputados",
  },
  {
    label: "Documentos",
    summary: "Escritos y archivos",
  },
  {
    label: "Agenda",
    summary: "Fechas del expediente",
  },
  {
    label: "Jurisprudencia",
    summary: "Material de consulta",
  },
];

export const sampleCases: CaseListItem[] = [
  {
    name: "Caso Gomez",
    slug: "caso-gomez",
    caption: "Vence hoy",
    areas: caseAreas,
  },
  {
    name: "Caso Perez",
    slug: "caso-perez",
    caption: "Audiencia proxima",
    areas: caseAreas,
  },
  {
    name: "Caso Rodriguez",
    slug: "caso-rodriguez",
    caption: "En revision",
    areas: caseAreas,
  },
];

export const sampleCaseDetails: Record<string, CaseDetail> = {
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
    slug: "caso-gomez",
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
    slug: "caso-perez",
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
    slug: "caso-rodriguez",
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

export const apiUrl = (
  process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export async function fetchCases(): Promise<CaseListItem[]> {
  try {
    const response = await fetch(`${apiUrl}/api/casos`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los casos.");
    }

    const body = (await response.json()) as { cases: CaseListItem[] };
    return body.cases.map((legalCase) => ({
      ...legalCase,
      areas: caseAreas,
    }));
  } catch {
    return sampleCases;
  }
}

export async function fetchCaseDetail(idCaso: string): Promise<CaseDetail> {
  try {
    const response = await fetch(`${apiUrl}/api/casos/${idCaso}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el caso.");
    }

    const body = (await response.json()) as { case: CaseDetail };
    return body.case;
  } catch {
    return sampleCaseDetails[idCaso] ?? sampleCaseDetails["caso-gomez"];
  }
}
