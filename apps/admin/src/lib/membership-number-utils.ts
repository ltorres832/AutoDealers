/**
 * Utilidades para precios/límites de membresía (seguras en cliente y servidor).
 */

/** Repara números serializados como epoch (299 → "1970-01-01T00:00:00.299Z"). */
export function repairMisserializedEpochNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!/^1970-01-01T00:00:00\.\d{3}Z$/.test(trimmed)) return value;
  const ms = new Date(trimmed).getTime();
  if (!Number.isFinite(ms) || ms >= 86_400_000) return value;
  return ms;
}

export function coerceMembershipNumber(value: unknown): number {
  const repaired = repairMisserializedEpochNumber(value);
  const n = Number(repaired);
  return Number.isFinite(n) ? n : 0;
}
