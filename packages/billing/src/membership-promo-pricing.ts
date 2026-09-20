/**
 * Precio de lanzamiento (catálogo por fecha) + intro por N meses → precio regular.
 * Fuente única para admin, catálogo público y checkout/subscribe.
 */

export type MembershipPromoFields = {
  price?: unknown;
  currency?: unknown;
  billingCycle?: unknown;
  stripePriceId?: unknown;
  launchPrice?: unknown;
  launchEndsAt?: unknown;
  launchStripePriceId?: unknown;
  introPrice?: unknown;
  introMonths?: unknown;
  introStripePriceId?: unknown;
};

export type EffectiveMembershipPricing = {
  displayPrice: number;
  regularPrice: number;
  launchPrice: number | null;
  launchActive: boolean;
  launchEndsAt: Date | null;
  introConfigured: boolean;
  introPrice: number | null;
  introMonths: number;
  badge: string | null;
  checkoutStripePriceId: string;
  schedule: null | {
    introStripePriceId: string;
    regularStripePriceId: string;
    introMonths: number;
  };
};

function toMoney(value: unknown): number {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^1970-01-01T00:00:00\.\d{3}Z$/.test(trimmed)) {
      const ms = new Date(trimmed).getTime();
      if (Number.isFinite(ms) && ms < 86_400_000) return ms;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isLaunchPricingActive(
  membership: Pick<MembershipPromoFields, 'launchPrice' | 'launchEndsAt'>,
  now: Date = new Date()
): boolean {
  const launchPrice = toMoney(membership.launchPrice);
  if (!(launchPrice > 0)) return false;
  const ends = parseDate(membership.launchEndsAt);
  if (!ends) return false;
  return now.getTime() < ends.getTime();
}

export function getIntroMonths(membership: Pick<MembershipPromoFields, 'introMonths'>): number {
  const n = Math.floor(Number(membership.introMonths) || 0);
  return n >= 1 && n <= 36 ? n : 0;
}

export function hasIntroPricing(
  membership: Pick<
    MembershipPromoFields,
    'introPrice' | 'introMonths' | 'introStripePriceId' | 'stripePriceId'
  >
): boolean {
  const months = getIntroMonths(membership);
  const introPrice = toMoney(membership.introPrice);
  const introId = String(membership.introStripePriceId || '').trim();
  const regularId = String(membership.stripePriceId || '').trim();
  return months >= 1 && introPrice > 0 && !!introId && !!regularId && introId !== regularId;
}

/**
 * Prioridad de cobro: intro schedule > launch price > regular.
 */
export function resolveMembershipPricing(
  membership: MembershipPromoFields,
  now: Date = new Date()
): EffectiveMembershipPricing {
  const regularPrice = toMoney(membership.price);
  const regularStripePriceId = String(membership.stripePriceId || '').trim();
  const launchPriceRaw = toMoney(membership.launchPrice);
  const launchEndsAt = parseDate(membership.launchEndsAt);
  const launchActive = isLaunchPricingActive(membership, now);
  const launchStripePriceId = String(membership.launchStripePriceId || '').trim();

  const introMonths = getIntroMonths(membership);
  const introPriceRaw = toMoney(membership.introPrice);
  const introStripePriceId = String(membership.introStripePriceId || '').trim();
  const introConfigured = hasIntroPricing(membership);

  let displayPrice = regularPrice;
  let badge: string | null = null;
  let checkoutStripePriceId = regularStripePriceId;
  let schedule: EffectiveMembershipPricing['schedule'] = null;

  if (introConfigured) {
    displayPrice = introPriceRaw;
    badge =
      introMonths === 1
        ? `Primer mes $${introPriceRaw.toFixed(2)}, luego $${regularPrice.toFixed(2)}`
        : `Primeros ${introMonths} meses $${introPriceRaw.toFixed(2)}, luego $${regularPrice.toFixed(2)}`;
    checkoutStripePriceId = introStripePriceId;
    schedule = {
      introStripePriceId,
      regularStripePriceId,
      introMonths,
    };
  } else if (launchActive && launchStripePriceId) {
    displayPrice = launchPriceRaw;
    badge = launchEndsAt
      ? `Precio de lanzamiento hasta ${launchEndsAt.toLocaleDateString('es-PR')}`
      : 'Precio de lanzamiento';
    checkoutStripePriceId = launchStripePriceId;
  } else if (launchActive && !launchStripePriceId) {
    displayPrice = launchPriceRaw;
    badge = 'Precio de lanzamiento (sincroniza Stripe en admin)';
    checkoutStripePriceId = regularStripePriceId;
  }

  return {
    displayPrice,
    regularPrice,
    launchPrice: launchPriceRaw > 0 ? launchPriceRaw : null,
    launchActive,
    launchEndsAt,
    introConfigured,
    introPrice: introPriceRaw > 0 ? introPriceRaw : null,
    introMonths,
    badge,
    checkoutStripePriceId,
    schedule,
  };
}

export function serializeMembershipPromoForApi(
  membership: MembershipPromoFields & { id?: string },
  now: Date = new Date()
): Record<string, unknown> {
  const pricing = resolveMembershipPricing(membership, now);
  return {
    launchPrice: pricing.launchPrice,
    launchEndsAt: pricing.launchEndsAt ? pricing.launchEndsAt.toISOString() : null,
    launchStripePriceId: String(membership.launchStripePriceId || '') || null,
    launchActive: pricing.launchActive,
    introPrice: pricing.introPrice,
    introMonths: pricing.introMonths || null,
    introStripePriceId: String(membership.introStripePriceId || '') || null,
    introConfigured: pricing.introConfigured,
    displayPrice: pricing.displayPrice,
    regularPrice: pricing.regularPrice,
    pricingBadge: pricing.badge,
  };
}
