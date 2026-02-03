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
    const { getFirestore } = await import('@autodealers/core');
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
    // TODO: Actualizar en Firestore
    throw new Error('Not implemented');
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<void> {
    // Obtener subscriptionId de Stripe desde Firestore
    // TODO: Implementar
    const stripeSubscriptionId = '';

    await this.stripeService.cancelSubscription(
      stripeSubscriptionId,
      cancelAtPeriodEnd
    );

    // Actualizar en Firestore
    // TODO: Implementar
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




