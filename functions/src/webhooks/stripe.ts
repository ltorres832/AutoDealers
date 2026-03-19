// Webhooks de Stripe - Manejo completo de eventos de pagos y suscripciones

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Webhook principal de Stripe
 */
export const stripeWebhook = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!sig) {
      res.status(400).json({ error: 'No signature' });
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
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
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * Maneja un pago exitoso
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

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

  // Generar recibo
  const receipt = {
    receiptNumber: `REC-${Date.now()}`,
    invoiceId: fullInvoice.id,
    customerName,
    customerEmail,
    amount: fullInvoice.amount_paid / 100,
    currency: fullInvoice.currency.toUpperCase(),
    items: fullInvoice.lines.data.map((line) => ({
      description: line.description || 'Suscripción',
      amount: line.amount / 100,
      quantity: line.quantity || 1,
    })),
    tax: fullInvoice.tax ? fullInvoice.tax / 100 : 0,
    total: fullInvoice.amount_paid / 100,
    paidAt: new Date(fullInvoice.created * 1000),
  };

  // Guardar recibo en Firestore
  await db.collection('receipts').add({
    ...receipt,
    subscriptionId: subscriptionId_local,
    tenantId: subscriptionData.tenantId,
    userId: subscriptionData.userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Enviar email con recibo (si hay servicio de email configurado)
  try {
    const { EmailService } = await import('@autodealers/messaging');
    const emailCreds = await getEmailCredentials();
    const emailApiKey = emailCreds.apiKey || '';
    const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';

    if (emailApiKey) {
      const emailService = new EmailService(emailApiKey, emailProvider);
      await emailService.sendEmail({
        tenantId: subscriptionData.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: emailCreds.fromAddress || 'noreply@autodealers.com',
        to: customerEmail,
        content: generateReceiptHTML(receipt),
        metadata: {
          subject: `Recibo de Pago - ${receipt.receiptNumber}`,
        },
      });
    }
  } catch (emailError) {
    console.error('Error enviando email de recibo:', emailError);
  }

  // Actualizar estado y reactivar si estaba suspendida
  if (subscriptionData.status === 'suspended' || subscriptionData.status === 'past_due') {
    await reactivateAccountAfterPayment(subscriptionId_local);
  } else {
    // Actualizar fecha de último pago
    await db.collection('subscriptions').doc(subscriptionId_local).update({
      status: 'active',
      lastPaymentDate: admin.firestore.Timestamp.fromDate(new Date(invoice.created * 1000)),
      nextPaymentDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      daysPastDue: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
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

  // Actualizar estado a past_due
  await db.collection('subscriptions').doc(subscriptionId_local).update({
    status: 'past_due',
    daysPastDue: 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Enviar email de pago fallido
  const subscriptionData = subscriptionDoc.data();
  const userDoc = await db.collection('users').doc(subscriptionData.userId).get();
  const userData = userDoc.data();
  const customerEmail = userData?.email || '';

  if (customerEmail) {
    try {
      const { EmailService } = await import('@autodealers/messaging');
      const emailCreds = await getEmailCredentials();
      const emailApiKey = emailCreds.apiKey || '';
      const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';

      if (emailApiKey) {
        const emailService = new EmailService(emailApiKey, emailProvider);
        await emailService.sendEmail({
          tenantId: subscriptionData.tenantId,
          channel: 'email',
          direction: 'outbound',
          from: emailCreds.fromAddress || 'noreply@autodealers.com',
          to: customerEmail,
          content: `
            <h2>Pago Fallido</h2>
            <p>Su pago de membresía no pudo ser procesado.</p>
            <p>Por favor, actualice su método de pago para continuar usando nuestros servicios.</p>
          `,
          metadata: {
            subject: 'Pago Fallido - AutoDealers',
          },
        });
      }
    } catch (emailError) {
      console.error('Error enviando email de pago fallido:', emailError);
    }
  }
}

/**
 * Maneja creación de suscripción
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

  // Si viene del registro y está activa, activar cuenta y asignar membresía
  if (metadata.source === 'registration' && subscription.status === 'active') {
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
  }

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

  // Mapear estado de Stripe
  let status: 'active' | 'past_due' | 'cancelled' | 'suspended' = 'active';
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    status = 'cancelled';
  }

  await db.collection('subscriptions').doc(subscriptionId_local).update({
    status,
    currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
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

  await db.collection('subscriptions').doc(subscriptionId_local).update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Maneja pago completado de checkout
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;

  // Manejar registro de membresía
  if (metadata?.source === 'registration' && metadata?.userId && metadata?.membershipId && metadata?.tenantId) {
    try {
      let subscription: Stripe.Subscription | null = null;
      if (session.subscription) {
        subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
          { expand: ['latest_invoice'] }
        );
      }

      if (subscription) {
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
      }
    } catch (error) {
      console.error('Error procesando checkout de registro:', error);
    }
  }
}

// Helper functions
async function getEmailCredentials() {
  const configDoc = await db.collection('admin_config').doc('email').get();
  return configDoc.data() || { apiKey: '', fromAddress: '' };
}

function generateReceiptHTML(receipt: any): string {
  return `
    <html>
      <body>
        <h2>Recibo de Pago</h2>
        <p>Número: ${receipt.receiptNumber}</p>
        <p>Fecha: ${receipt.paidAt.toLocaleDateString()}</p>
        <p>Total: ${receipt.currency} ${receipt.total}</p>
      </body>
    </html>
  `;
}

async function reactivateAccountAfterPayment(subscriptionId: string) {
  await db.collection('subscriptions').doc(subscriptionId).update({
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}


