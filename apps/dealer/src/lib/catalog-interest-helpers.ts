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
