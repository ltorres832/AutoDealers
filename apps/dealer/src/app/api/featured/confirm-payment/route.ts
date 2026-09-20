import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, billingTenantId } from '@/lib/auth';
import { getFirestore, getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const tenantId = auth ? billingTenantId(auth) || auth.tenantId : undefined;
    if (!auth?.userId || !tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, paymentIntentId } = await request.json();
    if (!requestId || !paymentIntentId) {
      return NextResponse.json({ error: 'requestId y paymentIntentId requeridos' }, { status: 400 });
    }

    const stripe = await getStripeInstance();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'El pago no fue completado' }, { status: 400 });
    }

    const db = getFirestore();
    const requestRef = db.collection('tenants').doc(tenantId).collection('featured_promotion_requests').doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    const data = requestDoc.data() || {};
    if (data.requestedBy !== auth.userId || data.stripePaymentIntentId !== paymentIntentId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Number(data.durationHours || 24) * 60 * 60 * 1000);
    const activeId = `${data.targetType}_${data.targetId}_${paymentIntentId}`;
    await db.collection('featured_promotions').doc(activeId).set(
      {
        targetType: data.targetType,
        targetId: data.targetId,
        tenantId,
        sellerId: data.sellerId || null,
        kind: data.kind,
        planId: data.planId,
        planLabel: data.plan?.label || '',
        status: 'active',
        startsAt: admin.firestore.Timestamp.fromDate(now),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        price: data.price,
        currency: data.currency || 'usd',
        stripePaymentIntentId: paymentIntentId,
        createdBy: auth.userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await requestRef.update({
      status: 'active',
      activePromotionId: activeId,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, activePromotionId: activeId, expiresAt: expiresAt.toISOString() });
  } catch (error: any) {
    console.error('featured confirm dealer:', error);
    return NextResponse.json({ error: error.message || 'Error al confirmar pago' }, { status: 500 });
  }
}
