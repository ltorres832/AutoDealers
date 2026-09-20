import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getFirestore,
  getStripeInstance,
  getStripeAdvertiserWebhookSecret,
  getStripeAdvertiserWebhookSecretValue,
  isValidStripeWebhookSecret,
  activationSchedulePatch,
  createSalesEmployeeAdCommission,
} from '@autodealers/core';
import { resolveAdvertiserUrl } from '@autodealers/shared/platform-urls';
import * as admin from 'firebase-admin';

const db = getFirestore();

async function getAdvertiserByStripeCustomerId(customerId: string) {
  const snapshot = await db
    .collection('advertisers')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ref: doc.ref, data: doc.data() };
}

/** Anunciantes sin suscripción: solo pagan por anuncio individual. */
function isPayAsYouGoAdvertiser(data: FirebaseFirestore.DocumentData): boolean {
  return (
    data.plan === null ||
    data.plan === undefined ||
    data.billingModel === 'pay_per_ad'
  );
}

/** Verificación rápida: abre esta URL o usa Stripe "Send test webhook". */
export async function GET() {
  const secret = await getStripeAdvertiserWebhookSecret();
  const webhookSecretConfigured = isValidStripeWebhookSecret(secret);

  return NextResponse.json({
    ok: true,
    service: 'autodealers-advertiser-stripe-webhook',
    endpoint: `${resolveAdvertiserUrl()}/api/webhooks/stripe`,
    method: 'POST',
    events: [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'payment_intent.succeeded',
      'invoice.payment_succeeded',
    ],
    webhookSecretConfigured,
    stripeDashboardHint:
      'Stripe Dashboard → Developers → Webhooks → endpoint de advertiser → Signing secret (whsec_...)',
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = await getStripeInstance();
    const webhookSecret = await getStripeAdvertiserWebhookSecretValue();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.advertiserId) {
          const advertiserId = session.metadata.advertiserId;
          const plan = session.metadata.newPlan || session.metadata.plan;
          const action = session.metadata.action;

          if (action === 'change_plan' && plan) {
            // Cambio de plan
            await db.collection('advertisers').doc(advertiserId).update({
              plan: plan,
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (action === 'ad_payment' && session.metadata?.adId) {
            const adId = session.metadata.adId;
            const adSnap = await db.collection('sponsored_content').doc(adId).get();
            const adData = (adSnap.data() || {}) as Record<string, unknown>;
            await db.collection('sponsored_content').doc(adId).update({
              status: 'active',
              paymentStatus: 'paid',
              approvedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              paymentSessionId: session.id,
              paymentIntentId: session.payment_intent,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              ...activationSchedulePatch(adData),
            });
          } else if (session.subscription) {
            const advertiserSnap = await db.collection('advertisers').doc(advertiserId).get();
            const advertiserData = advertiserSnap.data();
            if (advertiserData && isPayAsYouGoAdvertiser(advertiserData)) {
              await db.collection('advertisers').doc(advertiserId).update({
                stripeCustomerId: session.customer as string,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              await db.collection('advertisers').doc(advertiserId).update({
                plan: plan || 'starter',
                stripeSubscriptionId: session.subscription as string,
                stripeCustomerId: session.customer as string,
                status: 'active',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const advertiser = await getAdvertiserByStripeCustomerId(customerId);
        if (advertiser && !isPayAsYouGoAdvertiser(advertiser.data)) {
          if (subscription.status === 'active') {
            await advertiser.ref.update({
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            await advertiser.ref.update({
              status: 'suspended',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (subscription.status === 'canceled') {
            await advertiser.ref.update({
              status: 'cancelled',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const advertiser = await getAdvertiserByStripeCustomerId(customerId);
        if (advertiser && !isPayAsYouGoAdvertiser(advertiser.data)) {
          await advertiser.ref.update({
            status: 'cancelled',
            stripeSubscriptionId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const customerId = paymentIntent.customer as string;
        const adAmount = Number(paymentIntent.amount_received || paymentIntent.amount || 0) / 100;
        if (adAmount > 0 && paymentIntent.metadata?.source === 'sales_employee' && paymentIntent.metadata?.employeeId) {
          await createSalesEmployeeAdCommission({
            employeeId: paymentIntent.metadata.employeeId,
            tenantId: paymentIntent.metadata?.tenantId,
            amountPaid: adAmount,
            currency: paymentIntent.currency,
            stripePaymentIntentId: paymentIntent.id,
            adKind: 'premium_banner',
            salesAdOrderId: paymentIntent.metadata?.salesAdOrderId || null,
            source: 'sales_employee',
            salesEmployeeId: paymentIntent.metadata.employeeId,
          }).catch((err) => console.warn('[advertiser stripe] sales employee ad commission:', err));
        }
        
        if (customerId && paymentIntent.metadata?.adId) {
          const adId = paymentIntent.metadata.adId;
          const adSnap = await db.collection('sponsored_content').doc(adId).get();
          const adData = (adSnap.data() || {}) as Record<string, unknown>;
          await db.collection('sponsored_content').doc(adId).update({
            status: 'active',
            paymentStatus: 'paid',
            paymentIntentId: paymentIntent.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...activationSchedulePatch(adData),
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        if (customerId && invoice.metadata?.adId) {
          const adId = invoice.metadata.adId;
          const adSnap = await db.collection('sponsored_content').doc(adId).get();
          const adData = (adSnap.data() || {}) as Record<string, unknown>;
          await db.collection('sponsored_content').doc(adId).update({
            status: 'active',
            paymentStatus: 'paid',
            invoiceId: invoice.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...activationSchedulePatch(adData),
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

