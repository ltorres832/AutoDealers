import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar si la membresía permite múltiples dealers
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    const membershipId = userData?.membershipId;

    if (!membershipId) {
      return NextResponse.json({ error: 'No membership found' }, { status: 400 });
    }

    const membershipDoc = await db.collection('memberships').doc(membershipId).get();
    const membership = membershipDoc.data();

    if (!membership?.features?.multipleDealers) {
      return NextResponse.json(
        { error: 'Tu membresía no permite gestionar múltiples dealers' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Buscar el dealer por email
    const dealersSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .where('role', '==', 'dealer')
      .get();

    if (dealersSnapshot.empty) {
      return NextResponse.json({ error: 'Dealer no encontrado con ese email' }, { status: 404 });
    }

    const dealerDoc = dealersSnapshot.docs[0];
    const dealerData = dealerDoc.data();
    const dealerTenantId = dealerData.tenantId;

    if (!dealerTenantId) {
      return NextResponse.json({ error: 'Dealer no tiene tenant asociado' }, { status: 400 });
    }

    // Verificar límite de dealers
    const currentAssociatedDealers = userData?.associatedDealers || [];
    const maxDealers = membership.features.maxDealers || -1;

    if (maxDealers !== -1 && currentAssociatedDealers.length >= maxDealers) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de ${maxDealers} dealers permitidos` },
        { status: 403 }
      );
    }

    // Verificar que no esté ya asociado
    if (currentAssociatedDealers.includes(dealerTenantId)) {
      return NextResponse.json({ error: 'Este dealer ya está asociado' }, { status: 400 });
    }

    // Agregar el dealer a la lista de dealers asociados
    await db.collection('users').doc(auth.userId).update({
      associatedDealers: admin.firestore.FieldValue.arrayUnion(dealerTenantId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Dealer asociado exitosamente',
      dealerId: dealerTenantId,
    });
  } catch (error: any) {
    console.error('Error associating dealer:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



