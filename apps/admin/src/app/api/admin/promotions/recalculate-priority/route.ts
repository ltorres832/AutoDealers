import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Recalcula las prioridades de todas las promociones activas
 * basándose en precio, duración y tipo
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todas las promociones pagadas activas
    const promotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isPaid', '==', true)
      .where('status', '==', 'active')
      .get();

    const promotions = [];
    for (const doc of promotionsSnapshot.docs) {
      const data = doc.data();
      const pathParts = doc.ref.path.split('/');
      const tenantId = pathParts[1];

      // Calcular nuevo score de prioridad
      const priceWeight = (data.price || 0) * 0.6;
      const durationWeight = (data.duration || 7) * 0.4;
      const scopeBonus = data.promotionScope === 'dealer' ? 50 
        : data.promotionScope === 'seller' ? 30 
        : 10;
      const calculatedPriority = Math.round(priceWeight + durationWeight + scopeBonus);

      promotions.push({
        ref: doc.ref,
        tenantId,
        currentPriority: data.priority || 0,
        newPriorityScore: calculatedPriority,
        price: data.price,
        duration: data.duration,
        promotionScope: data.promotionScope,
      });
    }

    // Ordenar por nuevo score (mayor a menor)
    promotions.sort((a, b) => b.newPriorityScore - a.newPriorityScore);

    // Asignar prioridades finales (1 = más alta, mayor número = más baja)
    // Pero invertimos para que mayor score = menor número de prioridad (más arriba)
    const updates = [];
    for (let i = 0; i < promotions.length; i++) {
      const promotion = promotions[i];
      // Prioridad final: 1 es la más alta, entonces asignamos 1, 2, 3...
      // Pero queremos que mayor score = menor número, así que invertimos
      const finalPriority = promotions.length - i; // El primero tiene la prioridad más alta (número más grande)
      
      // Alternativa: usar el score directamente como prioridad (mayor score = mayor prioridad)
      // Para que sea más intuitivo, usamos el score como prioridad
      updates.push({
        ref: promotion.ref,
        priority: promotion.newPriorityScore,
        priorityScore: promotion.newPriorityScore,
      });
    }

    // Aplicar actualizaciones
    const batch = db.batch();
    for (const update of updates) {
      batch.update(update.ref, {
        priority: update.priority,
        priorityScore: update.priorityScore,
        priorityRecalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Prioridades recalculadas para ${updates.length} promociones`,
      updated: updates.length,
    });
  } catch (error: any) {
    console.error('Error recalculating priorities:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


