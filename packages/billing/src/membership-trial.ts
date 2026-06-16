import type { Subscription, SubscriptionStatus } from './types';

/** Días de prueba gratuita antes del primer cobro mensual */
export const DEFAULT_MEMBERSHIP_TRIAL_DAYS = 14;

/** Días de prueba configurables (env o default 14) */
export function getMembershipTrialDays(): number {
  const raw =
    process.env.STRIPE_TRIAL_DAYS ??
    process.env.MEMBERSHIP_TRIAL_DAYS ??
    String(DEFAULT_MEMBERSHIP_TRIAL_DAYS);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MEMBERSHIP_TRIAL_DAYS;
  return Math.floor(n);
}

/** ¿Aplica trial de Stripe? Solo primera suscripción con cobro (sin sub_ previo). */
export function isEligibleForMembershipTrial(
  subscription?: Pick<Subscription, 'stripeSubscriptionId'> | null
): boolean {
  return !subscription?.stripeSubscriptionId?.trim();
}

export function mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'unpaid':
      return 'unpaid';
    case 'incomplete':
      return 'incomplete';
    case 'incomplete_expired':
      return 'incomplete_expired';
    default:
      return 'suspended';
  }
}

/** Campos de período desde una suscripción Stripe */
export function stripeSubscriptionPeriodFields(sub: {
  status: string;
  current_period_start: number;
  current_period_end: number;
  trial_end?: number | null;
}): {
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  nextPaymentDate?: Date;
} {
  const status = mapStripeSubscriptionStatus(sub.status);
  const currentPeriodStart = new Date(sub.current_period_start * 1000);
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : undefined;
  const nextPaymentDate =
    status === 'trialing' && trialEndsAt
      ? trialEndsAt
      : status === 'active'
        ? currentPeriodEnd
        : undefined;

  return {
    status,
    currentPeriodStart,
    currentPeriodEnd,
    trialEndsAt,
    nextPaymentDate,
  };
}

/** Checkout completado: pago inmediato o trial con tarjeta guardada */
export function isCheckoutSessionBillingComplete(session: {
  status?: string | null;
  mode?: string | null;
  payment_status?: string | null;
}): boolean {
  if (session.status !== 'complete') return false;
  if (session.mode !== 'subscription') return session.payment_status === 'paid';
  return (
    session.payment_status === 'paid' ||
    session.payment_status === 'no_payment_required'
  );
}
