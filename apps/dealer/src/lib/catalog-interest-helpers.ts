/** Resume user-agent para tablas (navegador, SO, tipo de dispositivo). */
export function parseCatalogUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  device: string;
} {
  const raw = (ua || '').trim();
  if (!raw) {
    return { browser: '—', os: '—', device: '—' };
  }
  const lower = raw.toLowerCase();
  let device = 'Escritorio';
  if (/mobile|iphone|android.*mobile/i.test(raw)) device = 'Móvil';
  else if (/ipad|tablet/i.test(raw)) device = 'Tablet';

  let os = 'Desconocido';
  if (/windows nt 10/i.test(lower)) os = 'Windows 10/11';
  else if (/windows/i.test(lower)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(lower)) os = 'macOS';
  else if (/iphone|ipad/i.test(lower)) os = 'iOS';
  else if (/android/i.test(lower)) os = 'Android';
  else if (/linux/i.test(lower)) os = 'Linux';

  let browser = 'Desconocido';
  if (/edg\//i.test(raw)) browser = 'Microsoft Edge';
  else if (/chrome\//i.test(raw) && !/edg\//i.test(raw)) browser = 'Chrome';
  else if (/firefox\//i.test(raw)) browser = 'Firefox';
  else if (/safari\//i.test(raw) && !/chrome\//i.test(raw)) browser = 'Safari';
  else if (/opr\/|opera/i.test(raw)) browser = 'Opera';

  return { browser, os, device };
}

export function catalogReferrerHost(referrer: string | null | undefined): string {
  if (!referrer?.trim()) return '—';
  try {
    const u = new URL(referrer);
    const host = u.hostname.replace(/^www\./, '');
    return host.length <= 40 ? host : `${host.slice(0, 37)}…`;
  } catch {
    const t = referrer.trim();
    return t.length <= 40 ? t : `${t.slice(0, 37)}…`;
  }
}

/** Etiquetas legibles para valores `surface` enviados desde public-web. */
export function catalogSurfaceLabel(surface: string | null | undefined): string {
  if (surface == null || surface === '') return '—';
  const map: Record<string, string> = {
    catalog_home_grid: 'Catálogo principal (cuadrícula)',
    catalog_home_list: 'Catálogo principal (lista)',
    featured_carousel: 'Vehículos destacados',
    promotion: 'Promoción / anuncio',
    banner_vehicle: 'Banner con vehículo',
    tenant_site_modal: 'Sitio del concesionario (modal)',
    vehicle_detail: 'Ficha pública del vehículo',
    seller_inventory: 'Inventario del vendedor (web)',
    dealer_inventory: 'Inventario del dealer (web)',
    category: 'Categoría',
    compare: 'Comparador',
    contact_form: 'Formulario de contacto (ficha)',
    catalog_anonymous: 'Catálogo (sin superficie)',
    unknown: 'No especificado',
  };
  return map[surface] ?? surface;
}

type CsvRow = Record<string, string | number | boolean | null | undefined>;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function catalogInterestSignalsToCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]!);
  const header = keys.map(csvEscape).join(',');
  const lines = rows.map((row) => keys.map((k) => csvEscape(row[k])).join(','));
  return [header, ...lines].join('\r\n');
}

export function downloadCatalogInterestCsv(filename: string, csvBody: string): void {
  const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
