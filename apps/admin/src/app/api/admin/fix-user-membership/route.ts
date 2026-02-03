import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para activar manualmente la membresía de un usuario
 * Útil cuando el webhook no se ejecutó correctamente
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, membershipId, tenantId } = body;

    if (!userId || !membershipId || !tenantId) {
      return NextResponse.json(
        { error: 'userId, membershipId y tenantId son requeridos' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const stripe = await getStripeInstance();

    // Buscar suscripciones de Stripe para este usuario
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar customer de Stripe por email
    let stripeCustomerId: string | null = null;
    if (userData.email) {
      try {
        const customers = await stripe.customers.list({
          email: userData.email,
          limit: 1,
        });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        }
      } catch (error) {
        console.error('Error buscando customer en Stripe:', error);
      }
    }

    // Buscar suscripciones activas en Stripe
    let activeSubscription: any = null;
    if (stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1,
        });
        if (subscriptions.data.length > 0) {
          activeSubscription = subscriptions.data[0];
        }
      } catch (error) {
        console.error('Error buscando suscripciones en Stripe:', error);
      }
    }

    // Actualizar usuario con membresía
    await db.collection('users').doc(userId).update({
      membershipId,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Actualizar tenant con membresía
    await db.collection('tenants').doc(tenantId).update({
      membershipId,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Crear suscripción en Firestore si hay una en Stripe
    if (activeSubscription) {
      const existingSub = await db
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', activeSubscription.id)
        .limit(1)
        .get();

      if (existingSub.empty) {
        await db.collection('subscriptions').add({
          tenantId,
          userId,
          membershipId,
          stripeSubscriptionId: activeSubscription.id,
          stripeCustomerId: activeSubscription.customer as string,
          status: 'active',
          currentPeriodStart: admin.firestore.Timestamp.fromDate(
            new Date(activeSubscription.current_period_start * 1000)
          ),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(
            new Date(activeSubscription.current_period_end * 1000)
          ),
          cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Actualizar suscripción existente
        await existingSub.docs[0].ref.update({
          status: 'active',
          membershipId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Membresía activada correctamente',
      userId,
      membershipId,
      tenantId,
      subscriptionCreated: !!activeSubscription,
    });
  } catch (error: any) {
    console.error('Error activando membresía:', error);
    return NextResponse.json(
      { error: 'Error al activar membresía', details: error.message },
      { status: 500 }
    );
  }
}



