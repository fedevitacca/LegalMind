const GRUPOS_TERMINOS_JURIDICOS = [
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

function ampliarConsultaJuridica(valor) {
  const original = String(valor || "").trim();
  if (!original) return "";
  const normalizado = normalizar(original);
  const terminosAdicionales = GRUPOS_TERMINOS_JURIDICOS
    .filter((grupo) => grupo.some((termino) => contieneTermino(normalizado, normalizar(termino))))
    .flatMap((grupo) => grupo)
    .filter((termino) => !contieneTermino(normalizado, normalizar(termino)));
  return [...new Set([original, ...terminosAdicionales])].join(" ");
}

function contieneTermino(valor, termino) {
  const tokensValor = valor.split(" ").map(reducirTerminoARaiz);
  const tokensTermino = termino.split(" ").map(reducirTerminoARaiz);
  return tokensValor.some((_, indice) =>
    tokensTermino.every((token, desplazamiento) => tokensValor[indice + desplazamiento] === token)
  );
}

function reducirTerminoARaiz(token) {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function normalizar(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { ampliarConsultaJuridica, GRUPOS_TERMINOS_JURIDICOS };
