import { getSubscriptionByTenantId } from './subscription-management';
import type { Subscription, SubscriptionStatus } from './types';

/** Período de gracia: 1 día calendario (~24 h) antes de suspender por falta de pago. */
export const DEFAULT_SUBSCRIPTION_GRACE_DAYS = 1;

/** Vendedor creado por un dealer: la suscripción la paga el concesionario. */
export function isDealerManagedSeller(
  dealerId?: string | null,
  billingMode?: string | null
): boolean {
  if (billingMode === 'self_service') return false;
  if (billingMode === 'dealer_managed') return true;
  return Boolean(dealerId?.trim());
}

/**
 * Tenant cuya suscripción determina el acceso a la plataforma.
 * Vendedores con `dealerId` heredan la facturación del concesionario.
 */
export function resolveBillingTenantId(
  tenantId?: string | null,
  dealerId?: string | null,
  billingMode?: string | null
): string | undefined {
  if (isDealerManagedSeller(dealerId, billingMode)) return dealerId!.trim();
  return tenantId?.trim() || undefined;
}

export function getSubscriptionGraceDays(): number {
  const raw = process.env.SUBSCRIPTION_GRACE_DAYS;
  const n = raw ? Number(raw) : DEFAULT_SUBSCRIPTION_GRACE_DAYS;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_SUBSCRIPTION_GRACE_DAYS;
}

function daysSince(date: Date, now = new Date()): number {
  const diff = now.getTime() - date.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Días sin pago efectivos (máximo entre contador guardado y vencimiento del período). */
export function computeEffectiveDaysPastDue(
  sub: { daysPastDue?: number; currentPeriodEnd?: Date | null },
  now = new Date()
): number {
  const stored = sub.daysPastDue ?? 0;
  const fromPeriodEnd =
    sub.currentPeriodEnd instanceof Date ? daysSince(sub.currentPeriodEnd, now) : 0;
  return Math.max(stored, fromPeriodEnd);
}

/** True cuando ya se agotó el período de gracia y corresponde suspender. */
export function shouldSuspendAfterGrace(
  sub: { daysPastDue?: number; currentPeriodEnd?: Date | null; status?: string },
  now = new Date()
): boolean {
  if (sub.status === 'unpaid') return true;
  if (sub.status === 'suspended') return false;
  const days = computeEffectiveDaysPastDue(sub, now);
  return days >= getSubscriptionGraceDays();
}

/** Estados que siempre bloquean el acceso a la plataforma. */
export function isHardBlockedSubscriptionStatus(status: SubscriptionStatus): boolean {
  return (
    status === 'suspended' ||
    status === 'unpaid' ||
    status === 'cancelled' ||
    status === 'incomplete_expired'
  );
}

/**
 * Indica si el tenant puede usar la plataforma según su suscripción.
 * `past_due` permite acceso solo durante el período de gracia.
 */
export function isSubscriptionAccessAllowed(
  status: SubscriptionStatus,
  daysPastDue = 0
): boolean {
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'past_due') {
    return daysPastDue < getSubscriptionGraceDays(); // 0 = dentro de las ~24 h de gracia
  }
  return false;
}

export async function assertTenantHasActiveBilling(tenantId: string): Promise<{
  allowed: boolean;
  reason?: string;
  subscription?: Subscription;
}> {
  const billingTenantId = tenantId?.trim();
  if (!billingTenantId) {
    return {
      allowed: false,
      reason: 'No tienes una suscripción activa. Configura tu membresía en Ajustes.',
    };
  }

  const subscription = await getSubscriptionByTenantId(billingTenantId);
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No tienes una suscripción activa. Configura tu membresía en Ajustes.',
    };
  }

  const daysPastDue = subscription.daysPastDue ?? 0;
  if (isSubscriptionAccessAllowed(subscription.status, daysPastDue)) {
    return { allowed: true, subscription };
  }

  if (subscription.status === 'past_due') {
    return {
      allowed: false,
      subscription,
      reason:
        'Tu cuenta tiene un pago pendiente. Actualiza tu método de pago para evitar la suspensión.',
    };
  }

  if (isHardBlockedSubscriptionStatus(subscription.status)) {
    return {
      allowed: false,
      subscription,
      reason:
        'Tu cuenta está suspendida por falta de pago. Realiza el pago en Ajustes → Membresía para reactivarla.',
    };
  }

  return {
    allowed: false,
    subscription,
    reason: 'Tu suscripción no está activa. Contacta a soporte o renueva tu plan.',
  };
}

/** Billing para auth de seller: usa tenant del dealer si aplica. */
export async function assertSellerAuthHasActiveBilling(auth: {
  tenantId?: string;
  dealerId?: string;
  billingMode?: string;
}): Promise<{
  allowed: boolean;
  reason?: string;
  subscription?: Subscription;
  billingTenantId?: string;
  dealerManaged: boolean;
}> {
  const billingTenantId = resolveBillingTenantId(auth.tenantId, auth.dealerId, auth.billingMode);
  const dealerManaged = isDealerManagedSeller(auth.dealerId, auth.billingMode);

  if (!billingTenantId) {
    return {
      allowed: false,
      dealerManaged,
      reason: dealerManaged
        ? 'Tu concesionario no tiene una suscripción activa. Contacta al administrador del dealer.'
        : 'No tienes una suscripción activa. Configura tu membresía en Ajustes.',
    };
  }

  const result = await assertTenantHasActiveBilling(billingTenantId);
  if (!result.allowed && dealerManaged) {
    return {
      ...result,
      billingTenantId,
      dealerManaged,
      reason:
        'El acceso depende de la membresía de tu concesionario, que no está activa. Contacta a tu dealer.',
    };
  }

  return { ...result, billingTenantId, dealerManaged };
}
