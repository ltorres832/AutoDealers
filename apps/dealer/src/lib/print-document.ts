/** Abre HTML en ventana nueva e imprime (con auth vía blob, no depende de cookie en nueva pestaña). */
export function printHtmlDocument(html: string, title = 'Documento') {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    throw new Error('Permite ventanas emergentes para imprimir');
  }
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:14px;}
    h1{font-size:20px;margin:0 0 8px;} h2{font-size:16px;margin:16px 0 8px;}
    table{width:100%;border-collapse:collapse;margin-top:12px;}
    th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;}
    th{background:#f3f4f6;font-size:12px;text-transform:uppercase;letter-spacing:.03em;}
    .meta{color:#4b5563;margin:0 0 12px;} .right{text-align:right;}
    .total{font-weight:bold;font-size:15px;} .muted{color:#6b7280;font-size:12px;margin-top:24px;}
    @media print{body{margin:12px;}}
  </style></head><body>${html}
  <script>window.onload=function(){window.focus();window.print();}</script>
  </body></html>`;
  w.document.write(doc);
  w.document.close();
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
