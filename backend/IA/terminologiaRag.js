const LEGAL_QUERY_GROUPS = [
  ["imputado", "acusado", "procesado", "encausado", "investigado"],
  ["victima", "damnificado", "denunciante", "querellante"],
  ["audiencia", "comparendo", "vista", "debate", "indagatoria"],
  ["declaracion", "testimonio", "testimonial", "testigo", "deponente"],
  ["pericia", "peritaje", "informe pericial", "perito", "experto"],
  ["prueba", "evidencia", "elemento probatorio", "medio probatorio"],
  ["resolucion", "providencia", "auto", "sentencia", "fallo"],
  ["notificacion", "cedula", "traslado", "intimacion", "comunicacion procesal"],
  ["vencimiento", "plazo", "termino", "caducidad", "fecha limite"],
  ["defensa", "abogado", "letrado", "patrocinio", "representacion"],
  ["fiscalia", "fiscal", "ministerio publico", "acusacion"],
  ["tribunal", "juzgado", "camara", "juez", "magistrado"],
  ["expediente", "causa", "legajo", "actuaciones", "autos"],
  ["recurso", "apelacion", "impugnacion", "revision", "queja"],
  ["medida cautelar", "cautelar", "embargo", "inhibicion", "prision preventiva"],
];

function expandLegalQuery(value) {
  const original = String(value || "").trim();
  if (!original) return "";
  const normalized = normalize(original);
  const additions = LEGAL_QUERY_GROUPS
    .filter((group) => group.some((term) => containsTerm(normalized, normalize(term))))
    .flatMap((group) => group)
    .filter((term) => !containsTerm(normalized, normalize(term)));
  return [...new Set([original, ...additions])].join(" ");
}

function containsTerm(value, term) {
  const valueTokens = value.split(" ").map(stemToken);
  const termTokens = term.split(" ").map(stemToken);
  return valueTokens.some((_, index) =>
    termTokens.every((token, offset) => valueTokens[index + offset] === token)
  );
}

function stemToken(token) {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { expandLegalQuery, LEGAL_QUERY_GROUPS };
