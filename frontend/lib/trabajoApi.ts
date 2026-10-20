export type ChecklistItem = { id: number; texto: string; completado: boolean; orden: number };
export type WorkTask = {
  id: number; causa_id?: number | null; caratula?: string | null; identificador?: string | null;
  titulo: string; descripcion?: string | null; tipo: string; estado: string; prioridad: string;
  responsable_user_id?: string | null; responsable_nombre?: string | null; fecha_limite?: string | null;
  estimacion_minutos?: number | null; items: ChecklistItem[]; comentarios_count?: number;
  visible_portal?: boolean; requiere_confirmacion?: boolean; confirmado_cliente_at?: string | null;
};
export type Member = { id: string; name: string; email: string; rol: string };
export type Contact = { id: number; nombre: string; tipo: string; documento?: string; email?: string; telefono?: string; organizacion_nombre?: string; rol?: string; es_cliente?: boolean };
export type ChecklistTemplate = { id: number | string; nombre: string; etapa: string; descripcion?: string; items_json: string[] };
export type Hearing = { id: number; titulo: string; fecha?: string; lugar?: string; participantes?: string; objetivo?: string; argumentos?: string; preguntas?: string; objeciones?: string; notas?: string; resultado?: string; proximas_acciones?: string; checklist_json?: string[]; estado: string };
export type Communication = { id: number; tipo: string; fecha: string; asunto: string; resumen?: string; compromisos?: string; proximo_contacto?: string };
export type FinanceMovement = { id: number; tipo: string; concepto: string; monto: string | number; moneda: string; fecha: string; estado: string; notas?: string };
export type TimeEntry = { id: number; descripcion: string; minutos: number; fecha: string; facturable: boolean };
export type WritingTemplate = { id: number; nombre: string; categoria: string; contenido: string; variables_json: string[] };
export type Writing = { id: number; titulo: string; contenido: string; estado: string; version: number; updated_at: string };
export type PortalMessage = { id:number; autor_tipo:string; contenido:string; created_at:string };
export type PortalAccess = { id: number; etiqueta: string; expires_at?: string; revocado_at?: string; ultimo_acceso_at?: string; token?: string; mensajes?:PortalMessage[] };
export type PortalUpload = {id:number;nombre_archivo:string;descripcion?:string;created_at:string;etiqueta:string};
export type Review = { id: number; estado: string; observaciones?: string; created_at: string; revisor_nombre?: string };
export type ReviewSnapshot = { tareas_pendientes: number; tareas_vencidas: number; fechas_vencidas: number; documentos: number; contactos: number; comunicaciones: number; audiencias_en_preparacion: number; accesos_portal_activos: number };
export type CaseWorkSummary = {
  tasks: WorkTask[]; contacts: Contact[]; audiences: Hearing[]; communications: Communication[];
  movements: FinanceMovement[]; times: TimeEntry[]; writing_templates: WritingTemplate[]; writings: Writing[];
  portal_access: PortalAccess[]; portal_uploads: PortalUpload[]; reviews: Review[]; review_snapshot: ReviewSnapshot; members: Member[];
  checklist_templates: ChecklistTemplate[]; finance: { honorarios: string; pagos: string; gastos: string; minutos: number };
};

const API_URL = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";

export async function workApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error || "No se pudo completar la operacion.");
  return body as T;
}

export function formatMoney(value: string | number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(Number(value || 0));
}

export function formatWorkDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value));
}
