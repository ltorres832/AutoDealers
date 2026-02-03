import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import {
  markReferralAsConfirmed,
  confirmReferral,
  cancelReferral,
  createReferral,
  getUserByReferralCode,
} from '@autodealers/core';

const db = getFirestore();

/**
 * Procesa referidos después de un pago
 * Se llama desde el webhook de Stripe cuando se detecta un pago
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscriptionId, membershipType, userType, referralCode } = body;

    if (!userId || !membershipType || !userType) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Si hay código de referido, crear registro
    if (referralCode) {
      const referrerId = await getUserByReferralCode(referralCode);
      if (referrerId && referrerId !== userId) {
        // Obtener email del usuario referido
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const email = userData?.email || '';

        // Crear registro de referido
        await createReferral(
          referrerId,
          userId,
          email,
          referralCode,
          userType as 'dealer' | 'seller',
          membershipType as 'basic' | 'professional' | 'premium'
        );

        // Marcar como confirmado (el pago ya se realizó)
        // Buscar el referido recién creado
        const referralsSnapshot = await db
          .collection('referrals')
          .where('referredId', '==', userId)
          .where('referralCode', '==', referralCode)
          .limit(1)
          .get();

        if (!referralsSnapshot.empty) {
          const referralId = referralsSnapshot.docs[0].id;
          await markReferralAsConfirmed(referralId);

          // Programar confirmación después de 14 días
          scheduleReferralConfirmation(referralId, subscriptionId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing referral:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Programa la confirmación del referido después de 14 días
 */
async function scheduleReferralConfirmation(referralId: string, subscriptionId?: string) {
  // Guardar en una colección de tareas programadas
  // En producción, usar Cloud Functions con Cloud Scheduler o similar
  const confirmationDate = new Date();
  confirmationDate.setDate(confirmationDate.getDate() + 14);

  await db.collection('scheduled_tasks').add({
    type: 'referral_confirmation',
    referralId,
    subscriptionId,
    scheduledFor: admin.firestore.Timestamp.fromDate(confirmationDate),
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Confirma un referido después de verificar que no se canceló
 * NOTA: Esta función no debe ser exportada desde un route handler
 */
async function confirmReferralAfterPeriod(referralId: string): Promise<void> {
  const referralDoc = await db.collection('referrals').doc(referralId).get();
  if (!referralDoc.exists) {
    throw new Error('Referido no encontrado');
  }

  const referral = referralDoc.data() as any;
  
  // Verificar que no esté cancelado
  if (referral.status === 'cancelled') {
    return; // Ya está cancelado, no hacer nada
  }

  // Verificar que el usuario aún tenga la suscripción activa
  // (esto se puede hacer verificando el subscriptionId en Stripe)
  // Por ahora, asumimos que si llegó aquí es porque pasaron los 14 días sin cancelar

  await confirmReferral(referralId);
}

/**
 * Cancela un referido cuando se detecta cancelación de suscripción
 * NOTA: Esta función no debe ser exportada desde un route handler
 */
async function cancelReferralOnSubscriptionCancel(
  userId: string,
  subscriptionId: string
): Promise<void> {
  // Buscar referidos pendientes o confirmados del usuario
  const referralsSnapshot = await db
    .collection('referrals')
    .where('referredId', '==', userId)
    .where('status', 'in', ['pending', 'confirmed'])
    .get();

  for (const doc of referralsSnapshot.docs) {
    const referral = doc.data();
    // Solo cancelar si aún no se han otorgado recompensas
    if (referral.status !== 'rewarded') {
      await cancelReferral(doc.id);
    }
  }
}

