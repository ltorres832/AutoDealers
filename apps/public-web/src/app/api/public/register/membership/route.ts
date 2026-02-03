import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserById } from '@autodealers/core';
import { changeMembership } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { userId, membershipId, accountType } = body;

    if (!userId || !membershipId || !accountType) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el tenantId del usuario
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Usuario no tiene tenant asociado' },
        { status: 400 }
      );
    }

    // Buscar la suscripción del tenant (si existe)
    const subscriptionsSnapshot = await db
      .collection('subscriptions')
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (!subscriptionsSnapshot.empty) {
      // Si ya tiene suscripción, cambiar la membresía
      const subscription = subscriptionsSnapshot.docs[0];
      await changeMembership(subscription.id, membershipId, '');
    } else {
      // Si no tiene suscripción, crear una nueva con la membresía seleccionada
      // Obtener información de la membresía
      const membershipDoc = await db.collection('memberships').doc(membershipId).get();
      if (!membershipDoc.exists) {
        return NextResponse.json(
          { error: 'Membresía no encontrada' },
          { status: 404 }
        );
      }

      const membership = membershipDoc.data();
      
      // Actualizar el usuario con la membresía
      await db.collection('users').doc(userId).update({
        membershipId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Actualizar el tenant con la membresía
      await db.collection('tenants').doc(tenantId).update({
        membershipId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Membresía asignada correctamente',
    });
  } catch (error) {
    console.error('Error assigning membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al asignar membresía' },
      { status: 500 }
    );
  }
}

