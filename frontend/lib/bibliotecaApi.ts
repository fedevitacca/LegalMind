export type LibraryResourceType = "ley" | "fallo" | "doctrina" | "modelo" | "enlace" | "nota";
export type LibraryResource = {
  id: number;
  titulo: string;
  tipo: LibraryResourceType;
  jurisdiccion?: string | null;
  referencia?: string | null;
  url?: string | null;
  notas?: string | null;
  etiquetas: string[];
  destacado: boolean;
  autor_nombre?: string | null;
  updated_at: string;
};
export type LibraryResourceInput = Omit<LibraryResource, "id" | "autor_nombre" | "updated_at">;

const API_URL = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/biblioteca${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No se pudo completar la operación.");
  return body;
}

export const libraryApi = {
  list: (filters?: { query?: string; type?: string; featured?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.query) params.set("q", filters.query);
    if (filters?.type) params.set("tipo", filters.type);
    if (filters?.featured) params.set("destacados", "true");
    const query = params.toString();
    return request<{ resources: LibraryResource[] }>(query ? `?${query}` : "");
  },
  create: (input: LibraryResourceInput) => request<{ resource: LibraryResource }>("", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: Partial<LibraryResourceInput>) => request<{ resource: LibraryResource }>(`/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/${id}`, { method: "DELETE" }),
};
