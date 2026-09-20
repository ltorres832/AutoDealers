import * as admin from 'firebase-admin';
import { parseSponsoredContentDate } from './sponsored-content-visibility';

const VALID_DURATIONS = [7, 15, 30] as const;

export function computeSponsoredContentSchedule(
  durationDays: number,
  now: Date = new Date()
): { startDate: Date; endDate: Date } {
  const normalized = VALID_DURATIONS.includes(durationDays as (typeof VALID_DURATIONS)[number])
    ? durationDays
    : 7;
  const startDate = new Date(now.getTime());
  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + normalized);
  return { startDate, endDate };
}

/** Al activar/publicar, renueva fechas si el anuncio expiró o venía de pago pendiente. */
export function buildActivationScheduleFields(
  data: Record<string, unknown>,
  now: Date = new Date()
): { startDate: admin.firestore.Timestamp; endDate: admin.firestore.Timestamp } | null {
  const durationRaw = Number(data.durationDays);
  const durationDays = VALID_DURATIONS.includes(durationRaw as (typeof VALID_DURATIONS)[number])
    ? durationRaw
    : 7;

  const end = parseSponsoredContentDate(data.endDate);
  const status = String(data.status || '');
  const expired = !end || end.getTime() < now.getTime();
  const fromPendingPayment = status === 'payment_pending' || status === 'pending';

  if (!expired && !fromPendingPayment) {
    return null;
  }

  const { startDate, endDate } = computeSponsoredContentSchedule(durationDays, now);
  return {
    startDate: admin.firestore.Timestamp.fromDate(startDate),
    endDate: admin.firestore.Timestamp.fromDate(endDate),
  };
}

export function isSponsoredContentExpired(
  data: { endDate?: unknown; status?: string },
  now: Date = new Date()
): boolean {
  const end = parseSponsoredContentDate(data.endDate);
  if (!end) return false;
  return end.getTime() < now.getTime();
}

export function activationSchedulePatch(
  existingData: Record<string, unknown>
): Partial<{ startDate: admin.firestore.Timestamp; endDate: admin.firestore.Timestamp }> {
  const schedule = buildActivationScheduleFields(existingData);
  return schedule ?? {};
}
