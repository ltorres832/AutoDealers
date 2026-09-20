import type { DocumentPayload } from './types';

/** Resuelve `vehicle.vin` / `buyer.name` etc. desde el payload. */
export function resolveBinding(binding: string | undefined, payload: DocumentPayload): string {
  if (!binding) return '';
  const parts = binding.split('.');
  let cur: unknown = payload;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[p];
  }
  if (cur == null) return '';
  return String(cur);
}

export function str(v: unknown, fallback = '—'): string {
  if (v == null || v === '') return fallback;
  return String(v);
}

export function money(v: unknown, currency = 'USD'): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-US', { style: 'currency', currency }).format(n);
}
