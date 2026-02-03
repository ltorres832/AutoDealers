import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionByTenantId } from '@autodealers/billing';
import { getStripeInstance } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { immediately = false, reactivate = false } = body;

    // Obtener suscripción actual
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    if (!subscription) {
      return NextResponse.json({ 
        error: 'No subscription found',
        message: 'No tienes una suscripción activa para cancelar.'
      }, { status: 404 });
    }

    // Si tiene Stripe subscription ID, cancelar o reactivar en Stripe
    if (subscription.stripeSubscriptionId) {
      try {
        const stripe = await getStripeInstance();
        
        if (reactivate) {
          // Reactivar suscripción
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: false,
          });
        } else if (immediately) {
          // Cancelar inmediatamente
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        } else {
          // Cancelar al final del período (recomendado)
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
        }
      } catch (stripeError: any) {
        console.error('Error updating in Stripe:', stripeError);
        // Continuar con la actualización en Firestore aunque falle Stripe
      }
    }

    // Actualizar en Firestore
    const db = getFirestore();
    const updates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (reactivate) {
      updates.cancelAtPeriodEnd = false;
      if (subscription.status === 'cancelled') {
        updates.status = 'active';
      }
    } else {
      updates.cancelAtPeriodEnd = !immediately;
      if (immediately) {
        updates.status = 'cancelled';
        updates.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    await db.collection('subscriptions').doc(subscription.id).update(updates);

    return NextResponse.json({
      success: true,
      message: reactivate
        ? 'Tu membresía ha sido reactivada exitosamente.'
        : immediately
          ? 'Tu membresía ha sido cancelada inmediatamente.'
          : 'Tu membresía se cancelará al final del período actual. Podrás seguir usando el servicio hasta entonces.',
      cancelAtPeriodEnd: reactivate ? false : !immediately,
    });
  } catch (error: any) {
    console.error('Error canceling membership:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

