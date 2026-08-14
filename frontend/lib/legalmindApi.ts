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
  documento_identidad?: string | null;
  id?: number;
  keyData: string[];
  name: string;
  notas?: string | null;
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
  estado?: string;
  sha256?: string | null;
  version?: number;
  requiere_ocr?: boolean;
  confianza_extraccion?: number | null;
  download_url?: string | null;
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

export type CaseDeadline = {
  caratula: string;
  causa_id: number;
  dias_restantes: number | null;
  estado: string;
  evento: string;
  expediente?: string | null;
  fecha?: string | null;
  fecha_texto?: string | null;
  id: number;
  prioridad: "baja" | "media" | "alta" | "urgente";
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

export type CreateCaseDefendantPayload = {
  datos_contexto?: Record<string, unknown>;
  documento_identidad?: string;
  nombre: string;
  notas?: string;
  rol?: string;
};

export type CreateCaseDocumentPayload = {
  archivo?: File | null;
  nombre_archivo: string;
  texto_extraido?: string;
  tipo_archivo?: string;
};

export type CreateCaseJurisprudencePayload = {
  anio?: string;
  referencia?: string;
  resumen?: string;
  titulo: string;
  tribunal?: string;
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

export async function fetchCases(cookieHeader?: string): Promise<CaseListItem[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/casos`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
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

export async function fetchCaseDetail(idCaso: string, cookieHeader?: string): Promise<CaseDetail> {
  if (/^\d+$/.test(idCaso)) {
    try {
      const response = await fetch(`${getApiUrl()}/api/casos/${idCaso}`, {
        cache: "no-store",
        credentials: "include",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
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
    credentials: "include",
  });

  const body = (await response.json()) as { case?: CaseDetail; error?: string };

  if (!response.ok || !body.case) {
    throw new Error(body.error || "No se pudo crear el caso.");
  }

  return body.case;
}

export async function createCaseDefendant(
  caseId: number | string,
  payload: CreateCaseDefendantPayload,
): Promise<CaseDefendant> {
  const response = await fetch(`${getApiUrl()}/api/casos/${caseId}/imputados`, {
    body: JSON.stringify(payload),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json()) as {
    error?: string;
    imputado?: CaseDefendant;
  };

  if (!response.ok || !body.imputado) {
    throw new Error(body.error || "No se pudo cargar el imputado.");
  }

  return body.imputado;
}

export async function fetchDeadlines(cookieHeader?: string): Promise<CaseDeadline[]> {
  try {
    const today = formatDateForQuery(new Date());
    const response = await fetch(`${getApiUrl()}/api/casos/vencimientos/proximos?desde=${today}&limit=20`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los vencimientos.");
    }

    const body = (await response.json()) as { vencimientos?: CaseDeadline[] };
    return body.vencimientos || [];
  } catch {
    return [];
  }
}

export async function createCaseDate(
  caseId: number | string,
  payload: {
    evento: string;
    fecha?: string;
    fecha_texto?: string;
    prioridad: "baja" | "media" | "alta" | "urgente";
    tipo?: string;
  },
): Promise<CaseDate> {
  const response = await fetch(`${getApiUrl()}/api/casos/${caseId}/fechas`, {
    body: JSON.stringify(payload),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json()) as { fecha?: CaseDate; error?: string };

  if (!response.ok || !body.fecha) {
    throw new Error(body.error || "No se pudo guardar la fecha.");
  }

  return body.fecha;
}

export async function updateCaseDate(
  caseId: number | string,
  dateId: number | string,
  payload: { estado?: "pendiente" | "en_seguimiento" | "completada" | "cancelada" },
): Promise<CaseDate> {
  const response = await fetch(`${getApiUrl()}/api/casos/${caseId}/fechas/${dateId}`, {
    body: JSON.stringify(payload),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  const body = (await response.json()) as { fecha?: CaseDate; error?: string };

  if (!response.ok || !body.fecha) {
    throw new Error(body.error || "No se pudo actualizar la fecha.");
  }

  return body.fecha;
}

export async function createCaseDocument(
  caseId: number | string,
  payload: CreateCaseDocumentPayload,
): Promise<CaseDocument> {
  const formData = new FormData();
  formData.append("nombre_archivo", payload.nombre_archivo);
  formData.append("tipo_archivo", payload.tipo_archivo || "oficial");

  if (payload.texto_extraido) {
    formData.append("texto_extraido", payload.texto_extraido);
  }

  if (payload.archivo) {
    formData.append("archivo", payload.archivo);
  }

  const response = await fetch(`${getApiUrl()}/api/casos/${caseId}/documentos`, {
    body: formData,
    credentials: "include",
    method: "POST",
  });

  const body = (await response.json()) as { documento?: CaseDocument; error?: string };

  if (!response.ok || !body.documento) {
    throw new Error(body.error || "No se pudo cargar el documento.");
  }

  return body.documento;
}

export async function createCaseJurisprudence(
  caseId: number | string,
  payload: CreateCaseJurisprudencePayload,
): Promise<CaseJurisprudence> {
  const response = await fetch(`${getApiUrl()}/api/casos/${caseId}/jurisprudencia`, {
    body: JSON.stringify(payload),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json()) as {
    error?: string;
    jurisprudencia?: CaseJurisprudence;
  };

  if (!response.ok || !body.jurisprudencia) {
    throw new Error(body.error || "No se pudo cargar la jurisprudencia.");
  }

  return body.jurisprudencia;
}

export async function uploadCaseDocument(caseId: number | string, file: File): Promise<CaseDocument> {
  return createCaseDocument(caseId, {
    archivo: file,
    nombre_archivo: file.name,
    tipo_archivo: "oficial",
  });
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

function formatDateForQuery(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
