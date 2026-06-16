export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  getFirestore,
  trySendBillingCommunicationAllChannels,
  createReferral,
  markReferralAsConfirmed,
  cancelReferral,
  getUserByReferralCode,
  resolveReferralMembershipTier,
  notifyPlatformAdmins,
  notifyUser,
  applyPendingSubdomainForMembership,
} from '@autodealers/core';
import {
  updateSubscriptionStatus,
  reactivateAccountAfterPayment,
  suspendAccountForNonPayment,
  checkAndSuspendEmailsOnSubscriptionChange,
} from '@autodealers/billing';
import type { SubscriptionStatus } from '@autodealers/billing';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import {
  getStripeInstance,
  getStripeWebhookSecretValue,
  getStripeWebhookSecret,
} from '@autodealers/core';

const db = getFirestore();

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = await getStripeInstance();
    const webhookSecret = await getStripeWebhookSecretValue();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const eventRef = db.collection('stripe_webhook_events').doc(event.id);
  const alreadyProcessed = await eventRef.get();
  if (alreadyProcessed.exists) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        // Suspender/reactivar emails corporativos según estado de suscripción
        const updatedSubscription = event.data.object as Stripe.Subscription;
        const subscriptionDoc = await db
          .collection('subscriptions')
          .where('stripeSubscriptionId', '==', updatedSubscription.id)
          .limit(1)
          .get();
        if (!subscriptionDoc.empty) {
          const subData = subscriptionDoc.docs[0].data();
          const mappedStatus = updatedSubscription.status === 'active' ? 'active' :
                               updatedSubscription.status === 'past_due' ? 'past_due' :
                               updatedSubscription.status === 'canceled' || updatedSubscription.status === 'unpaid' ? 'suspended' :
                               'suspended';
          await checkAndSuspendEmailsOnSubscriptionChange(subscriptionDoc.docs[0].id, mappedStatus);
        }
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        // Suspender emails corporativos al cancelar suscripción
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const deletedSubscriptionDoc = await db
          .collection('subscriptions')
          .where('stripeSubscriptionId', '==', deletedSubscription.id)
          .limit(1)
          .get();
        if (!deletedSubscriptionDoc.empty) {
          await checkAndSuspendEmailsOnSubscriptionChange(deletedSubscriptionDoc.docs[0].id, 'cancelled');
        }
        break;

      case 'customer.subscription.trial_will_end':
        // Sin aviso previo al usuario: el cobro ocurre automáticamente al terminar el trial.
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await eventRef.set({
      type: event.type,
      livemode: event.livemode,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

const STRIPE_WEBHOOK_EVENTS = [
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'checkout.session.completed',
] as const;

function resolveAdminWebhookBaseUrl(): string {
  const fromEnv =
    process.env.ADMIN_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'https://admin-app--autodealers-7f62e.us-central1.hosted.app';
}

/** Verificación rápida: abre esta URL en el navegador o usa Stripe "Send test webhook". */
export async function GET() {
  const base = resolveAdminWebhookBaseUrl();
  const secret = await getStripeWebhookSecret();
  const webhookSecretConfigured =
    typeof secret === 'string' &&
    secret.trim().startsWith('whsec_') &&
    secret.trim().length > 12;

  return NextResponse.json({
    ok: true,
    service: 'autodealers-admin-stripe-webhook',
    endpoint: `${base}/api/webhooks/stripe`,
    method: 'POST',
    events: STRIPE_WEBHOOK_EVENTS,
    webhookSecretConfigured,
    stripeDashboardHint:
      'Stripe Dashboard → Developers → Webhooks → Add endpoint → pegar la URL de endpoint',
    doNotUse: [
      'seller-app /api/webhooks/stripe (no existe para membresías)',
      'dealer-app /api/webhooks/stripe',
      'Cloud Function stripeWebhook (duplicaría eventos; usar solo Admin)',
    ],
  });
}

/**
 * Maneja un pago exitoso
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const stripe = await getStripeInstance();
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription.id;

  // Obtener factura completa de Stripe con tax
  const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
    expand: ['customer', 'payment_intent'],
  });

  // Buscar suscripción en Firestore
  const subscriptionSnapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (subscriptionSnapshot.empty) {
    console.warn(`Subscription not found for Stripe subscription ${subscriptionId}`);
    return;
  }

  const subscriptionDoc = subscriptionSnapshot.docs[0];
  const subscriptionId_local = subscriptionDoc.id;
  const subscriptionData = subscriptionDoc.data();

  // Obtener información del usuario
  const userDoc = await db.collection('users').doc(subscriptionData.userId).get();
  const userData = userDoc.data();
  const customerName = userData?.name || 'Cliente';
  const customerEmail = userData?.email || (fullInvoice.customer_email || '');

  // Generar recibo con desglose
  const { generateReceiptFromInvoice, generateReceiptHTML, generateReceiptText } = await import('@autodealers/billing');
  const receipt = generateReceiptFromInvoice(fullInvoice, customerName, customerEmail);

  // Guardar recibo en Firestore
  await db.collection('receipts').add({
    ...receipt,
    subscriptionId: subscriptionId_local,
    tenantId: subscriptionData.tenantId,
    userId: subscriptionData.userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Enviar email con recibo
  try {
    const { createEmailService } = await import('@autodealers/core');
    const configured = await createEmailService();

    if (!configured) {
      console.warn('Email API Key no configurada. No se enviará email de recibo.');
    } else {
      await configured.service.sendEmail({
        tenantId: subscriptionData.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: configured.fromAddress,
        to: customerEmail,
        content: generateReceiptHTML(receipt),
        metadata: {
          subject: `Recibo de Pago - ${receipt.receiptNumber}`,
          text: generateReceiptText(receipt),
        },
      });
    }
  } catch (emailError) {
    console.error('Error enviando email de recibo:', emailError);
  }

  // Aplicar meses gratis y descuentos automáticamente
  await applyFreeMonthsAndDiscounts(subscriptionData.userId, invoice);

  const wasSuspendedOrPastDue =
    subscriptionData.status === 'suspended' || subscriptionData.status === 'past_due';

  // Actualizar estado y reactivar si estaba suspendida
  if (wasSuspendedOrPastDue) {
    await reactivateAccountAfterPayment(subscriptionId_local);
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId_local).get();
    if (subscriptionDoc.exists) {
      await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId_local, 'active');
    }
    await trySendBillingCommunicationAllChannels(
      'account_reactivated',
      subscriptionId_local
    );
  } else {
    await updateSubscriptionStatus(subscriptionId_local, 'active', {
      lastPaymentDate: new Date(invoice.created * 1000),
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      daysPastDue: 0,
    });
  }

  const invoiceAmount = (invoice.amount_paid ?? invoice.total ?? 0) / 100;
  await trySendBillingCommunicationAllChannels('invoice_generated', subscriptionId_local, {
    amount: invoiceAmount,
  });
  await trySendBillingCommunicationAllChannels('payment_success', subscriptionId_local, {
    amount: invoiceAmount,
  });
}

/**
 * Maneja un pago fallido
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription.id;

  // Buscar suscripción
  const subscriptionSnapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (subscriptionSnapshot.empty) return;

  const subscriptionDoc = subscriptionSnapshot.docs[0];
  const subscriptionId_local = subscriptionDoc.id;

  const existing = subscriptionDoc.data();
  const daysPastDue = (existing?.daysPastDue ?? 0) + 1;

  await updateSubscriptionStatus(subscriptionId_local, 'past_due', {
    daysPastDue,
    statusReason: 'Pago fallido en Stripe',
  });

  await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId_local, 'past_due');

  const { getSubscriptionGraceDays } = await import('@autodealers/billing');
  if (daysPastDue >= getSubscriptionGraceDays()) {
    await suspendAccountForNonPayment(
      subscriptionId_local,
      'Suspensión automática tras pago fallido'
    );
    await trySendBillingCommunicationAllChannels('account_suspended', subscriptionId_local, {
      daysPastDue,
      days: daysPastDue,
    });
  }

  await trySendBillingCommunicationAllChannels('payment_failed', subscriptionId_local, {
    daysPastDue,
    days: daysPastDue,
  });

  if (daysPastDue === 3) {
    await trySendBillingCommunicationAllChannels('payment_reminder_3days', subscriptionId_local, {
      daysPastDue,
      days: daysPastDue,
    });
  } else if (daysPastDue === 5) {
    await trySendBillingCommunicationAllChannels('payment_reminder_5days', subscriptionId_local, {
      daysPastDue,
      days: daysPastDue,
    });
  }
}

/**
 * Maneja creación de suscripción (cuando se completa el checkout)
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;
  
  if (!metadata?.tenantId || !metadata?.userId || !metadata?.membershipId) {
    console.warn('Subscription created without required metadata:', subscription.id);
    return;
  }

  // Verificar si ya existe la suscripción
  const existingSubscription = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!existingSubscription.empty) {
    console.log('Subscription already exists in Firestore:', subscription.id);
    return;
  }

  const isPayableStatus =
    subscription.status === 'active' || subscription.status === 'trialing';
  const userUpdate: Record<string, unknown> = {
    membershipId: metadata.membershipId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const tenantUpdate: Record<string, unknown> = {
    membershipId: metadata.membershipId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (isPayableStatus) {
    userUpdate.status = 'active';
    tenantUpdate.status = 'active';
  }
  await db.collection('users').doc(metadata.userId).update(userUpdate);
  await db.collection('tenants').doc(metadata.tenantId).update(tenantUpdate);
  console.log('✅ Membresía sincronizada desde subscription.created:', metadata.userId);

  // Crear suscripción en Firestore
  const subscriptionData = {
    tenantId: metadata.tenantId,
    userId: metadata.userId,
    membershipId: metadata.membershipId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trialing' : 'incomplete',
    currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('subscriptions').add(subscriptionData);
  console.log('✅ Subscription created in Firestore:', subscription.id);

  const createdSub = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();
  if (!createdSub.empty) {
    await trySendBillingCommunicationAllChannels(
      'subscription_created',
      createdSub.docs[0].id
    );
  }

  // Procesar referido si existe
  await processReferralOnPayment(metadata.userId, subscription.id, metadata.membershipId);
}

/**
 * Maneja actualización de suscripción
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionSnapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (subscriptionSnapshot.empty) return;

  const subscriptionDoc = subscriptionSnapshot.docs[0];
  const subscriptionId_local = subscriptionDoc.id;

  let status: SubscriptionStatus = 'active';
  switch (subscription.status) {
    case 'trialing':
      status = 'trialing';
      break;
    case 'active':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'unpaid':
      status = 'unpaid';
      break;
    case 'canceled':
      status = 'cancelled';
      break;
    case 'incomplete_expired':
      status = 'incomplete_expired';
      break;
    case 'incomplete':
      status = 'incomplete';
      break;
    case 'paused':
      status = 'suspended';
      break;
    default:
      status = 'active';
  }

  const previousStatus = subscriptionDoc.data()?.status as string | undefined;
  await updateSubscriptionStatus(subscriptionId_local, status);

  if (status === 'unpaid') {
    await suspendAccountForNonPayment(
      subscriptionId_local,
      'Stripe marcó la suscripción como unpaid'
    );
  } else if (status === 'past_due') {
    await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId_local, 'past_due');
    const daysPastDue = subscriptionDoc.data()?.daysPastDue ?? 0;
    const { getSubscriptionGraceDays } = await import('@autodealers/billing');
    if (daysPastDue >= getSubscriptionGraceDays()) {
      await suspendAccountForNonPayment(
        subscriptionId_local,
        'Suspensión automática: suscripción past_due en Stripe'
      );
    }
  } else if (status === 'active') {
    if (
      previousStatus === 'suspended' ||
      previousStatus === 'past_due' ||
      previousStatus === 'unpaid'
    ) {
      await reactivateAccountAfterPayment(subscriptionId_local);
    } else {
      await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId_local, 'active');
    }
  } else if (status === 'cancelled' || status === 'suspended') {
    await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId_local, status);
  }

  const sync: Record<string, unknown> = {
    currentPeriodStart: admin.firestore.Timestamp.fromDate(
      new Date(subscription.current_period_start * 1000)
    ),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(
      new Date(subscription.current_period_end * 1000)
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const mid = subscription.metadata?.membershipId;
  if (typeof mid === 'string' && mid.trim() !== '') {
    sync.membershipId = mid.trim();
  }
  await db.collection('subscriptions').doc(subscriptionId_local).update(sync as Record<string, any>);
}

/**
 * Maneja eliminación de suscripción
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionSnapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (subscriptionSnapshot.empty) return;

  const subscriptionDoc = subscriptionSnapshot.docs[0];
  const subscriptionId_local = subscriptionDoc.id;
  const subscriptionData = subscriptionDoc.data();

  await updateSubscriptionStatus(subscriptionId_local, 'cancelled');

  await trySendBillingCommunicationAllChannels(
    'subscription_cancelled',
    subscriptionId_local
  );

  // Cancelar referidos pendientes del usuario
  await cancelUserReferrals(subscriptionData.userId, subscription.id);
}

/**
 * Maneja compra de banner premium
 */
async function handlePremiumBannerPurchase(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const tenantId = metadata.tenantId;
  const bannerId = metadata.bannerId || null;

  if (!tenantId) {
    console.error('Missing tenantId in checkout session metadata');
    return;
  }

  try {
    // Buscar el banner por session ID
    const bannersSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .where('stripeCheckoutSessionId', '==', session.id)
      .limit(1)
      .get();

    if (bannersSnapshot.empty) {
      console.error('Premium banner request not found');
      return;
    }

    const bannerDoc = bannersSnapshot.docs[0];
    const bannerRef = bannerDoc.ref;
    const bannerData = bannerDoc.data();

    // Verificar límite global de banners activos (4 máximo)
    const activeBannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get();

    // Calcular fecha de expiración
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + bannerData.duration);

    // Actualizar banner: pagado pero pendiente de aprobación
    await bannerRef.update({
      status: 'pending',
      paid: true,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      stripePaymentIntentId: session.payment_intent,
      priority: activeBannersSnapshot.size + 1,
    });

    // Notificar al admin para aprobación
    await notifyPlatformAdmins({
      type: 'system_alert',
      title: 'Banner pendiente de aprobación',
      message: `Banner "${bannerData.title}" requiere aprobación`,
      metadata: {
        bannerId: bannerRef.id,
        tenantId,
        kind: 'banner_approval',
      },
    });

    console.log(`✅ Banner premium pagado: ${bannerRef.id} para tenant ${tenantId} - Pendiente de aprobación`);
  } catch (error: any) {
    console.error('Error processing premium banner purchase:', error);
  }
}

/**
 * Maneja pago de banner asignado (activación automática sin aprobación)
 */
async function handleAssignedBannerPayment(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const tenantId = metadata.tenantId;
  const bannerId = metadata.bannerId;

  if (!tenantId || !bannerId) {
    console.error('Missing tenantId or bannerId in checkout session metadata');
    return;
  }

  try {
    const bannerRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .doc(bannerId);

    const bannerDoc = await bannerRef.get();
    if (!bannerDoc.exists) {
      console.error('Assigned banner not found');
      return;
    }

    const bannerData = bannerDoc.data();

    // Verificar que el banner está asignado y pendiente de pago
    if (bannerData?.status !== 'assigned' || bannerData?.paymentStatus !== 'pending') {
      console.error('Banner is not in assigned/pending payment status');
      return;
    }

    // Verificar límite global de banners activos (4 máximo)
    const activeBannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get();

    if (activeBannersSnapshot.size >= 4) {
      // Marcar como en cola
      await bannerRef.update({
        status: 'queued',
        queuedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        stripePaymentIntentId: session.payment_intent,
      });
      console.log('Banner en cola - límite de 4 alcanzado');
      return;
    }

    // Calcular fecha de expiración
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + bannerData.duration);

    // Activar banner automáticamente (ya fue aprobado por admin al asignarlo)
    await bannerRef.update({
      status: 'active',
      approved: true,
      paymentStatus: 'paid',
      paid: true,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      stripePaymentIntentId: session.payment_intent,
      priority: activeBannersSnapshot.size + 1,
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notificar al usuario
    if (bannerData.assignedTo) {
      await notifyUser(tenantId, bannerData.assignedTo, {
        type: 'promotion',
        title: 'Banner Premium Activado',
        message: `Tu banner premium "${bannerData.title}" ha sido activado exitosamente.`,
        metadata: { bannerId: bannerRef.id },
      });
    }

    console.log(`✅ Banner asignado activado automáticamente: ${bannerRef.id} para tenant ${tenantId}`);
  } catch (error: any) {
    console.error('Error processing assigned banner payment:', error);
  }
}

/**
 * Maneja activación de promoción pagada
 */
async function handlePaidPromotionActivation(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const tenantId = metadata.tenantId;
  const promotionScope = metadata.promotionScope as 'vehicle' | 'dealer' | 'seller';
  const vehicleId = metadata.vehicleId || null;
  const duration = parseInt(metadata.duration || '7');

  if (!tenantId || !promotionScope) {
    console.error('Missing required metadata for paid promotion');
    return;
  }

  try {
    // Buscar la solicitud de promoción pagada
    const requestsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('paid_promotion_requests')
      .where('stripeCheckoutSessionId', '==', session.id)
      .limit(1)
      .get();

    if (requestsSnapshot.empty) {
      console.error('Paid promotion request not found');
      return;
    }

    const requestData = requestsSnapshot.docs[0].data();
    const requestRef = requestsSnapshot.docs[0].ref;

    // Verificar si es una promoción asignada
    const isAssigned = metadata.isAssigned === 'true' || requestData.status === 'assigned';

    // Verificar límite global de promociones activas
    const { getPricingConfig } = await import('@autodealers/core');
    const pricingConfig = await getPricingConfig();
    const maxActive = pricingConfig.limits.maxActivePromotions;

    const activePromotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isPaid', '==', true)
      .where('status', '==', 'active')
      .get();

    if (activePromotionsSnapshot.size >= maxActive) {
      // Actualizar solicitud como en cola
      await requestRef.update({
        status: 'queued',
        queuedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Promoción en cola - límite de ${maxActive} alcanzado`);
      return;
    }

    // Obtener información del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();

    // Crear la promoción pagada
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Si es una promoción asignada, usar el nombre y descripción de la solicitud
    let promotionName = '';
    let promotionDescription = '';

    if (isAssigned && requestData.name) {
      promotionName = requestData.name;
      promotionDescription = requestData.description || '';
    } else {
      // Generar nombre y descripción automáticamente
      if (promotionScope === 'vehicle' && vehicleId) {
        const vehicleDoc = await db
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .doc(vehicleId)
          .get();
        const vehicleData = vehicleDoc.data();
        promotionName = `Promoción Especial - ${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
        promotionDescription = `Oferta especial en este vehículo por ${duration} días`;
      } else if (promotionScope === 'dealer') {
        promotionName = `Promoción ${tenantData?.name || 'Dealer'}`;
        promotionDescription = `Oferta especial de ${tenantData?.name || 'este dealer'} por ${duration} días`;
      } else if (promotionScope === 'seller') {
        promotionName = `Promoción Vendedor`;
        promotionDescription = `Oferta especial por ${duration} días`;
      }
    }

    const promotionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc();

    // Calcular prioridad inteligente basada en precio y duración
    // Fórmula: (precio * 0.6) + (duración * 0.4) + (tipo de promoción * bonus)
    const priceWeight = requestData.price * 0.6;
    const durationWeight = duration * 0.4;
    const scopeBonus = promotionScope === 'dealer' ? 50 : promotionScope === 'seller' ? 30 : 10;
    const calculatedPriority = Math.round(priceWeight + durationWeight + scopeBonus);

    // Obtener la prioridad más alta actual para asegurar que esta sea mayor
    const currentMaxPriority = activePromotionsSnapshot.size > 0
      ? Math.max(...activePromotionsSnapshot.docs.map(doc => doc.data().priority || 0))
      : 0;

    // La nueva prioridad será al menos 1 más que la máxima actual
    const finalPriority = Math.max(calculatedPriority, currentMaxPriority + 1);

    const promotionData = {
      tenantId,
      name: promotionName,
      description: promotionDescription,
      type: 'special' as const,
      discount: {
        type: 'percentage' as const,
        value: 10, // Descuento por defecto, puede ser configurado
      },
      applicableVehicles: vehicleId ? [vehicleId] : [],
      applicableToAll: promotionScope === 'dealer' || promotionScope === 'seller',
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      status: 'active' as const,
      autoSendToLeads: false,
      autoSendToCustomers: false,
      channels: [] as string[],
      aiGenerated: false,
      // Campos de promoción pagada
      isPaid: true,
      promotionScope,
      vehicleId: vehicleId || null,
      price: requestData.price,
      duration,
      paymentId: session.id,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      clicks: 0,
      priority: finalPriority, // Prioridad calculada inteligentemente
      priorityScore: calculatedPriority, // Score calculado para referencia
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await promotionRef.set(promotionData);

    // Actualizar solicitud como completada
    await requestRef.update({
      status: 'completed',
      promotionId: promotionRef.id,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Promoción pagada activada: ${promotionRef.id} para tenant ${tenantId}`);
  } catch (error: any) {
    console.error('Error activating paid promotion:', error);
  }
}

/**
 * Maneja pago completado de checkout (para promociones premium y pagos únicos)
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const stripe = await getStripeInstance();
  // Obtener factura si existe
  let invoice: Stripe.Invoice | null = null;
  if (session.invoice) {
    invoice = await stripe.invoices.retrieve(
      typeof session.invoice === 'string' ? session.invoice : session.invoice.id
    );
  }

  // Si hay factura, generar y enviar recibo
  if (invoice && session.customer_email) {
    try {
      const customerName = session.customer_details?.name || 'Cliente';
      const { generateReceiptFromInvoice, generateReceiptHTML, generateReceiptText } = await import('@autodealers/billing');
      const receipt = generateReceiptFromInvoice(invoice, customerName, session.customer_email);

      // Guardar recibo
      await db.collection('receipts').add({
        ...receipt,
        checkoutSessionId: session.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Enviar email con recibo
      const { EmailService } = await import('@autodealers/messaging');
      const { getEmailCredentials } = await import('@autodealers/core');
      const emailCreds = await getEmailCredentials();
      const emailApiKey = emailCreds.apiKey || '';
      const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';
      
      if (emailApiKey) {
        const emailService = new EmailService(emailApiKey, emailProvider);

        await emailService.sendEmail({
          tenantId: session.metadata?.tenantId || '',
          channel: 'email',
          direction: 'outbound',
          from: emailCreds.fromAddress || 'noreply@autodealers.com',
          to: session.customer_email,
          content: generateReceiptHTML(receipt),
          metadata: {
            subject: `Recibo de Pago - ${receipt.receiptNumber}`,
            text: generateReceiptText(receipt),
          },
        });
      }
    } catch (error) {
      console.error('Error generando recibo de checkout:', error);
    }
  }

  const metadata = session.metadata;
  
  // Manejar registro de membresía (nuevo flujo de registro)
  if (metadata?.source === 'registration' && metadata?.userId && metadata?.membershipId && metadata?.tenantId) {
    try {
      console.log('🔄 Procesando checkout de registro:', {
        userId: metadata.userId,
        tenantId: metadata.tenantId,
        membershipId: metadata.membershipId,
      });

      // Obtener la suscripción de Stripe si existe
      let subscription: Stripe.Subscription | null = null;
      if (session.subscription) {
        subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
          { expand: ['latest_invoice'] }
        );
      }

      // CRÍTICO: Activar cuenta SIEMPRE que haya suscripción, incluso si el status no es 'active' aún
      // El pago ya se procesó, así que debemos activar la cuenta
      if (subscription) {
        console.log('🔄 Activando cuenta para registro - subscription status:', subscription.status);
        
        // Actualizar usuario con membresía SIEMPRE (el pago ya se procesó)
        await db.collection('users').doc(metadata.userId).update({
          membershipId: metadata.membershipId,
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Actualizar tenant con membresía SIEMPRE
        await db.collection('tenants').doc(metadata.tenantId).update({
          membershipId: metadata.membershipId,
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const subdomainResult = await applyPendingSubdomainForMembership(
          metadata.tenantId,
          metadata.membershipId
        );
        if (subdomainResult.activated) {
          console.log('✅ Subdominio activado para registro:', subdomainResult.subdomain);
        }

        // Crear o actualizar suscripción en Firestore
        const existingSub = await db
          .collection('subscriptions')
          .where('stripeSubscriptionId', '==', subscription.id)
          .limit(1)
          .get();

        // Determinar el status de la suscripción
        let subscriptionStatus: 'active' | 'trialing' | 'incomplete' = 'active';
        if (subscription.status === 'trialing') {
          subscriptionStatus = 'trialing';
        } else if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
          subscriptionStatus = 'incomplete';
        } else if (subscription.status === 'active') {
          subscriptionStatus = 'active';
        }

        if (existingSub.empty) {
          await db.collection('subscriptions').add({
            tenantId: metadata.tenantId,
            userId: metadata.userId,
            membershipId: metadata.membershipId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            billingSource: 'stripe',
            status: subscriptionStatus,
            currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
            ...(subscription.trial_end
              ? {
                  trialEndsAt: admin.firestore.Timestamp.fromDate(
                    new Date(subscription.trial_end * 1000)
                  ),
                  nextPaymentDate: admin.firestore.Timestamp.fromDate(
                    new Date(subscription.trial_end * 1000)
                  ),
                }
              : {}),
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log('✅ Suscripción creada para registro:', {
            userId: metadata.userId,
            tenantId: metadata.tenantId,
            membershipId: metadata.membershipId,
            stripeSubscriptionId: subscription.id,
            status: subscriptionStatus,
          });
        } else {
          // Si ya existe, actualizar
          const existingSubDoc = existingSub.docs[0];
          await existingSubDoc.ref.update({
            status: subscriptionStatus,
            membershipId: metadata.membershipId,
            ...(subscription.trial_end
              ? {
                  trialEndsAt: admin.firestore.Timestamp.fromDate(
                    new Date(subscription.trial_end * 1000)
                  ),
                  nextPaymentDate: admin.firestore.Timestamp.fromDate(
                    new Date(subscription.trial_end * 1000)
                  ),
                }
              : {}),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log('✅ Suscripción existente actualizada:', existingSubDoc.id);
        }

        console.log('✅ Cuenta activada y membresía asignada para registro:', metadata.userId);
      } else {
        // Si no hay suscripción aún, activar igualmente basándose en que el checkout se completó
        console.log('⚠️ No hay suscripción aún, pero checkout completado. Activando cuenta de todas formas...');
        await db.collection('users').doc(metadata.userId).update({
          membershipId: metadata.membershipId,
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection('tenants').doc(metadata.tenantId).update({
          membershipId: metadata.membershipId,
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Cuenta activada sin suscripción (se creará cuando llegue el evento subscription.created)');
      }
    } catch (error) {
      console.error('Error procesando checkout de registro:', error);
    }
    return; // Ya procesamos el registro, no continuar con otros handlers
  }
  
  // Manejar banners premium
  if (metadata?.type === 'premium_banner') {
    // Verificar si es un banner asignado (ya aprobado por admin)
    if (metadata.isAssigned === 'true') {
      await handleAssignedBannerPayment(session, metadata);
    } else {
      await handlePremiumBannerPurchase(session, metadata);
    }
    return;
  }
  
  // Manejar promociones pagadas (nuevo sistema)
  if (metadata?.type === 'paid_promotion') {
    await handlePaidPromotionActivation(session, metadata);
    return;
  }

  // Manejar promociones premium (sistema antiguo)
  if (!metadata || metadata.type !== 'premium_promotion') {
    return; // No es una promoción, pero ya enviamos el recibo
  }

  const tenantId = metadata.tenantId;
  const promotionId = metadata.promotionId;

  if (!tenantId || !promotionId) {
    console.error('Missing tenantId or promotionId in checkout session metadata');
    return;
  }

  try {
    // Actualizar solicitud de promoción premium
    const requestRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_promotion_requests')
      .doc(promotionId);

    await requestRef.update({
      status: 'paid',
      paymentStatus: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      stripePaymentIntentId: session.payment_intent,
      stripeSessionId: session.id,
    });

    // Si es una promoción asignada, notificar al usuario
    const requestDoc = await requestRef.get();
    const requestData = requestDoc.data();
    const isAssigned = metadata.isAssigned === 'true' || requestData?.status === 'assigned';
    if (isAssigned && requestData?.assignedTo) {
      await notifyUser(tenantId, requestData.assignedTo, {
        type: 'promotion',
        title: 'Promoción Activada',
        message: `Tu promoción "${requestData?.name || 'Promoción Premium'}" ha sido activada exitosamente.`,
        metadata: { promotionId },
      });
    }

    // Activar la promoción y publicarla
    const promotionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc(promotionId);

    const promotionDoc = await promotionRef.get();
    if (!promotionDoc.exists) {
      console.error(`Promotion ${promotionId} not found`);
      return;
    }

    const promotionData = promotionDoc.data();
    const { SocialPublisherService } = await import('@autodealers/messaging');
    const publisher = new SocialPublisherService();

    // Publicar en redes sociales si hay plataformas configuradas
    const platforms = promotionData?.platforms || [];
    const publishResults: any[] = [];

    if (platforms.length > 0) {
      // Verificar credenciales del tenant
      const integrationsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('status', '==', 'active')
        .get();

      const availablePlatforms = integrationsSnapshot.docs
        .map((doc) => doc.data().type)
        .filter((type) => ['facebook', 'instagram'].includes(type));

      const platformsToPublish = platforms.filter((p: string) =>
        availablePlatforms.includes(p)
      );

      if (platformsToPublish.length > 0 && promotionData) {
        const publishContent = {
          text: promotionData.content || promotionData.description || promotionData.name,
          imageUrl: promotionData.imageUrl,
          hashtags: ['promocion', 'premium', 'autos'],
        };

        for (const platform of platformsToPublish) {
          try {
            if (platform === 'facebook') {
              const result = await publisher.publishToFacebook(tenantId, publishContent);
              publishResults.push({ ...result, platform: 'facebook' });
            } else if (platform === 'instagram') {
              const result = await publisher.publishToInstagram(tenantId, publishContent);
              publishResults.push({ ...result, platform: 'instagram' });
            }
          } catch (error: any) {
            publishResults.push({
              platform,
              success: false,
              error: error.message,
            });
          }
        }
      }
    }

    // Actualizar estado de la promoción
    await promotionRef.update({
      status: 'active',
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishResults,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Agregar promoción a la colección de promociones activas de la plataforma (para mostrar en página web)
    if (promotionData) {
      await db.collection('platform_promotions').add({
        tenantId,
        promotionId,
        name: promotionData.name || '',
        description: promotionData.description || '',
        imageUrl: promotionData.imageUrl,
        startDate: promotionData.startDate,
        endDate: promotionData.endDate,
      isPremium: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`Premium promotion ${promotionId} activated for tenant ${tenantId}`);
  } catch (error: any) {
    console.error('Error processing premium promotion payment:', error);
  }

  // Procesar referido si existe en metadata
  if (metadata?.userId && metadata?.membershipId) {
    await processReferralOnPayment(metadata.userId, session.id, metadata.membershipId);
  }
}

/**
 * Procesa un referido cuando se detecta un pago
 */
async function processReferralOnPayment(
  userId: string,
  subscriptionId: string,
  membershipId: string
) {
  try {
    // Obtener usuario y verificar si tiene código de referido usado
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data() || {};
    const referralCode = userData.referralCodeUsed;
    const referredBy = userData.referredBy;

    if (!referralCode || !referredBy) return;

    // Obtener información de la membresía para determinar el tipo
    const membershipDoc = await db.collection('memberships').doc(membershipId).get();
    if (!membershipDoc.exists) return;

    const membershipData = membershipDoc.data() || {};
    const membershipType = resolveReferralMembershipTier({
      name: membershipData.name as string | undefined,
      price: membershipData.price as number | undefined,
    });
    const userType = userData.role === 'dealer' ? 'dealer' : 'seller';

    // Crear registro de referido
    await createReferral(
      referredBy,
      userId,
      userData.email || '',
      referralCode,
      userType as 'dealer' | 'seller',
      membershipType as 'basic' | 'professional' | 'premium'
    );

    // Buscar el referido recién creado y marcarlo como confirmado
    const referralsSnapshot = await db
      .collection('referrals')
      .where('referredId', '==', userId)
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (!referralsSnapshot.empty) {
      const referralId = referralsSnapshot.docs[0].id;
      await markReferralAsConfirmed(referralId);

      // Programar confirmación después de 14 días
      const confirmationDate = new Date();
      confirmationDate.setDate(confirmationDate.getDate() + 14);

      await db.collection('scheduled_tasks').add({
        type: 'referral_confirmation',
        referralId,
        subscriptionId,
        scheduledFor: admin.firestore.Timestamp.fromDate(confirmationDate),
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);

      console.log(`✅ Referido creado y programado para confirmación: ${referralId}`);
    }
  } catch (error: any) {
    console.error('Error processing referral on payment:', error);
  }
}

/**
 * Aplica meses gratis y descuentos automáticamente cuando se procesa un pago
 */
async function applyFreeMonthsAndDiscounts(userId: string, invoice: Stripe.Invoice) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data() || {};
    const activeRewards = userData.activeRewards || {
      nextMonthDiscount: 0,
      freeMonthsRemaining: 0,
      promotionCredits: 0,
      bannerCredits: 0,
    };

    let hasChanges = false;
    const updates: any = {};

    // Aplicar descuento del próximo mes si existe
    if (activeRewards.nextMonthDiscount > 0) {
      // Aplicar descuento en Stripe (crear cupón o ajustar precio)
      // Por ahora, solo registramos que se aplicó
      updates['activeRewards.nextMonthDiscount'] = 0; // Se consume después de aplicar
      hasChanges = true;
      console.log(`✅ Descuento del ${activeRewards.nextMonthDiscount}% aplicado para usuario ${userId}`);
    }

    // Aplicar meses gratis si existen
    if (activeRewards.freeMonthsRemaining > 0) {
      // Extender el período de la suscripción en Stripe
      if (invoice.subscription) {
        const stripe = await getStripeInstance();
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription.id;
        
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = subscription.current_period_end;
          const newPeriodEnd = currentPeriodEnd + (activeRewards.freeMonthsRemaining * 30 * 24 * 60 * 60);
          
          // Actualizar período en Stripe
          await stripe.subscriptions.update(subscriptionId, {
            billing_cycle_anchor: 'unchanged',
            proration_behavior: 'none',
            metadata: {
              ...subscription.metadata,
              freeMonthsApplied: activeRewards.freeMonthsRemaining.toString(),
            },
          });

          // Actualizar período en Firestore
          const subscriptionSnapshot = await db
            .collection('subscriptions')
            .where('stripeSubscriptionId', '==', subscriptionId)
            .limit(1)
            .get();

          if (!subscriptionSnapshot.empty) {
            const subscriptionDoc = subscriptionSnapshot.docs[0];
            await subscriptionDoc.ref.update({
              currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(newPeriodEnd * 1000)),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          // Consumir meses gratis
          updates['activeRewards.freeMonthsRemaining'] = 0;
          hasChanges = true;
          console.log(`✅ ${activeRewards.freeMonthsRemaining} mes(es) gratis aplicado(s) para usuario ${userId}`);
        } catch (stripeError: any) {
          console.error('Error aplicando meses gratis en Stripe:', stripeError);
        }
      }
    }

    // Actualizar usuario si hay cambios
    if (hasChanges) {
      await userDoc.ref.update({
        activeRewards: {
          ...activeRewards,
          ...updates,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
    }
  } catch (error: any) {
    console.error('Error applying free months and discounts:', error);
  }
}

/**
 * Cancela referidos de un usuario cuando cancela su suscripción
 */
async function cancelUserReferrals(userId: string, subscriptionId: string) {
  try {
    // Buscar referidos pendientes o confirmados del usuario
    const referralsSnapshot = await db
      .collection('referrals')
      .where('referredId', '==', userId)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    for (const doc of referralsSnapshot.docs) {
      const referral = doc.data();
      // Solo cancelar si aún no se han otorgado recompensas
      if (referral.status !== 'rewarded') {
        await cancelReferral(doc.id);
        console.log(`✅ Referido cancelado: ${doc.id}`);
      }
    }

    // Cancelar tareas programadas relacionadas
    const tasksSnapshot = await db
      .collection('scheduled_tasks')
      .where('type', '==', 'referral_confirmation')
      .where('subscriptionId', '==', subscriptionId)
      .where('status', '==', 'pending')
      .get();

    for (const taskDoc of tasksSnapshot.docs) {
      await taskDoc.ref.update({
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
    }
  } catch (error: any) {
    console.error('Error cancelling user referrals:', error);
  }
}
