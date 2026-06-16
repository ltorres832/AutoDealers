/**
 * Actualiza el precio de una suscripción en Stripe al cambiar de membresía.
 */
export async function updateStripeSubscriptionPrice(
  stripeSubscriptionId: string,
  newPriceId: string,
  newMembershipId: string
): Promise<void> {
  if (!stripeSubscriptionId?.trim() || !newPriceId?.trim()) {
    return;
  }

  const { getStripeInstance } = await import('@autodealers/core');
  const stripe = await getStripeInstance();
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId.trim());
  const itemId = stripeSub.items.data[0]?.id;

  if (!itemId) {
    throw new Error('Stripe subscription has no line items');
  }

  await stripe.subscriptions.update(stripeSubscriptionId.trim(), {
    items: [{ id: itemId, price: newPriceId.trim() }],
    proration_behavior: 'create_prorations',
    metadata: {
      ...stripeSub.metadata,
      membershipId: newMembershipId,
    },
  });
}
