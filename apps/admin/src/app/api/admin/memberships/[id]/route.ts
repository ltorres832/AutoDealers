export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { DocumentData, UpdateData } from 'firebase-admin/firestore';
import { verifyAuth } from '@/lib/auth';
import { syncMembershipFeaturesToTenants, getFirestore } from '@autodealers/core';
import {
  assertUniqueMembershipPrice,
  mergeAndNormalizeMembershipFeatures,
} from '@/lib/membership-features-admin';

const db = getFirestore();

/** Misma BD que el resto del admin (evita desajuste con @autodealers/billing → @autodealers/shared en App Hosting). */
function normalizeMembershipId(raw: string | string[] | undefined): string {
  const id = Array.isArray(raw) ? raw[0] : raw;
  return decodeURIComponent(String(id || '').trim());
}

async function readMembershipFromAdminDb(membershipId: string) {
  const id = normalizeMembershipId(membershipId);
  if (!id) return null;
  const snap = await db.collection('memberships').doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  return {
    id: snap.id,
    ...data,
    createdAt: data?.createdAt?.toDate?.() || new Date(),
  };
}

/** Campos de plan que pueden actualizarse desde el admin (el resto se ignora). */
const UPDATABLE_MEMBERSHIP_FIELDS = new Set([
  'name',
  'type',
  'price',
  'currency',
  'billingCycle',
  'isActive',
  'stripePriceId',
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string | string[] }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const membershipId = normalizeMembershipId(rawId);

    console.log('🔍 GET /api/admin/memberships/[id] - membershipId:', membershipId);

    if (!membershipId) {
      console.error('❌ No membership ID provided');
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const membership = await readMembershipFromAdminDb(membershipId);

    console.log('📦 Membership fetched:', membership ? `${membership.id} - ${(membership as { name?: string }).name}` : 'null');

    if (!membership) {
      console.warn('⚠️ Membership not found:', membershipId);
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    return NextResponse.json({ membership });
  } catch (error: unknown) {
    console.error('❌ Error fetching membership:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string | string[] }> }
) {
  try {
    console.log('🔍 PUT /api/admin/memberships/[id] - Verifying auth...');
    const auth = await verifyAuth(request);
    
    console.log('🔍 PUT /api/admin/memberships/[id] - Auth result:', {
      hasAuth: !!auth,
      role: auth?.role,
      userId: auth?.userId,
    });
    
    if (!auth) {
      console.error('❌ PUT /api/admin/memberships/[id] - No auth');
      return NextResponse.json({ error: 'Unauthorized - No authentication found' }, { status: 401 });
    }
    
    if (auth.role !== 'admin') {
      console.error('❌ PUT /api/admin/memberships/[id] - Not admin:', auth.role);
      return NextResponse.json({ error: 'Unauthorized - Admin role required' }, { status: 403 });
    }

    const { id: rawId } = await params;
    const membershipId = normalizeMembershipId(rawId);
    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { features, ...otherUpdates } = body;

    const existingMembership = await readMembershipFromAdminDb(membershipId);
    if (!existingMembership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const cleanedUpdates: Record<string, unknown> = {};
    Object.keys(otherUpdates).forEach((key) => {
      if (!UPDATABLE_MEMBERSHIP_FIELDS.has(key)) {
        return;
      }
      if (otherUpdates[key] !== undefined) {
        cleanedUpdates[key] = otherUpdates[key];
      }
    });

    const nextType = (cleanedUpdates.type as string) ?? existingMembership.type;
    const nextCurrency = (cleanedUpdates.currency as string) ?? existingMembership.currency;
    const nextCycle = (cleanedUpdates.billingCycle as string) ?? existingMembership.billingCycle;
    const nextPrice =
      cleanedUpdates.price !== undefined ? Number(cleanedUpdates.price) : existingMembership.price;

    const priceCheck = await assertUniqueMembershipPrice({
      db,
      type: nextType,
      currency: nextCurrency,
      billingCycle: nextCycle,
      price: nextPrice,
      excludeMembershipId: membershipId,
    });
    if (priceCheck.ok === false) {
      return NextResponse.json(
        {
          error:
            'Ya existe otro plan con el mismo precio para este tipo, moneda y ciclo. Cada membresía debe tener un precio distinto.',
          duplicateId: priceCheck.duplicateId,
        },
        { status: 409 }
      );
    }

    let mergedFeatures: Record<string, unknown> | undefined;
    if (features !== undefined) {
      mergedFeatures = mergeAndNormalizeMembershipFeatures(
        existingMembership.features as unknown as Record<string, unknown> | undefined,
        features as Record<string, unknown>
      );
    }

    const updateData: Record<string, unknown> = {
      ...cleanedUpdates,
      ...(mergedFeatures !== undefined ? { features: mergedFeatures } : {}),
    };

    // Limpiar cualquier undefined que pueda quedar
    const finalUpdateData: Record<string, unknown> = {};
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        if (typeof updateData[key] === 'object' && updateData[key] !== null && !(updateData[key] instanceof Date)) {
          const cleaned: Record<string, unknown> = {};
          Object.keys(updateData[key] as object).forEach((subKey) => {
            if ((updateData[key] as Record<string, unknown>)[subKey] !== undefined) {
              cleaned[subKey] = (updateData[key] as Record<string, unknown>)[subKey];
            }
          });
          finalUpdateData[key] = cleaned;
        } else {
          finalUpdateData[key] = updateData[key];
        }
      }
    });

    finalUpdateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    finalUpdateData.syncVersion = admin.firestore.FieldValue.increment(1);

    console.log('💾 Updating membership with cleaned data:', JSON.stringify(finalUpdateData, null, 2));

    await db.collection('memberships').doc(membershipId).update(finalUpdateData as UpdateData<DocumentData>);

    // Sincronizar features con todos los tenants que usan esta membresía
    await syncMembershipFeaturesToTenants(membershipId);

    const updated = await readMembershipFromAdminDb(membershipId);
    return NextResponse.json({ 
      membership: updated,
      message: 'Membresía actualizada y features sincronizadas exitosamente'
    });
  } catch (error) {
    console.error('Error updating membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string | string[] }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const membershipId = normalizeMembershipId(rawId);
    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const existing = await readMembershipFromAdminDb(membershipId);
    if (!existing) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Marcar como inactiva en lugar de eliminar
    await db.collection('memberships').doc(membershipId).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncVersion: admin.firestore.FieldValue.increment(1),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting membership:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
