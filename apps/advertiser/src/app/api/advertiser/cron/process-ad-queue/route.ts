import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';
import {
  AD_PLACEMENT_CAPACITY,
  AD_PLACEMENT_LABELS,
  type AdPlacement,
} from '@/lib/ad-placements';

export const dynamic = 'force-dynamic';

const db = getFirestore();
const PLACEMENTS = Object.keys(AD_PLACEMENT_CAPACITY) as AdPlacement[];

function dateLikeToMillis(value: any): number | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getCronSecret() {
  return (
    process.env.CRON_SECRET ||
    process.env.AD_QUEUE_CRON_SECRET ||
    process.env.NEXT_PUBLIC_CRON_SECRET ||
    ''
  ).trim();
}

async function getPlacementDocs(placement: AdPlacement) {
  const snap = await db.collection('sponsored_content').where('placement', '==', placement).get();
  return snap.docs.map((doc: any) => ({ id: doc.id, data: doc.data() || {}, ref: doc.ref }));
}

function countActiveVisibleSlots(rows: Array<{ data: any }>) {
  const now = Date.now();
  return rows.filter(({ data }) => {
    const status = String(data.status || '');
    const endMillis = dateLikeToMillis(data.endDate);
    if (endMillis !== null && endMillis < now) return false;
    return status === 'active' || status === 'approved';
  }).length;
}

function queuedRows(rows: Array<{ id: string; data: any; ref: any }>) {
  return rows
    .filter(({ data }) => String(data.status || '') === 'queued')
    .sort((a, b) => {
      const aq = Number(a.data.queuePosition || Number.MAX_SAFE_INTEGER);
      const bq = Number(b.data.queuePosition || Number.MAX_SAFE_INTEGER);
      if (aq !== bq) return aq - bq;
      return (dateLikeToMillis(a.data.queuedAt) || 0) - (dateLikeToMillis(b.data.queuedAt) || 0);
    });
}

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = getCronSecret();
    const auth = request.headers.get('authorization') || '';
    const providedSecret = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';

    if (!configuredSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const stripe = await getStripeInstance();
    const results: Array<Record<string, unknown>> = [];

    for (const placement of PLACEMENTS) {
      const rows = await getPlacementDocs(placement);
      const activeCount = countActiveVisibleSlots(rows);
      const availableSlots = Math.max(AD_PLACEMENT_CAPACITY[placement] - activeCount, 0);
      const queue = queuedRows(rows);
      let activated = 0;

      for (const row of queue.slice(0, availableSlots)) {
        const data = row.data;
        const amount = Number(data.price || data.budget || 0);
        const duration = Number(data.durationDays || 7);
        const customerId = String(data.stripeCustomerId || '');
        const paymentMethodId = String(data.queuedPaymentMethodId || '');

        if (!amount || !customerId || !paymentMethodId) {
          await row.ref.set(
            {
              status: 'payment_failed',
              queueStatus: 'missing_payment_data',
              paymentStatus: 'failed',
              paymentError: 'Faltan datos de pago para activar automáticamente.',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          results.push({ placement, adId: row.id, status: 'payment_failed', reason: 'missing_payment_data' });
          continue;
        }

        await row.ref.set(
          {
            status: 'activating',
            queueStatus: 'charging',
            activationAttempts: admin.firestore.FieldValue.increment(1),
            activationAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        try {
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: Math.round(amount * 100),
              currency: 'usd',
              customer: customerId,
              payment_method: paymentMethodId,
              confirm: true,
              off_session: true,
              description: `Anuncio en turno: ${data.title || data.campaignName || AD_PLACEMENT_LABELS[placement]}`,
              metadata: {
                action: 'queued_ad_activation',
                adId: row.id,
                advertiserId: String(data.advertiserId || ''),
                placement,
              },
            },
            {
              idempotencyKey: `queued-ad-${row.id}-${dateLikeToMillis(data.queuedAt) || 'noqueuedat'}`,
            }
          );

          if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Stripe devolvió estado ${paymentIntent.status}`);
          }

          const start = new Date();
          const end = new Date(start.getTime());
          end.setDate(end.getDate() + duration);

          await row.ref.set(
            {
              status: 'active',
              queueStatus: 'activated',
              paymentStatus: 'paid',
              paymentIntentId: paymentIntent.id,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              startDate: start,
              endDate: end,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          activated += 1;
          results.push({ placement, adId: row.id, status: 'active', paymentIntentId: paymentIntent.id });
        } catch (paymentError: any) {
          await row.ref.set(
            {
              status: 'payment_failed',
              queueStatus: 'payment_failed',
              paymentStatus: 'failed',
              paymentError: paymentError.message || 'Stripe rechazó el cobro automático.',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          results.push({
            placement,
            adId: row.id,
            status: 'payment_failed',
            reason: paymentError.message || 'Stripe payment failed',
          });
        }
      }

      results.push({
        placement,
        activeCount,
        availableSlots,
        queued: queue.length,
        activated,
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    console.error('process ad queue cron:', error);
    return NextResponse.json(
      { error: error.message || 'No se pudo procesar la cola de anuncios.' },
      { status: 500 }
    );
  }
}
