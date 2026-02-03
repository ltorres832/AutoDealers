// Integración con Stripe

import Stripe from 'stripe';
import { Membership } from './types';

export class StripeService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Crea un cliente en Stripe
   */
  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email,
      name,
      metadata,
    });
  }

  /**
   * Crea una suscripción con soporte para tarjetas y ACH
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>,
    taxRateId?: string
  ): Promise<Stripe.Subscription> {
    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card', 'us_bank_account'], // Tarjetas y ACH
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };

    // Agregar tax si se proporciona
    if (taxRateId) {
      subscriptionData.default_tax_rates = [taxRateId];
    }

    return await this.stripe.subscriptions.create(subscriptionData);
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  }

  /**
   * Reactiva una suscripción cancelada
   */
  async reactivateSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Obtiene los métodos de pago de un cliente
   */
  async getPaymentMethods(
    customerId: string
  ): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  }

  /**
   * Procesa un webhook de Stripe
   */
  async processWebhook(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  }

  /**
   * Crea un portal de cliente para gestión de suscripción
   */
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Crea un Payment Intent para pagos únicos
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    description?: string,
    metadata?: Record<string, string>,
    customerId?: string,
    paymentMethodId?: string
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency,
      customer: customerId,
      description,
      metadata,
    };

    // Si se proporciona un método de pago guardado, usarlo directamente
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirmation_method = 'automatic';
      paymentIntentParams.confirm = true;
      // Si requiere autenticación adicional (3D Secure), necesitaremos el return_url
      paymentIntentParams.return_url = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SELLER_URL || 'http://localhost:3001'}/payment/success`;
    } else {
      // Si no hay método guardado, usar automatic_payment_methods
      paymentIntentParams.automatic_payment_methods = {
        enabled: true,
      };
    }

    return await this.stripe.paymentIntents.create(paymentIntentParams);
  }

  /**
   * Crea una sesión de Checkout para pagos únicos con soporte para tarjetas y ACH
   * Incluye automáticamente el tax del 11.5% si no se proporciona taxRateId
   */
  async createCheckoutSession(
    amount: number,
    currency: string = 'usd',
    customerEmail?: string,
    customerId?: string,
    metadata?: Record<string, string>,
    successUrl?: string,
    cancelUrl?: string,
    taxRateId?: string
  ): Promise<Stripe.Checkout.Session> {
    // Obtener tax rate si no se proporciona (siempre aplicar tax del 11.5%)
    const finalTaxRateId = taxRateId || await this.getOrCreateTaxRate();

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'us_bank_account'], // Tarjetas y ACH
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: metadata?.productName || 'Membresía AutoDealers',
            },
            unit_amount: Math.round(amount * 100), // Stripe usa centavos
          },
          quantity: 1,
          tax_rates: [finalTaxRateId], // Siempre aplicar tax
        },
      ],
      customer: customerId,
      customer_email: customerEmail,
      metadata,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/cancel`,
    };

    return await this.stripe.checkout.sessions.create(sessionData);
  }

  /**
   * Crea o obtiene un tax rate del 11.5%
   */
  async getOrCreateTaxRate(): Promise<string> {
    // Buscar tax rate existente
    const taxRates = await this.stripe.taxRates.list({
      limit: 100,
    });

    const existingTaxRate = taxRates.data.find(
      (tr) => tr.percentage === 11.5 && tr.active
    );

    if (existingTaxRate) {
      return existingTaxRate.id;
    }

    // Crear nuevo tax rate
    const taxRate = await this.stripe.taxRates.create({
      display_name: 'Tax',
      description: 'Tax 11.5%',
      percentage: 11.5,
      inclusive: false,
    });

    return taxRate.id;
  }

  /**
   * Crea una sesión de Checkout para suscripciones (con priceId)
   * Incluye automáticamente el tax del 11.5%
   */
  async createSubscriptionCheckoutSession(params: {
    tenantId: string;
    priceId: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    customerId?: string;
  }): Promise<Stripe.Checkout.Session> {
    // Obtener tax rate del 11.5%
    const taxRateId = await this.getOrCreateTaxRate();

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'us_bank_account'], // Tarjetas y ACH
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
          tax_rates: [taxRateId], // Aplicar tax del 11.5%
        },
      ],
      customer: params.customerId,
      customer_email: params.customerEmail,
      metadata: params.metadata,
      success_url: params.successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/cancel`,
    };

    return await this.stripe.checkout.sessions.create(sessionData);
  }
}

