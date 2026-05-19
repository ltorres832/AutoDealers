/** Normaliza horarios desde string u objeto (Firestore legacy). */
export function resolveBusinessHours(...sources: unknown[]): string {
  for (const src of sources) {
    const text = formatBusinessHoursValue(src);
    if (text) return text;
  }
  return '';
}

function formatBusinessHoursValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }
  const o = value as Record<string, unknown>;
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(o)) {
    if (raw == null || raw === '') continue;
    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (typeof raw === 'string') {
      lines.push(`${label}: ${raw.trim()}`);
    } else if (typeof raw === 'object' && raw !== null) {
      const inner = Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => v != null && String(v).trim())
        .map(([k, v]) => `${k}: ${String(v).trim()}`)
        .join(', ');
      if (inner) lines.push(`${label}: ${inner}`);
    } else {
      lines.push(`${label}: ${String(raw)}`);
    }
  }
  return lines.join('\n').trim();
}
