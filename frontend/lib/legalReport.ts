export function downloadPlainTextReport(title: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(title)}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printPlainTextReport(title: string, content: string) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) throw new Error("El navegador bloqueó la ventana de impresión.");
  reportWindow.opener = null;
  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4;margin:22mm 18mm}*{box-sizing:border-box}body{margin:0;color:#172238;font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.55}header{border-bottom:1px solid #9aa3a0;margin-bottom:20px;padding-bottom:12px}header strong{font-family:Arial,sans-serif;font-size:18pt;letter-spacing:.02em}header span{display:block;color:#5d6765;font-family:Arial,sans-serif;font-size:9pt;margin-top:4px}pre{font:inherit;white-space:pre-wrap;word-break:break-word;margin:0}footer{border-top:1px solid #c8cecb;color:#697270;font-family:Arial,sans-serif;font-size:8pt;margin-top:28px;padding-top:10px}@media print{button{display:none}}button{background:#285f5b;border:0;color:white;cursor:pointer;font:600 10pt Arial,sans-serif;margin-bottom:20px;padding:10px 16px}
  </style></head><body><button onclick="window.print()">Imprimir o guardar como PDF</button><header><strong>LegalMind</strong><span>Informe jurídico de trabajo</span></header><pre>${escapeHtml(content)}</pre><footer>Documento sujeto a revisión profesional. La versión oficial es la documentación incorporada al expediente.</footer></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
}

export function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "informe-juridico";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
