function buildStructuredCaseDocuments({ tasks = [], hearings = [], dates = [], communications = [] } = {}) {
  return [
    buildDocument(
      "gestion-tareas",
      "Tareas del expediente",
      tasks.filter((item) => item.estado !== "cancelada").slice(0, 40).map(formatTask),
      "Tareas"
    ),
    buildDocument(
      "gestion-audiencias",
      "Audiencias del expediente",
      hearings.slice(0, 30).map(formatHearing),
      "Audiencias"
    ),
    buildDocument(
      "gestion-fechas",
      "Fechas registradas del expediente",
      dates.slice(0, 50).map(formatDate),
      "Fechas"
    ),
    buildDocument(
      "gestion-comunicaciones",
      "Comunicaciones del expediente",
      communications.filter((item) => !item.privada).slice(0, 30).map(formatCommunication),
      "Comunicaciones"
    ),
  ].filter(Boolean);
}

function buildDocument(id, name, entries, section) {
  const text = entries.filter(Boolean).join("\n");
  if (!text) return null;
  return {
    id,
    nombre_archivo: name,
    texto_extraido: text,
    metadata: { section, source_type: "case_management" },
  };
}

function formatTask(item) {
  const pendingItems = normalizeArray(item.items)
    .filter((entry) => !entry.completado)
    .map((entry) => entry.texto)
    .filter(Boolean);
  return sentence([
    `Tarea: ${item.titulo || "sin titulo"}`,
    item.estado ? `estado ${item.estado}` : "",
    item.prioridad ? `prioridad ${item.prioridad}` : "",
    item.fecha_limite ? `fecha limite ${formatValue(item.fecha_limite)}` : "",
    item.responsable_nombre ? `responsable ${item.responsable_nombre}` : "",
    item.descripcion,
    pendingItems.length ? `items pendientes: ${pendingItems.join(", ")}` : "",
  ]);
}

function formatHearing(item) {
  return sentence([
    `Audiencia: ${item.titulo || "sin titulo"}`,
    item.fecha ? `fecha ${formatValue(item.fecha)}` : "",
    item.lugar ? `lugar ${item.lugar}` : "",
    item.estado ? `estado ${item.estado}` : "",
    item.participantes ? `participantes ${item.participantes}` : "",
    item.objetivo ? `objetivo ${item.objetivo}` : "",
    item.argumentos ? `argumentos ${item.argumentos}` : "",
    item.preguntas ? `preguntas preparadas ${item.preguntas}` : "",
    item.objeciones ? `objeciones previstas ${item.objeciones}` : "",
    item.resultado ? `resultado ${item.resultado}` : "",
    item.proximas_acciones ? `proximas acciones ${item.proximas_acciones}` : "",
  ]);
}

function formatDate(item) {
  return sentence([
    `Fecha registrada: ${item.evento || "evento sin titulo"}`,
    item.fecha ? formatValue(item.fecha) : item.fecha_texto,
    item.tipo ? `tipo ${item.tipo}` : "",
    item.estado ? `estado ${item.estado}` : "",
    item.prioridad ? `prioridad ${item.prioridad}` : "",
    item.requiere_alerta ? "requiere alerta" : "",
  ]);
}

function formatCommunication(item) {
  return sentence([
    `Comunicacion: ${item.asunto || item.tipo || "sin asunto"}`,
    item.fecha ? `fecha ${formatValue(item.fecha)}` : "",
    item.tipo ? `tipo ${item.tipo}` : "",
    item.resumen,
    item.compromisos ? `compromisos ${item.compromisos}` : "",
    item.proximo_contacto ? `proximo contacto ${formatValue(item.proximo_contacto)}` : "",
  ]);
}

function sentence(parts) {
  const value = parts.map((part) => String(part || "").trim()).filter(Boolean).join(". ");
  return value ? `${value.replace(/[.\s]+$/g, "")}.` : "";
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || "[]"); } catch { return []; }
}

function formatValue(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value || "");
}

module.exports = { buildStructuredCaseDocuments };
