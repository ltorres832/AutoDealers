import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole, billingTenantId } from '@/lib/auth';
import { getFirestore, getUserById } from '@autodealers/core';
import {
  getSubscriptionByTenantId,
  getMembershipById,
  membershipAllowsMultiDealerNetwork,
} from '@autodealers/billing';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Misma resolución que GET /api/settings/membership: suscripción primero, luego usuario
    const billTid = billingTenantId(auth) ?? auth.tenantId!;
    const [user, subscription] = await Promise.all([
      getUserById(auth.userId),
      getSubscriptionByTenantId(billTid),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const userMembershipId = user.membershipId?.trim() || undefined;
    const subscriptionMembershipId = subscription?.membershipId?.trim() || undefined;
    const membershipId = subscriptionMembershipId || userMembershipId;

    if (!membershipId) {
      return NextResponse.json({ error: 'No membership found' }, { status: 400 });
    }

    const membership = await getMembershipById(membershipId);
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 400 });
    }

    if (!membershipAllowsMultiDealerNetwork(membership.features)) {
      return NextResponse.json(
        { error: 'Tu membresía no permite gestionar múltiples dealers' },
        { status: 403 }
      );
    }

    const userWithNetwork = user as typeof user & { associatedDealers?: string[] };
    const currentAssociatedDealers = userWithNetwork.associatedDealers ?? [];

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

    // Límite: sede principal (1) + dealers asociados ≤ maxDealers (null/undefined = ilimitado)
    const rawMax = membership.features?.maxDealers;
    const maxCap =
      rawMax === null || rawMax === undefined ? -1 : Number(rawMax);
    const networkSize = 1 + currentAssociatedDealers.length;

    if (maxCap !== -1 && networkSize >= maxCap) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${maxCap} concesionario(s) en la red (incluye tu sede principal).`,
        },
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



