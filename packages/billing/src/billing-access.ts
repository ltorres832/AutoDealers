import { getSubscriptionByTenantId } from './subscription-management';
import type { Subscription, SubscriptionStatus } from './types';

export const DEFAULT_SUBSCRIPTION_GRACE_DAYS = 3;

/** Vendedor creado por un dealer: la suscripción la paga el concesionario. */
export function isDealerManagedSeller(dealerId?: string | null): boolean {
  return Boolean(dealerId?.trim());
}

/**
 * Tenant cuya suscripción determina el acceso a la plataforma.
 * Vendedores con `dealerId` heredan la facturación del concesionario.
 */
export function resolveBillingTenantId(
  tenantId?: string | null,
  dealerId?: string | null
): string | undefined {
  if (isDealerManagedSeller(dealerId)) return dealerId!.trim();
  return tenantId?.trim() || undefined;
}

export function getSubscriptionGraceDays(): number {
  const raw = process.env.SUBSCRIPTION_GRACE_DAYS;
  const n = raw ? Number(raw) : DEFAULT_SUBSCRIPTION_GRACE_DAYS;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_SUBSCRIPTION_GRACE_DAYS;
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
    return daysPastDue < getSubscriptionGraceDays();
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
}): Promise<{
  allowed: boolean;
  reason?: string;
  subscription?: Subscription;
  billingTenantId?: string;
  dealerManaged: boolean;
}> {
  const billingTenantId = resolveBillingTenantId(auth.tenantId, auth.dealerId);
  const dealerManaged = isDealerManagedSeller(auth.dealerId);

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
