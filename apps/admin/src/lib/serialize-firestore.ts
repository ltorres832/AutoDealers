import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  coerceMembershipNumber,
  repairMisserializedEpochNumber,
} from '@/lib/membership-number-utils';

export { coerceMembershipNumber, repairMisserializedEpochNumber } from '@/lib/membership-number-utils';

/** Convierte Timestamp, { _seconds }, Date, ISO string o número a Date. */
export function toDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === 'object') {
    const maybeTs = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      try {
        return maybeTs.toDate();
      } catch {
        return undefined;
      }
    }
    const seconds = maybeTs._seconds ?? maybeTs.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    // Solo timestamps Unix (no confundir precios 49, 299, límites 100, etc.)
    if (value >= 1_000_000_000_000) return new Date(value);
    if (value >= 1_000_000_000 && value < 1_000_000_000_000) return new Date(value * 1000);
    return undefined;
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(value.trim())) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }
  return undefined;
}

export function toIso(value: unknown): string | undefined {
  const d = toDate(value);
  return d ? d.toISOString() : undefined;
}

/** Serializa un documento Firestore para respuestas JSON de Next.js. */
export function serializeFirestoreDoc(
  doc: QueryDocumentSnapshot | DocumentSnapshot
): Record<string, unknown> {
  const data = doc.data();
  if (!data) {
    return { id: doc.id };
  }
  return serializeFirestoreData({ id: doc.id, ...data });
}

export function serializeFirestoreData<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = serializeFirestoreValue(value, key);
  }
  return out as T;
}

const MEMBERSHIP_NUMERIC_KEYS = new Set([
  'price',
  'maxSellers',
  'maxInventory',
  'maxCampaigns',
  'maxPromotions',
  'maxLeadsPerMonth',
  'maxAppointmentsPerMonth',
  'maxStorageGB',
  'maxApiCallsPerMonth',
  'maxCorporateEmails',
  'maxDealers',
  'maxCustomerDocumentRequestsPerMonth',
]);

function serializeFirestoreValue(value: unknown, key?: string): unknown {
  if (value == null) return value;
  value = repairMisserializedEpochNumber(value);
  if (key && MEMBERSHIP_NUMERIC_KEYS.has(key) && (typeof value === 'number' || typeof value === 'string')) {
    const n = coerceMembershipNumber(value);
    return n;
  }
  const date = toDate(value);
  if (date) return date.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreValue(item));
  }
  if (typeof value === 'object') {
    const plain: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      plain[k] = serializeFirestoreValue(v, k);
    }
    return plain;
  }
  return value;
}
