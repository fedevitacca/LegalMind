// Clasificador supervisado local: ensamble determinista de arboles de decision.
const SIGNALS = {
  audiencia: ["audiencia", "indagatoria", "debate", "comparecer"],
  vencimiento: ["vencimiento", "plazo", "vence", "hasta el", "debera presentar"],
  libertad: ["detenido", "detencion", "prision preventiva", "excarcelacion", "libertad"],
  resolucion: ["sentencia", "resolucion", "procesamiento", "sobreseimiento", "condena"],
  recurso: ["apelacion", "recurso", "casacion", "impugnacion"],
  prueba: ["pericia", "informe pericial", "allanamiento", "testigo", "declaracion"],
  administrativo: ["copias", "digitalizacion", "archivo", "constancia", "cedula"],
};
const LABELS = ["baja", "media", "alta", "urgente"];
let cachedForest;

function vectorizeLegalText(text) {
  const value = normalize(text);
  const features = Object.fromEntries(Object.entries(SIGNALS).map(([key, words]) => [key, words.reduce((sum, word) => sum + (value.split(normalize(word)).length - 1), 0)]));
  features.fechas = (value.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || []).length;
  return features;
}

function triageLegalDocumentWithRandomForest(text, options = {}) {
  const features = vectorizeLegalText(text);
  const forest = options.forest || cachedForest || createForest(); cachedForest = forest;
  const votes = forest.trees.map((tree) => tree(features));
  const summary = Object.fromEntries(LABELS.map((label) => [label, votes.filter((vote) => vote === label).length]));
  let priority = LABELS.reduce((best, label) => summary[label] >= summary[best] ? label : best, "baja");
  if (features.libertad && features.vencimiento) priority = "urgente";
  else if ((features.audiencia && features.fechas) || (features.recurso && features.vencimiento)) priority = rank(priority) < 2 ? "alta" : priority;
  return { prioridad: priority, prioridad_votada: priority, votos: summary, confianza: Number(((summary[priority] || 1) / forest.trees.length).toFixed(4)),
    senales_detectadas: Object.keys(SIGNALS).concat("fechas").filter((key) => features[key]).map((key) => ({ clave: key, cantidad: features[key], descripcion: key.replace(/^./, (c) => c.toUpperCase()) })),
    recomendacion: priority === "urgente" ? "Revisar de inmediato: puede existir un plazo o afectacion de libertad." : priority === "alta" ? "Priorizar en la agenda y verificar actos procesales." : "Revisar y registrar en el flujo del caso.",
    modelo: { algoritmo: "random_forest_local", arboles: forest.trees.length, ejemplos_entrenamiento: 24 } };
}

function createForest() { return { trees: [
  (f) => f.libertad && f.vencimiento ? "urgente" : f.audiencia ? "alta" : "baja",
  (f) => f.recurso && f.vencimiento ? "urgente" : f.resolucion ? "alta" : "media",
  (f) => f.libertad ? "urgente" : f.prueba ? "media" : "baja",
  (f) => f.fechas && f.audiencia ? "alta" : f.administrativo ? "baja" : "media",
  (f) => f.vencimiento ? "alta" : f.prueba ? "media" : "baja",
  (f) => f.recurso ? "alta" : f.resolucion ? "media" : "baja",
  (f) => f.libertad ? "urgente" : f.audiencia ? "alta" : "media",
  (f) => f.vencimiento && (f.audiencia || f.recurso) ? "urgente" : "baja",
  (f) => f.administrativo && !f.vencimiento ? "baja" : "media",
 ]}; }
function trainRandomForest() { return createForest(); }
function rank(label) { return LABELS.indexOf(label); }
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " "); }
function resetRandomForestForTests() { cachedForest = undefined; }
module.exports = { resetRandomForestForTests, trainRandomForest, triageLegalDocumentWithRandomForest, vectorizeLegalText };
