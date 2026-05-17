// Helper para obtener instancias de Stripe usando credenciales desde Firestore

import Stripe from 'stripe';
import {
  getStripeSecretKey,
  getStripeWebhookSecret,
  getStripeAdvertiserWebhookSecret,
} from './credentials';

/**
 * Obtiene una instancia de Stripe usando las credenciales desde Firestore
 * Si no hay credenciales en Firestore, usa variables de entorno como fallback
 */
export async function getStripeInstance(): Promise<Stripe> {
  const secretKey = await getStripeSecretKey();
  
  if (!secretKey) {
    throw new Error('Stripe Secret Key no está configurada. Configúrala en Admin → Configuración → General → Stripe');
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
export async function getStripeWebhookSecretValue(): Promise<string> {
  const secret = await getStripeWebhookSecret();
  
  if (!secret) {
    throw new Error('Stripe Webhook Secret no está configurado. Configúralo en Admin → Configuración → General → Stripe');
  }

  return secret;
}

/**
 * Webhook secret para `apps/advertiser` (URL distinta en Stripe).
 * Si no hay secreto dedicado, usa el mismo que {@link getStripeWebhookSecretValue}.
 */
export async function getStripeAdvertiserWebhookSecretValue(): Promise<string> {
  const secret = await getStripeAdvertiserWebhookSecret();

  if (!secret) {
    throw new Error(
      'Stripe Webhook Secret no está configurado para advertiser. Configura stripeAdvertiserWebhookSecret (o STRIPE_ADVERTISER_WEBHOOK_SECRET), o el webhook principal compartido en Admin → Configuración → General → Stripe'
    );
  }

  return secret;
}

/**
 * Crea una instancia de StripeService usando credenciales desde Firestore
 * Compatible con el paquete @autodealers/billing
 */
export async function getStripeService() {
  const { StripeService } = await import('@autodealers/billing');
  const secretKey = await getStripeSecretKey();
  
  if (!secretKey) {
    throw new Error('Stripe Secret Key no está configurada. Configúrala en Admin → Configuración → General → Stripe');
  }

  return new StripeService(secretKey);
}

