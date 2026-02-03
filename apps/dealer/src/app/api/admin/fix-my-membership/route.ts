import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para que un usuario active su propia membresía
 * Busca en Stripe si hay un pago reciente y activa la cuenta
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const stripe = await getStripeInstance();

    // Obtener usuario
    const userDoc = await db.collection('users').doc(auth.userId).get();
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

    // Buscar checkout sessions recientes (últimas 24 horas) para este customer
    let checkoutSession: any = null;
    let membershipId: string | null = null;

    if (stripeCustomerId) {
      try {
        // Buscar suscripciones activas primero
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 10,
        });

        for (const subscription of subscriptions.data) {
          // Verificar metadata de la suscripción
          if (subscription.metadata?.userId === auth.userId && 
              subscription.metadata?.membershipId &&
              subscription.metadata?.source === 'registration') {
            membershipId = subscription.metadata.membershipId;
            
            // Actualizar usuario y tenant
            await db.collection('users').doc(auth.userId).update({
              membershipId,
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await db.collection('tenants').doc(auth.tenantId).update({
              membershipId,
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Crear o actualizar suscripción en Firestore
            const existingSub = await db
              .collection('subscriptions')
              .where('stripeSubscriptionId', '==', subscription.id)
              .limit(1)
              .get();

            if (existingSub.empty) {
              await db.collection('subscriptions').add({
                tenantId: auth.tenantId,
                userId: auth.userId,
                membershipId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                status: subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trialing' : 'incomplete',
                currentPeriodStart: admin.firestore.Timestamp.fromDate(
                  new Date(subscription.current_period_start * 1000)
                ),
                currentPeriodEnd: admin.firestore.Timestamp.fromDate(
                  new Date(subscription.current_period_end * 1000)
                ),
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              await existingSub.docs[0].ref.update({
                status: subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trialing' : 'incomplete',
                membershipId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            return NextResponse.json({
              success: true,
              message: 'Membresía activada correctamente desde Stripe',
              membershipId,
              subscriptionId: subscription.id,
            });
          }
        }
      } catch (error) {
        console.error('Error buscando en Stripe:', error);
      }
    }

    return NextResponse.json(
      { error: 'No se encontró pago reciente en Stripe. Por favor, contacta a soporte.' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error activando membresía:', error);
    return NextResponse.json(
      { error: 'Error al activar membresía', details: error.message },
      { status: 500 }
    );
  }
}



