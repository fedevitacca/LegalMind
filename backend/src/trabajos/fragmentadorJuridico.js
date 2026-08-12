const DEFAULT_CHUNK_SIZE = 1800;
const DEFAULT_OVERLAP = 240;

function fragmentLegalDocument({ text = "", pages = [] }, options = {}) {
  const size = Math.max(500, Number(options.size) || DEFAULT_CHUNK_SIZE);
  const overlap = Math.min(size - 100, Math.max(0, Number(options.overlap) || DEFAULT_OVERLAP));
  const sources = pages.length ? pages.map((page) => ({ page: page.numero || page.number, text: page.texto || page.text || "" })) : [{ page: null, text }];
  const chunks = [];
  let globalOffset = 0;
  for (const source of sources) {
    const clean = normalizeText(source.text);
    let start = 0;
    while (start < clean.length) {
      let end = Math.min(clean.length, start + size);
      if (end < clean.length) end = findLegalBoundary(clean, start, end);
      const chunkText = clean.slice(start, end).trim();
      if (chunkText) chunks.push({ order: chunks.length, page: source.page || null, text: chunkText,
        start: globalOffset + start, end: globalOffset + end,
        metadata: { section: detectSection(chunkText), characters: chunkText.length } });
      if (end >= clean.length) break;
      start = Math.max(start + 1, end - overlap);
    }
    globalOffset += clean.length + 1;
  }
  return chunks;
}

function findLegalBoundary(text, start, candidate) {
  const windowStart = Math.max(start + 400, candidate - 350);
  const window = text.slice(windowStart, candidate);
  const patterns = [/\n(?=(?:ART[IÍ]CULO|ART\.|RESUELVE|CONSIDERANDO|RESULTA|FALLO|POR ELLO)\b)/gi, /\n\n/g, /[.!?]\s+/g];
  for (const pattern of patterns) {
    let match; let last;
    while ((match = pattern.exec(window))) last = match;
    if (last) return windowStart + last.index + last[0].length;
  }
  return candidate;
}

function detectSection(text) {
  const match = text.match(/^(ART[IÍ]CULO\s+\d+|CONSIDERANDO|RESULTA|RESUELVE|FALLO|POR ELLO)/i);
  return match ? match[1].toUpperCase() : null;
}
function normalizeText(text) { return String(text || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
module.exports = { fragmentLegalDocument };
