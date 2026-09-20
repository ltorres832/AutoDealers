import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dealerManagedPaymentsResponse } from '@/lib/dealer-managed-guard';
import { getFirestore, getStripeService } from '@autodealers/core';
import { getFeaturedConfig, getFeaturedPlan } from '@autodealers/core/featured-promotions';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerBlock = dealerManagedPaymentsResponse(auth);
    if (dealerBlock) return dealerBlock;

    const body = await request.json();
    const planId = String(body.planId || '').trim();
    const targetType = body.targetType === 'seller' ? 'seller' : 'vehicle';
    const targetId = targetType === 'seller' ? auth.userId : String(body.targetId || '').trim();
    const paymentMethodId = typeof body.paymentMethodId === 'string' ? body.paymentMethodId : undefined;

    const config = await getFeaturedConfig();
    if (!config.enabled) return NextResponse.json({ error: 'Destacados no disponible' }, { status: 400 });
    const plan = await getFeaturedPlan(planId, targetType);
    if (!plan) return NextResponse.json({ error: 'Plan no disponible' }, { status: 400 });
    if (!targetId) return NextResponse.json({ error: 'targetId requerido' }, { status: 400 });

    const db = getFirestore();
    if (targetType === 'vehicle') {
      const vehicle = await db.collection('tenants').doc(auth.tenantId).collection('vehicles').doc(targetId).get();
      if (!vehicle.exists) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      const v = vehicle.data() || {};
      if (v.sellerId && v.sellerId !== auth.userId && v.assignedTo !== auth.userId && v.createdBy !== auth.userId) {
        return NextResponse.json({ error: 'No autorizado para este vehículo' }, { status: 403 });
      }
    }

    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};
    const stripeService = await getStripeService();
    let customerId = userData.stripeCustomerId as string | undefined;
    if (!customerId) {
      const customer = await stripeService.createCustomer(userData.email || auth.email, userData.name || auth.email, {
        tenantId: auth.tenantId,
        userId: auth.userId,
      });
      customerId = customer.id;
      await userDoc.ref.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const requestRef = db.collection('tenants').doc(auth.tenantId).collection('featured_promotion_requests').doc();
    const paymentIntent = await stripeService.createPaymentIntent(
      plan.price,
      plan.currency,
      plan.label,
      {
        type: 'featured_promotion',
        requestId: requestRef.id,
        tenantId: auth.tenantId,
        userId: auth.userId,
        targetType,
        targetId,
        planId: plan.id,
        kind: plan.kind,
      },
      customerId,
      paymentMethodId
    );

    await requestRef.set({
      plan,
      planId: plan.id,
      targetType,
      targetId,
      tenantId: auth.tenantId,
      sellerId: auth.userId,
      kind: plan.kind,
      price: plan.price,
      currency: plan.currency,
      durationHours: plan.durationHours,
      status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending_payment',
      stripePaymentIntentId: paymentIntent.id,
      requestedBy: auth.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      price: plan.price,
      plan,
      paymentCompleted: paymentIntent.status === 'succeeded',
    });
  } catch (error: any) {
    console.error('featured purchase seller:', error);
    return NextResponse.json({ error: error.message || 'Error al crear pago' }, { status: 500 });
  }
}
