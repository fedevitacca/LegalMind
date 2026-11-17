function crearDocumentosDelContexto({ tasks: tareas = [], hearings: audiencias = [], dates: fechas = [], communications: comunicaciones = [] } = {}) {
  return [
    crearDocumento(
      "gestion-tareas",
      "Tareas del expediente",
      tareas.filter((elemento) => elemento.estado !== "cancelada").slice(0, 40).map(formatearTarea),
      "Tareas"
    ),
    crearDocumento(
      "gestion-audiencias",
      "Audiencias del expediente",
      audiencias.slice(0, 30).map(formatearAudiencia),
      "Audiencias"
    ),
    crearDocumento(
      "gestion-fechas",
      "Fechas registradas del expediente",
      fechas.slice(0, 50).map(formatearFecha),
      "Fechas"
    ),
    crearDocumento(
      "gestion-comunicaciones",
      "Comunicaciones del expediente",
      comunicaciones.filter((elemento) => !elemento.privada).slice(0, 30).map(formatearComunicacion),
      "Comunicaciones"
    ),
  ].filter(Boolean);
}

function crearDocumento(id, nombre, entradas, seccion) {
  const texto = entradas.filter(Boolean).join("\n");
  if (!texto) return null;
  return {
    id,
    nombre_archivo: nombre,
    texto_extraido: texto,
    metadata: { section: seccion, source_type: "case_management" },
  };
}

function formatearTarea(elemento) {
  const asuntosPendientes = normalizarArreglo(elemento.items)
    .filter((entrada) => !entrada.completado)
    .map((entrada) => entrada.texto)
    .filter(Boolean);
  return oracion([
    `Tarea: ${elemento.titulo || "sin titulo"}`,
    elemento.estado ? `estado ${elemento.estado}` : "",
    elemento.prioridad ? `prioridad ${elemento.prioridad}` : "",
    elemento.fecha_limite ? `fecha limite ${formatearValor(elemento.fecha_limite)}` : "",
    elemento.responsable_nombre ? `responsable ${elemento.responsable_nombre}` : "",
    elemento.descripcion,
    asuntosPendientes.length ? `items pendientes: ${asuntosPendientes.join(", ")}` : "",
  ]);
}

function formatearAudiencia(elemento) {
  return oracion([
    `Audiencia: ${elemento.titulo || "sin titulo"}`,
    elemento.fecha ? `fecha ${formatearValor(elemento.fecha)}` : "",
    elemento.lugar ? `lugar ${elemento.lugar}` : "",
    elemento.estado ? `estado ${elemento.estado}` : "",
    elemento.participantes ? `participantes ${elemento.participantes}` : "",
    elemento.objetivo ? `objetivo ${elemento.objetivo}` : "",
    elemento.argumentos ? `argumentos ${elemento.argumentos}` : "",
    elemento.preguntas ? `preguntas preparadas ${elemento.preguntas}` : "",
    elemento.objeciones ? `objeciones previstas ${elemento.objeciones}` : "",
    elemento.resultado ? `resultado ${elemento.resultado}` : "",
    elemento.proximas_acciones ? `proximas acciones ${elemento.proximas_acciones}` : "",
  ]);
}

function formatearFecha(elemento) {
  return oracion([
    `Fecha registrada: ${elemento.evento || "evento sin titulo"}`,
    elemento.fecha ? formatearValor(elemento.fecha) : elemento.fecha_texto,
    elemento.tipo ? `tipo ${elemento.tipo}` : "",
    elemento.estado ? `estado ${elemento.estado}` : "",
    elemento.prioridad ? `prioridad ${elemento.prioridad}` : "",
    elemento.requiere_alerta ? "requiere alerta" : "",
  ]);
}

function formatearComunicacion(elemento) {
  return oracion([
    `Comunicacion: ${elemento.asunto || elemento.tipo || "sin asunto"}`,
    elemento.fecha ? `fecha ${formatearValor(elemento.fecha)}` : "",
    elemento.tipo ? `tipo ${elemento.tipo}` : "",
    elemento.resumen,
    elemento.compromisos ? `compromisos ${elemento.compromisos}` : "",
    elemento.proximo_contacto ? `proximo contacto ${formatearValor(elemento.proximo_contacto)}` : "",
  ]);
}

function oracion(partes) {
  const valor = partes.map((parte) => String(parte || "").trim()).filter(Boolean).join(". ");
  return valor ? `${valor.replace(/[.\s]+$/g, "")}.` : "";
}

function normalizarArreglo(valor) {
  if (Array.isArray(valor)) return valor;
  try { return JSON.parse(valor || "[]"); } catch { return []; }
}

function formatearValor(valor) {
  if (valor instanceof Date) return valor.toISOString();
  return String(valor || "");
}

module.exports = { crearDocumentosDelContexto };
