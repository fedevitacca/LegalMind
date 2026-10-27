export type Notificacion = {
  id: string | number;
  causa_id: string | number | null;
  titulo: string;
  mensaje: string;
  programado_para: string;
  leido_at: string | null;
  canal: "app" | "email";
  email_estado: "no_solicitado" | "pendiente" | "enviado" | "error" | "cancelado";
  email_intentos: number;
  email_proximo_intento: string | null;
  caratula: string | null;
};

export type BandejaNotificaciones = {
  notificaciones: Notificacion[];
  no_leidas: number;
  email_disponible: boolean;
};

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";

async function request(path = "", options: RequestInit = {}) {
  const response = await fetch(`${apiUrl}/api/notificaciones${path}`, {
    ...options, credentials: "include", cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "No se pudieron cargar las notificaciones.");
  return data;
}

export async function fetchNotifications(signal?: AbortSignal): Promise<BandejaNotificaciones> {
  return request("", { signal });
}

export async function createNotification(payload: { titulo: string; mensaje: string; programado_para?: string; email: boolean }) {
  return request("", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateNotification(id: string | number, accion: "leer" | "cancelar") {
  return request(`/${id}`, { method: "PUT", body: JSON.stringify({ accion }) });
}

export async function markNotificationsRead() {
  return request("/leidas", { method: "PUT" });
}
