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

    const userWithNetwork = user as typeof user & {
      associatedDealers?: string[];
      dealerNetworkId?: string;
    };
    const currentAssociatedDealers = userWithNetwork.associatedDealers ?? [];

    const body = await request.json();
    const { email, name } = body;

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
    const uniqueAssociated = currentAssociatedDealers.filter((id) => id !== billTid);
    const networkSize = 1 + uniqueAssociated.length;

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

    const ts = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(auth.userId).update({
      associatedDealers: admin.firestore.FieldValue.arrayUnion(dealerTenantId),
      updatedAt: ts,
    });

    if (userWithNetwork.dealerNetworkId) {
      const networkRef = db.collection('dealer_networks').doc(userWithNetwork.dealerNetworkId);
      const networkDoc = await networkRef.get();
      if (networkDoc.exists) {
        const network = networkDoc.data() || {};
        const roster = Array.isArray(network.dealers) ? network.dealers : [];
        const requestedName = String(name || '').trim().toLowerCase();
        const dealerName = String(
          name || dealerData.businessName || dealerData.companyName || dealerData.name || email
        ).trim();
        let replaced = false;
        const nextRoster = roster.map((item: any) => {
          const rosterName = String(item.name || item.displayName || '').trim().toLowerCase();
          const isPending = !item.tenantId || item.status === 'pending_tenant_link';
          if (!replaced && isPending && requestedName && rosterName === requestedName) {
            replaced = true;
            return {
              ...item,
              name: item.name || dealerName,
              displayName: item.displayName || dealerName,
              tenantId: dealerTenantId,
              status: 'active',
              linkedBy: auth.userId,
              linkedAt: ts,
            };
          }
          return item;
        });
        if (!replaced) {
          nextRoster.push({
            name: dealerName,
            displayName: dealerName,
            tenantId: dealerTenantId,
            role: 'member',
            status: 'active',
            addedBy: auth.userId,
            addedAt: ts,
          });
        }
        await Promise.all([
          networkRef.update({
            dealers: nextRoster,
            updatedAt: ts,
          }),
          db.collection('tenants').doc(dealerTenantId).set(
            {
              dealerNetworkId: userWithNetwork.dealerNetworkId,
              multiDealerPrimary: false,
              updatedAt: ts,
            },
            { merge: true }
          ),
        ]);
      }
    }

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



