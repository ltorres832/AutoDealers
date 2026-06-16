/** Utilidades compartidas para guardar perfil / configuración pública. */

export function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function sanitizeSocialMedia(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

/** Convierte horarios legacy (objeto Firestore) a texto para formularios. */
export function normalizeBusinessHoursForForm(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const o = value as Record<string, unknown>;
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(o)) {
    if (raw == null || raw === '') continue;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (typeof raw === 'string') {
      lines.push(`${label}: ${raw.trim()}`);
    } else {
      lines.push(`${label}: ${String(raw)}`);
    }
  }
  return lines.join('\n').trim();
}

export function businessHoursForStorage(value: unknown): string {
  return normalizeBusinessHoursForForm(value);
}
