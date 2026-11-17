const DEFAULT_CHUNK_SIZE = 1800;
const DEFAULT_OVERLAP = 240;

function fragmentarDocumentoJuridico({ text: texto = "", pages: paginas = [] }, opciones = {}) {
  const tamanio = Math.max(500, Number(opciones.size) || DEFAULT_CHUNK_SIZE);
  const calcularCoincidencia = Math.min(tamanio - 100, Math.max(0, Number(opciones.overlap) || DEFAULT_OVERLAP));
  const fuentes = paginas.length ? paginas.map((pagina) => ({ page: pagina.numero || pagina.number, text: pagina.texto || pagina.text || "" })) : [{ page: null, text: texto }];
  const fragmentos = [];
  let globalOffset = 0;
  for (const fuente of fuentes) {
    const limpio = normalizarTexto(fuente.text);
    let inicio = 0;
    while (inicio < limpio.length) {
      let fin = Math.min(limpio.length, inicio + tamanio);
      if (fin < limpio.length) fin = buscarLimiteDelFragmento(limpio, inicio, fin);
      const chunkText = limpio.slice(inicio, fin).trim();
      if (chunkText) fragmentos.push({ order: fragmentos.length, page: fuente.page || null, text: chunkText,
        start: globalOffset + inicio, end: globalOffset + fin,
        metadata: { section: detectarSeccion(chunkText), characters: chunkText.length } });
      if (fin >= limpio.length) break;
      inicio = Math.max(inicio + 1, fin - calcularCoincidencia);
    }
    globalOffset += limpio.length + 1;
  }
  return fragmentos;
}

function buscarLimiteDelFragmento(texto, inicio, candidato) {
  const windowStart = Math.max(inicio + 400, candidato - 350);
  const window = texto.slice(windowStart, candidato);
  const patrones = [/\n(?=(?:ART[IÍ]CULO|ART\.|RESUELVE|CONSIDERANDO|RESULTA|FALLO|POR ELLO)\b)/gi, /\n\n/g, /[.!?]\s+/g];
  for (const pattern of patrones) {
    let coincidencia; let last;
    while ((coincidencia = pattern.exec(window))) last = coincidencia;
    if (last) return windowStart + last.index + last[0].length;
  }
  return candidato;
}

function detectarSeccion(texto) {
  const coincidencia = texto.match(/^(ART[IÍ]CULO\s+\d+|CONSIDERANDO|RESULTA|RESUELVE|FALLO|POR ELLO)/i);
  return coincidencia ? coincidencia[1].toUpperCase() : null;
}
function normalizarTexto(texto) { return String(texto || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
module.exports = { fragmentarDocumentoJuridico };
