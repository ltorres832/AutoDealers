// Gestión de suscripciones

import { Subscription, SubscriptionStatus } from './types';
import { StripeService } from './stripe';
import * as admin from 'firebase-admin';

export class SubscriptionService {
  private stripeService: StripeService;

  constructor(stripeService: StripeService) {
    this.stripeService = stripeService;
  }

  /**
   * Crea una nueva suscripción
   */
  async createSubscription(
    tenantId: string,
    userId: string,
    membershipId: string,
    customerEmail: string,
    customerName: string,
    priceId: string
  ): Promise<Subscription> {
    // Crear cliente en Stripe
    const customer = await this.stripeService.createCustomer(
      customerEmail,
      customerName,
      {
        tenantId,
        userId,
        membershipId,
      }
    );

    // Obtener o crear tax rate del 11.5%
    const taxRateId = await this.stripeService.getOrCreateTaxRate();

    // Crear suscripción con tax
    const stripeSubscription = await this.stripeService.createSubscription(
      customer.id,
      priceId,
      {
        tenantId,
        userId,
        membershipId,
      },
      taxRateId
    );

    // Guardar en Firestore
    const { getFirestore } = await import('@autodealers/shared');
    const db = getFirestore();
    const docRef = db.collection('subscriptions').doc();

    const subscription: Subscription = {
      id: docRef.id,
      tenantId,
      userId,
      membershipId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customer.id,
      status: this.mapStripeStatus(stripeSubscription.status),
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Guardar en Firestore
    await docRef.set({
      ...subscription,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(subscription.currentPeriodStart),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(subscription.currentPeriodEnd),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    return subscription;
  }

  /**
   * Actualiza el estado de una suscripción desde webhook
   */
  async updateSubscriptionFromWebhook(
    stripeSubscriptionId: string,
    status: string,
    currentPeriodStart: number,
    currentPeriodEnd: number,
    cancelAtPeriodEnd?: boolean
  ): Promise<void> {
    const { getFirestore } = await import('@autodealers/shared');
    const db = getFirestore();
    const snapshot = await db
      .collection('subscriptions')
      .where('stripeSubscriptionId', '==', stripeSubscriptionId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error(`Subscription not found for Stripe id ${stripeSubscriptionId}`);
    }

    await snapshot.docs[0].ref.update({
      status: this.mapStripeStatus(status),
      currentPeriodStart: admin.firestore.Timestamp.fromDate(
        new Date(currentPeriodStart * 1000)
      ),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(
        new Date(currentPeriodEnd * 1000)
      ),
      cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  private async getFirestoreSubscriptionDoc(subscriptionId: string) {
    const { getFirestore } = await import('@autodealers/shared');
    const db = getFirestore();
    const doc = await db.collection('subscriptions').doc(subscriptionId).get();
    if (!doc.exists) {
      throw new Error('Subscription not found');
    }
    return { ref: doc.ref, data: doc.data() as { stripeSubscriptionId?: string } };
  }

  /**
   * Actualiza campos permitidos en Firestore (no sustituye el webhook de Stripe).
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const { ref } = await this.getFirestoreSubscriptionDoc(subscriptionId);
    const allowed = ['membershipId', 'status', 'cancelAtPeriodEnd'] as const;
    const safe: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    for (const key of allowed) {
      if (key in updates) {
        safe[key] = updates[key];
      }
    }
    await ref.update(safe);
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<void> {
    const { ref, data } = await this.getFirestoreSubscriptionDoc(subscriptionId);
    const stripeSubscriptionId = data.stripeSubscriptionId?.trim();
    if (!stripeSubscriptionId) {
      throw new Error('La suscripción no tiene stripeSubscriptionId vinculado');
    }

    await this.stripeService.cancelSubscription(
      stripeSubscriptionId,
      cancelAtPeriodEnd
    );

    await ref.update({
      cancelAtPeriodEnd,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(cancelAtPeriodEnd ? {} : { status: 'cancelled' }),
    });
  }

  /**
   * Reactiva una suscripción cancelada al final del período
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    const { ref, data } = await this.getFirestoreSubscriptionDoc(subscriptionId);
    const stripeSubscriptionId = data.stripeSubscriptionId?.trim();
    if (!stripeSubscriptionId) {
      throw new Error('La suscripción no tiene stripeSubscriptionId vinculado');
    }

    await this.stripeService.reactivateSubscription(stripeSubscriptionId);

    await ref.update({
      cancelAtPeriodEnd: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Cambia plan en Stripe y Firestore
   */
  async changeMembership(
    subscriptionId: string,
    newMembershipId: string,
    newPriceId: string
  ): Promise<void> {
    const { data } = await this.getFirestoreSubscriptionDoc(subscriptionId);
    const stripeSubscriptionId = data.stripeSubscriptionId?.trim();

    if (stripeSubscriptionId) {
      const { updateStripeSubscriptionPrice } = await import('./stripe-membership-sync');
      await updateStripeSubscriptionPrice(
        stripeSubscriptionId,
        newPriceId,
        newMembershipId
      );
    }

    const { changeMembership: changeMembershipInFirestore } = await import(
      './subscription-management'
    );
    await changeMembershipInFirestore(subscriptionId, newMembershipId, newPriceId);
  }

  /**
   * Mapea el estado de Stripe al estado interno
   */
  private mapStripeStatus(
    stripeStatus: string
  ): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'cancelled';
      default:
        return 'suspended';
    }
  }

  /**
   * Verifica si una suscripción está activa
   */
  isSubscriptionActive(subscription: Subscription): boolean {
    return (
      subscription.status === 'active' &&
      new Date() <= subscription.currentPeriodEnd
    );
  }

  /**
   * Obtiene días restantes de suscripción
   */
  getDaysRemaining(subscription: Subscription): number {
    const now = new Date();
    const end = subscription.currentPeriodEnd;
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}




