import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
// confirmReferralAfterPeriod ahora es una función interna, importamos desde core
import { confirmReferral } from '@autodealers/core';

const db = getFirestore();

/**
 * Endpoint para verificar y confirmar referidos que cumplieron los 14 días
 * Debe ejecutarse periódicamente (cron job o Cloud Scheduler)
 */
export async function POST(request: NextRequest) {
  try {
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();

    // Buscar tareas programadas que ya deben ejecutarse
    const tasksSnapshot = await db
      .collection('scheduled_tasks')
      .where('type', '==', 'referral_confirmation')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .get();

    const results = {
      processed: 0,
      errors: [] as string[],
    };

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const referralId = task.referralId;

      try {
        // Verificar que el referido aún existe y no está cancelado
        const referralDoc = await db.collection('referrals').doc(referralId).get();
        if (!referralDoc.exists) {
          await taskDoc.ref.update({
            status: 'skipped',
            reason: 'Referido no encontrado',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          } as any);
          continue;
        }

        const referral = referralDoc.data() as any;
        if (referral.status === 'cancelled') {
          await taskDoc.ref.update({
            status: 'skipped',
            reason: 'Referido cancelado',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          } as any);
          continue;
        }

        // Confirmar el referido y aplicar recompensas
        await confirmReferral(referralId);

        // Marcar tarea como completada
        await taskDoc.ref.update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);

        results.processed++;
      } catch (error: any) {
        console.error(`Error processing referral ${referralId}:`, error);
        results.errors.push(`Referral ${referralId}: ${error.message}`);
        
        // Marcar tarea como error
        await taskDoc.ref.update({
          status: 'error',
          error: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: any) {
    console.error('Error checking confirmations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

