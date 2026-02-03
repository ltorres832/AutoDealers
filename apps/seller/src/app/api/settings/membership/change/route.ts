import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionByTenantId, changeMembership } from '@autodealers/billing';
import { getMembershipById } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { SubscriptionStatus } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { membershipId } = body;

    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    // Verificar que la membresía existe y es para sellers
    const newMembership = await getMembershipById(membershipId);
    if (!newMembership || !newMembership.isActive || newMembership.type !== 'seller') {
      return NextResponse.json({ error: 'Invalid membership' }, { status: 400 });
    }

    // Obtener suscripción actual
    let subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    // Si no hay suscripción, crear una nueva
    if (!subscription) {
      console.log(`📝 [SELLER] No hay suscripción, creando una nueva para tenant: ${auth.tenantId}`);
      
      // Obtener información del usuario
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(auth.userId).get();
      const userData = userDoc.data();
      
      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Crear suscripción básica en Firestore (sin Stripe por ahora)
      const subscriptionRef = db.collection('subscriptions').doc();
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mes desde ahora
      
      const newSubscription = {
        tenantId: auth.tenantId,
        userId: auth.userId,
        membershipId: membershipId,
        stripeSubscriptionId: '', // Se creará cuando se configure el pago
        stripeCustomerId: '', // Se creará cuando se configure el pago
        status: 'trialing' as SubscriptionStatus, // Estado de prueba
        currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
        cancelAtPeriodEnd: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await subscriptionRef.set(newSubscription);
      
      subscription = {
        id: subscriptionRef.id,
        tenantId: auth.tenantId,
        userId: auth.userId,
        membershipId: membershipId,
        stripeSubscriptionId: '',
        stripeCustomerId: '',
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log(`✅ [SELLER] Suscripción creada: ${subscription.id}`);
    } else {
      // Si ya existe, cambiar membresía
      console.log(`🔄 [SELLER] Cambiando membresía de suscripción existente: ${subscription.id}`);
      await changeMembership(subscription.id, membershipId, newMembership.stripePriceId);
    }

    return NextResponse.json({
      success: true,
      message: 'Membership changed successfully',
    });
  } catch (error: any) {
    console.error('Error changing membership:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



