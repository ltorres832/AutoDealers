import { getTenantById, trySendBillingCommunicationAllChannels } from '@autodealers/core';
import {
  getAllSubscriptions,
  getSubscriptionById,
  suspendAccountForNonPayment,
  updateSubscriptionStatus,
} from './subscription-management';
import { getSubscriptionGraceDays } from './billing-access';
import type { Subscription, SubscriptionStatus } from './types';

export type ProcessOverdueResult = {
  processed: number;
  markedPastDue: number;
  suspended: number;
  skipped: number;
  errors: string[];
};

function daysSince(date: Date, now = new Date()): number {
  const diff = now.getTime() - date.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function effectiveDaysPastDue(sub: Subscription, now = new Date()): number {
  const stored = sub.daysPastDue ?? 0;
  const fromPeriodEnd = sub.currentPeriodEnd ? daysSince(sub.currentPeriodEnd, now) : 0;
  return Math.max(stored, fromPeriodEnd);
}

function shouldSuspendNow(sub: Subscription, now = new Date()): boolean {
  const grace = getSubscriptionGraceDays();
  const days = effectiveDaysPastDue(sub, now);

  if (sub.status === 'unpaid') return true;
  if (sub.status === 'suspended') return false;
  if (sub.status === 'past_due') return days >= grace;
  if (sub.status === 'active' && sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
    return days >= grace;
  }
  return false;
}

/**
 * Procesa suscripciones vencidas: marca past_due y suspende cuentas tras el período de gracia.
 * Debe ejecutarse al menos una vez al día (cron).
 */
export async function processOverdueSubscriptions(
  now = new Date()
): Promise<ProcessOverdueResult> {
  const result: ProcessOverdueResult = {
    processed: 0,
    markedPastDue: 0,
    suspended: 0,
    skipped: 0,
    errors: [],
  };

  const subscriptions = await getAllSubscriptions();

  for (const sub of subscriptions) {
    result.processed++;

    try {
      if (sub.status === 'cancelled' || sub.status === 'trialing') {
        result.skipped++;
        continue;
      }

      const periodEnded =
        sub.currentPeriodEnd instanceof Date && sub.currentPeriodEnd.getTime() < now.getTime();

      // Período vencido sin renovación → past_due
      if (sub.status === 'active' && periodEnded) {
        const days = effectiveDaysPastDue(sub, now);
        await updateSubscriptionStatus(sub.id, 'past_due', {
          daysPastDue: days,
          statusReason: 'Período de facturación vencido sin pago',
        });
        result.markedPastDue++;
        await trySendBillingCommunicationAllChannels('payment_failed', sub.id, {
          daysPastDue: days,
          days,
        });
        if (days === 3) {
          await trySendBillingCommunicationAllChannels('payment_reminder_3days', sub.id, {
            daysPastDue: days,
            days,
          });
        } else if (days === 5) {
          await trySendBillingCommunicationAllChannels('payment_reminder_5days', sub.id, {
            daysPastDue: days,
            days,
          });
        }
        const refreshed = await getSubscriptionById(sub.id);
        if (refreshed && shouldSuspendNow(refreshed, now)) {
          await suspendAccountForNonPayment(
            sub.id,
            'Suspensión automática: período vencido sin pago'
          );
          await trySendBillingCommunicationAllChannels('account_suspended', sub.id, {
            daysPastDue: days,
            days,
          });
          result.suspended++;
        }
        continue;
      }

      if (sub.status === 'past_due' || sub.status === 'unpaid') {
        const days = effectiveDaysPastDue(sub, now);
        if (days !== (sub.daysPastDue ?? 0)) {
          await updateSubscriptionStatus(sub.id, sub.status as SubscriptionStatus, {
            daysPastDue: days,
          });
        }

        if (shouldSuspendNow(sub, now)) {
          await suspendAccountForNonPayment(
            sub.id,
            `Suspensión automática: ${days} día(s) sin pago (gracia: ${getSubscriptionGraceDays()})`
          );
          await trySendBillingCommunicationAllChannels('account_suspended', sub.id, {
            daysPastDue: days,
            days,
          });
          result.suspended++;
        } else if (days === 3) {
          await trySendBillingCommunicationAllChannels('payment_reminder_3days', sub.id, {
            daysPastDue: days,
            days,
          });
        } else if (days === 5) {
          await trySendBillingCommunicationAllChannels('payment_reminder_5days', sub.id, {
            daysPastDue: days,
            days,
          });
        }
        continue;
      }

      if (sub.status === 'suspended') {
        const tenant = await getTenantById(sub.tenantId);
        if (tenant?.status === 'active') {
          await suspendAccountForNonPayment(sub.id, 'Re-sincronización de suspensión');
          result.suspended++;
        } else {
          result.skipped++;
        }
        continue;
      }

      result.skipped++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${sub.id}: ${message}`);
    }
  }

  return result;
}
