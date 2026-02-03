import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore, getStripeInstance, getStripeWebhookSecretValue } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

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
    const webhookSecret = await getStripeWebhookSecretValue();
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
            // Pago de anuncio individual: activar anuncio automáticamente
            await db.collection('sponsored_content').doc(session.metadata.adId).update({
              status: 'active',
              approvedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              paymentSessionId: session.id,
              paymentIntentId: session.payment_intent,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (session.subscription) {
            // Nueva suscripción
            await db.collection('advertisers').doc(advertiserId).update({
              plan: plan || 'starter',
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Buscar anunciante por customerId
        const advertisersSnapshot = await db
          .collection('advertisers')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!advertisersSnapshot.empty) {
          const advertiserDoc = advertisersSnapshot.docs[0];
          
          if (subscription.status === 'active') {
            await advertiserDoc.ref.update({
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            await advertiserDoc.ref.update({
              status: 'suspended',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else if (subscription.status === 'canceled') {
            await advertiserDoc.ref.update({
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

        const advertisersSnapshot = await db
          .collection('advertisers')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!advertisersSnapshot.empty) {
          const advertiserDoc = advertisersSnapshot.docs[0];
          await advertiserDoc.ref.update({
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
        
        if (customerId && paymentIntent.metadata?.adId) {
          // Actualizar anuncio si tiene adId en metadata
          await db.collection('sponsored_content').doc(paymentIntent.metadata.adId).update({
            status: 'active',
            paymentIntentId: paymentIntent.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        if (customerId && invoice.metadata?.adId) {
          // Actualizar anuncio si tiene adId en metadata
          await db.collection('sponsored_content').doc(invoice.metadata.adId).update({
            status: 'active',
            invoiceId: invoice.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

