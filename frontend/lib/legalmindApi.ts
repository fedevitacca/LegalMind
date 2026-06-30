export type CaseArea = {
  label: string;
  path?: string;
  summary: string;
};

export type CaseListItem = {
  alert_level?: "urgente" | "proximo" | null;
  areas: CaseArea[];
  caption: string;
  descripcion?: string | null;
  estado?: string;
  id?: number;
  identificador?: string | null;
  imputados_count?: number;
  name: string;
  proxima_alerta?: string | null;
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

export type CaseDocument = {
  categoria: string;
  fecha: string;
  id?: number;
  nombre: string;
  resumen: string;
};

export type CaseJurisprudence = {
  anio: string;
  detalle: string;
  id?: number;
  titulo: string;
};

export type CaseDate = {
  descripcion: string;
  dia: string;
  hora: string;
  id?: number;
  prioridad: "Alta" | "Media" | "Baja";
};

export type CaseDetail = {
  analisis?: CaseAnalysis;
  deadline: string;
  defendants: CaseDefendant[];
  descripcion?: string | null;
  documentos?: CaseDocument[];
  fechas?: CaseDate[];
  id?: number;
  identificador?: string | null;
  jurisprudencia?: CaseJurisprudence[];
  name: string;
  slug: string;
  status: string;
};

export type CreateCasePayload = {
  caratula: string;
  descripcion?: string;
  documentos?: string[];
  estado?: "activa" | "archivada" | "cerrada";
  fecha_importante?: string;
  identificador?: string;
  imputados?: Array<{
    datos_contexto?: Record<string, unknown>;
    nombre: string;
    rol?: string;
  }>;
  jurisprudencia?: string[];
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
    path: "documentos",
  },
  {
    label: "Agenda",
    summary: "Fechas del expediente",
    path: "agenda",
  },
  {
    label: "Jurisprudencia",
    summary: "Material de consulta",
    path: "jurisprudencia",
  },
];

export async function fetchCases(): Promise<CaseListItem[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/casos`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los casos.");
    }

    const body = (await response.json()) as { cases?: CaseListItem[] };
    return (body.cases || []).map((legalCase) => ({
      ...legalCase,
      areas: caseAreas,
    }));
  } catch {
    return [];
  }
}

export async function fetchCaseDetail(idCaso: string): Promise<CaseDetail> {
  if (/^\d+$/.test(idCaso)) {
    try {
      const response = await fetch(`${getApiUrl()}/api/casos/${idCaso}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No se pudo cargar el caso.");
      }

      const body = (await response.json()) as { case?: CaseDetail };

      if (body.case) {
        return body.case;
      }
    } catch {
      return buildSampleCaseFromSlug(idCaso);
    }
  }

  return buildSampleCaseFromSlug(idCaso);
}

export async function createCase(payload: CreateCasePayload): Promise<CaseDetail> {
  const response = await fetch(`${getApiUrl()}/api/casos`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json()) as { case?: CaseDetail; error?: string };

  if (!response.ok || !body.case) {
    throw new Error(body.error || "No se pudo crear el caso.");
  }

  return body.case;
}

function buildSampleCaseFromSlug(slug: string): CaseDetail {
  const name = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    analisis: {
      datosClave: [
        "Caso no encontrado en la base de datos.",
        "Volver al listado para abrir un expediente guardado.",
      ],
      documentosBase: [],
      generado: "desde la pantalla de nuevo caso",
      observacion:
        "Esta ficha se muestra como respaldo cuando no se pudo cargar el expediente.",
      resumen:
        "No hay datos guardados para este identificador.",
    },
    deadline: "Sin vencimiento cargado",
    defendants: [],
    name: name || "Caso nuevo",
    slug,
    status: "Borrador",
  };
}

function getApiUrl() {
  return process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
}
