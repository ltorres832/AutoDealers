/**
 * Crear / actualizar Prices de Stripe para membresías (regular, launch, intro).
 */

export type MembershipBillingCycle = 'monthly' | 'yearly';

export async function createMembershipStripePrice(params: {
  stripe: {
    products: { create: (data: Record<string, unknown>) => Promise<{ id: string }> };
    prices: { create: (data: Record<string, unknown>) => Promise<{ id: string }> };
  };
  name: string;
  type: 'dealer' | 'seller' | 'business';
  price: number;
  currency: string;
  billingCycle: MembershipBillingCycle;
  membershipId?: string;
  kind: 'regular' | 'launch' | 'intro';
  existingProductId?: string;
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const amount = Math.round(Number(params.price) * 100);
  if (!(amount > 0)) {
    throw new Error('El precio debe ser mayor a 0 para crear Price en Stripe');
  }

  let stripeProductId = String(params.existingProductId || '').trim();
  if (!stripeProductId) {
    const product = await params.stripe.products.create({
      name: `${params.name} (${params.kind}) - ${
        params.type === 'dealer' ? 'Dealer' : params.type === 'business' ? 'Negocio automotriz' : 'Vendedor'
      }`,
      description:
        params.type === 'business'
          ? `Membresía mensual para talleres, gomeras y servicios automotrices · ${params.name}`
          : `Plan ${params.name} · ${params.kind}`,
      metadata: {
        managedBy: 'autodealers',
        type: params.type,
        priceKind: params.kind,
        ...(params.membershipId ? { membershipId: params.membershipId } : {}),
      },
    });
    stripeProductId = product.id;
  }

  const stripePrice = await params.stripe.prices.create({
    product: stripeProductId,
    unit_amount: amount,
    currency: String(params.currency || 'USD').toLowerCase(),
    recurring: {
      interval: params.billingCycle === 'yearly' ? 'year' : 'month',
    },
    metadata: {
      managedBy: 'autodealers',
      type: params.type,
      priceKind: params.kind,
      ...(params.membershipId ? { membershipId: params.membershipId } : {}),
    },
  });

  return { stripeProductId, stripePriceId: stripePrice.id };
}

type SchedulePhase = {
  start_date?: number;
  end_date?: number | null;
  items?: Array<{ price: string | { id?: string }; quantity?: number }>;
};

/**
 * Tras crear una suscripción (checkout o API), convierte a schedule intro → regular.
 * Idempotente: si ya hay schedule o faltan datos, no falla el flujo principal.
 */
export async function ensureIntroToRegularSchedule(params: {
  stripe: {
    subscriptionSchedules: {
      create: (data: Record<string, unknown>) => Promise<{
        id: string;
        phases?: SchedulePhase[];
      }>;
      update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    };
    subscriptions: {
      retrieve: (id: string) => Promise<{
        id: string;
        schedule?: string | { id?: string } | null;
        items: { data: Array<{ id: string; price: { id: string } }> };
        current_period_end?: number;
        trial_end?: number | null;
        status?: string;
      }>;
    };
  };
  subscriptionId: string;
  introStripePriceId: string;
  regularStripePriceId: string;
  introMonths: number;
}): Promise<{ scheduleId: string | null; skipped?: string }> {
  const months = Math.floor(params.introMonths);
  if (months < 1) return { scheduleId: null, skipped: 'no_intro_months' };
  if (!params.introStripePriceId || !params.regularStripePriceId) {
    return { scheduleId: null, skipped: 'missing_price_ids' };
  }
  if (params.introStripePriceId === params.regularStripePriceId) {
    return { scheduleId: null, skipped: 'same_price' };
  }

  const sub = await params.stripe.subscriptions.retrieve(params.subscriptionId);
  const existingSchedule =
    typeof sub.schedule === 'string'
      ? sub.schedule
      : sub.schedule && typeof sub.schedule === 'object'
        ? sub.schedule.id || null
        : null;
  if (existingSchedule) {
    return { scheduleId: existingSchedule, skipped: 'already_scheduled' };
  }

  const item = sub.items.data[0];
  if (!item?.id) return { scheduleId: null, skipped: 'no_items' };

  const schedule = await params.stripe.subscriptionSchedules.create({
    from_subscription: params.subscriptionId,
  });

  const phase0 = schedule.phases?.[0];
  const startDate =
    typeof phase0?.start_date === 'number' ? phase0.start_date : Math.floor(Date.now() / 1000);

  await params.stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        items: [{ price: params.introStripePriceId, quantity: 1 }],
        start_date: startDate,
        iterations: months,
      },
      {
        items: [{ price: params.regularStripePriceId, quantity: 1 }],
      },
    ],
  });

  return { scheduleId: schedule.id };
}
