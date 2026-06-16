import { toDate, toIso } from '@/lib/serialize-firestore';

/** Normaliza fechas de suscripción y rellena pagos desde el período si faltan. */
export function enrichPaymentDates(sub: Record<string, unknown>) {
  const periodStart = toDate(sub.currentPeriodStart);
  const periodEnd = toDate(sub.currentPeriodEnd);
  const lastPayment = toDate(sub.lastPaymentDate) ?? periodStart;
  const nextPayment = toDate(sub.nextPaymentDate) ?? periodEnd;

  return {
    ...sub,
    currentPeriodStart: toIso(periodStart),
    currentPeriodEnd: toIso(periodEnd),
    lastPaymentDate: toIso(lastPayment),
    nextPaymentDate: toIso(nextPayment),
    suspendedAt: toIso(sub.suspendedAt),
    reactivatedAt: toIso(sub.reactivatedAt),
    cancelledAt: toIso(sub.cancelledAt),
    createdAt: toIso(sub.createdAt),
    updatedAt: toIso(sub.updatedAt),
  };
}
