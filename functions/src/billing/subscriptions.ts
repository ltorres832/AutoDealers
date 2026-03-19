// Cloud Functions para Billing/Subscriptions - COMPLETO
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { SubscriptionService } from '@autodealers/billing';
import { StripeService } from '@autodealers/billing';
import { getAllSubscriptions, getSubscriptionById } from '@autodealers/billing';

const db = getFirestore();

// Crear suscripción
export const createSubscription = onCall(async (request) => {
  const { tenantId, userId, membershipId, customerEmail, customerName, priceId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !userId || !membershipId || !customerEmail || !customerName || !priceId) {
    throw new HttpsError('invalid-argument', 'Todos los campos son requeridos');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const subscriptionService = new SubscriptionService(stripeService);

    const subscription = await subscriptionService.createSubscription(
      tenantId,
      userId,
      membershipId,
      customerEmail,
      customerName,
      priceId
    );

    return { subscription };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear suscripción: ${error.message}`);
  }
});

// Obtener suscripción
export const getSubscription = onCall(async (request) => {
  const { subscriptionId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!subscriptionId) {
    throw new HttpsError('invalid-argument', 'subscriptionId es requerido');
  }

  try {
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new HttpsError('not-found', 'Suscripción no encontrada');
    }

    return { subscription };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener suscripción: ${error.message}`);
  }
});

// Obtener todas las suscripciones
export const getAllSubscriptionsFunction = onCall(async (request) => {
  const { status, tenantId, membershipId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    const subscriptions = await getAllSubscriptions({
      status,
      tenantId,
      membershipId,
    });

    return { subscriptions };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener suscripciones: ${error.message}`);
  }
});

// Actualizar suscripción
export const updateSubscription = onCall(async (request) => {
  const { subscriptionId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!subscriptionId || !updates) {
    throw new HttpsError('invalid-argument', 'subscriptionId y updates son requeridos');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const subscriptionService = new SubscriptionService(stripeService);

    await subscriptionService.updateSubscription(subscriptionId, updates);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar suscripción: ${error.message}`);
  }
});

// Cancelar suscripción
export const cancelSubscription = onCall(async (request) => {
  const { subscriptionId, cancelAtPeriodEnd } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!subscriptionId) {
    throw new HttpsError('invalid-argument', 'subscriptionId es requerido');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const subscriptionService = new SubscriptionService(stripeService);

    await subscriptionService.cancelSubscription(subscriptionId, cancelAtPeriodEnd !== false);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al cancelar suscripción: ${error.message}`);
  }
});

// Reactivar suscripción
export const reactivateSubscription = onCall(async (request) => {
  const { subscriptionId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!subscriptionId) {
    throw new HttpsError('invalid-argument', 'subscriptionId es requerido');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const subscriptionService = new SubscriptionService(stripeService);

    await subscriptionService.reactivateSubscription(subscriptionId);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al reactivar suscripción: ${error.message}`);
  }
});

// Cambiar membresía (upgrade/downgrade)
export const changeMembership = onCall(async (request) => {
  const { subscriptionId, newMembershipId, newPriceId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!subscriptionId || !newMembershipId || !newPriceId) {
    throw new HttpsError('invalid-argument', 'subscriptionId, newMembershipId y newPriceId son requeridos');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const subscriptionService = new SubscriptionService(stripeService);

    await subscriptionService.changeMembership(subscriptionId, newMembershipId, newPriceId);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al cambiar membresía: ${error.message}`);
  }
});

// Obtener membresías disponibles
export const getAvailableMemberships = onCall(async (request) => {
  const { type } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    const { getMemberships } = await import('@autodealers/billing');
    const memberships = await getMemberships(type);

    return { memberships };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener membresías: ${error.message}`);
  }
});

// Obtener membresía por ID
export const getMembershipById = onCall(async (request) => {
  const { membershipId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!membershipId) {
    throw new HttpsError('invalid-argument', 'membershipId es requerido');
  }

  try {
    const { getMembershipById: getMembership } = await import('@autodealers/billing');
    const membership = await getMembership(membershipId);

    if (!membership) {
      throw new HttpsError('not-found', 'Membresía no encontrada');
    }

    return { membership };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener membresía: ${error.message}`);
  }
});

// Actualizar membresía (solo admin) - usado por Flutter Admin
export const updateMembership = onCall(async (request) => {
  const { membershipId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const role = (auth.token as any)?.role;
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden actualizar membresías');
  }

  if (!membershipId || !updates || typeof updates !== 'object') {
    throw new HttpsError('invalid-argument', 'membershipId y updates son requeridos');
  }

  try {
    const { updateMembership: updateMembershipBilling, getMembershipById } = await import('@autodealers/billing');
    const { syncMembershipFeaturesToTenants } = await import('@autodealers/core');
    await updateMembershipBilling(membershipId, updates);
    await syncMembershipFeaturesToTenants(membershipId);
    const membership = await getMembershipById(membershipId);
    return { membership: membership ?? null };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar membresía: ${error.message}`);
  }
});

// Crear payment intent
export const createPaymentIntent = onCall(async (request) => {
  const { tenantId, amount, currency, metadata } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !amount || !currency) {
    throw new HttpsError('invalid-argument', 'tenantId, amount y currency son requeridos');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const paymentIntent = await stripeService.createPaymentIntent(amount, currency, metadata);

    return { clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear payment intent: ${error.message}`);
  }
});

// Crear setup intent (para guardar método de pago)
export const createSetupIntent = onCall(async (request) => {
  const { tenantId, customerId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const setupIntent = await stripeService.createSetupIntent(customerId);

    return { clientSecret: setupIntent.client_secret, id: setupIntent.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear setup intent: ${error.message}`);
  }
});

// Obtener métodos de pago
export const getPaymentMethods = onCall(async (request) => {
  const { customerId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!customerId) {
    throw new HttpsError('invalid-argument', 'customerId es requerido');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const paymentMethods = await stripeService.getPaymentMethods(customerId);

    return { paymentMethods };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener métodos de pago: ${error.message}`);
  }
});

// Establecer método de pago por defecto
export const setDefaultPaymentMethod = onCall(async (request) => {
  const { customerId, paymentMethodId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!customerId || !paymentMethodId) {
    throw new HttpsError('invalid-argument', 'customerId y paymentMethodId son requeridos');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    await stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al establecer método de pago por defecto: ${error.message}`);
  }
});

// Desvincular método de pago
export const detachPaymentMethod = onCall(async (request) => {
  const { paymentMethodId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!paymentMethodId) {
    throw new HttpsError('invalid-argument', 'paymentMethodId es requerido');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    await stripeService.detachPaymentMethod(paymentMethodId);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al desvincular método de pago: ${error.message}`);
  }
});

// Obtener facturas
export const getInvoices = onCall(async (request) => {
  const { customerId, limit } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!customerId) {
    throw new HttpsError('invalid-argument', 'customerId es requerido');
  }

  try {
    const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
    const invoices = await stripeService.getInvoices(customerId, limit || 10);

    return { invoices };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener facturas: ${error.message}`);
  }
});

// Obtener suscripción del tenant/usuario
export const getTenantSubscription = onCall(async (request) => {
  const { tenantId, userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const subscriptions = await getAllSubscriptions({
      tenantId,
      userId,
      status: 'active',
    });

    return { subscription: subscriptions.length > 0 ? subscriptions[0] : null };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener suscripción del tenant: ${error.message}`);
  }
});


