export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { DocumentData, UpdateData } from 'firebase-admin/firestore';
import { verifyAuth } from '@/lib/auth';
import { syncMembershipFeaturesToTenants, getFirestore } from '@autodealers/core';
import {
  assertUniqueMembershipPrice,
  prepareAdminMembershipFeaturesForSave,
} from '@/lib/membership-features-admin';
import {
  coerceMembershipNumber,
  serializeFirestoreDoc,
} from '@/lib/serialize-firestore';

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
  return serializeFirestoreDoc(snap);
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
  'stripeProductId',
  'launchPrice',
  'launchEndsAt',
  'launchStripePriceId',
  'introPrice',
  'introMonths',
  'introStripePriceId',
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

    const nextType = String(cleanedUpdates.type ?? existingMembership.type ?? 'dealer');
    const nextCurrency = String(cleanedUpdates.currency ?? existingMembership.currency ?? 'USD');
    const nextCycle = String(cleanedUpdates.billingCycle ?? existingMembership.billingCycle ?? 'monthly');
    const nextPrice =
      cleanedUpdates.price !== undefined
        ? coerceMembershipNumber(cleanedUpdates.price)
        : coerceMembershipNumber(existingMembership.price ?? 0);

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
      mergedFeatures = prepareAdminMembershipFeaturesForSave(
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

    // Sincronizar Prices de Stripe si cambió precio regular / launch / intro
    try {
      const { getStripeInstance } = await import('@autodealers/core');
      const { createMembershipStripePrice } = await import('@autodealers/billing');
      const stripe = await getStripeInstance();
      const name = String(finalUpdateData.name ?? existingMembership.name ?? 'Plan');
      const type = (
        nextType === 'seller' ? 'seller' : nextType === 'business' ? 'business' : 'dealer'
      ) as 'dealer' | 'seller' | 'business';
      const currency = nextCurrency;
      const billingCycle = (nextCycle === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';
      const productId = String(
        finalUpdateData.stripeProductId ?? existingMembership.stripeProductId ?? ''
      ).trim();

      const prevPrice = coerceMembershipNumber(existingMembership.price ?? 0);
      const missingRegularPrice = !String(existingMembership.stripePriceId || '').trim();
      if (nextPrice > 0 && (nextPrice !== prevPrice || missingRegularPrice)) {
        const created = await createMembershipStripePrice({
          stripe: stripe as any,
          name,
          type,
          price: nextPrice,
          currency,
          billingCycle,
          membershipId,
          kind: 'regular',
          existingProductId: productId || undefined,
        });
        finalUpdateData.stripePriceId = created.stripePriceId;
        finalUpdateData.stripeProductId = created.stripeProductId;
      }

      const nextLaunchPrice =
        finalUpdateData.launchPrice !== undefined
          ? coerceMembershipNumber(finalUpdateData.launchPrice)
          : coerceMembershipNumber(existingMembership.launchPrice ?? 0);
      const prevLaunch = coerceMembershipNumber(existingMembership.launchPrice ?? 0);
      const launchEndsAtRaw =
        finalUpdateData.launchEndsAt !== undefined
          ? finalUpdateData.launchEndsAt
          : existingMembership.launchEndsAt;
      if (nextLaunchPrice > 0 && launchEndsAtRaw) {
        if (
          nextLaunchPrice !== prevLaunch ||
          !String(existingMembership.launchStripePriceId || '').trim() ||
          finalUpdateData.launchEndsAt !== undefined
        ) {
          const created = await createMembershipStripePrice({
            stripe: stripe as any,
            name: `${name} Launch`,
            type,
            price: nextLaunchPrice,
            currency,
            billingCycle,
            membershipId,
            kind: 'launch',
            existingProductId:
              String(finalUpdateData.stripeProductId ?? productId ?? '').trim() || undefined,
          });
          finalUpdateData.launchStripePriceId = created.stripePriceId;
          if (!finalUpdateData.stripeProductId) {
            finalUpdateData.stripeProductId = created.stripeProductId;
          }
        }
      } else if (finalUpdateData.launchPrice === 0 || finalUpdateData.launchPrice === null) {
        finalUpdateData.launchStripePriceId = '';
        finalUpdateData.launchEndsAt = null;
      }

      const nextIntroPrice =
        finalUpdateData.introPrice !== undefined
          ? coerceMembershipNumber(finalUpdateData.introPrice)
          : coerceMembershipNumber(existingMembership.introPrice ?? 0);
      const nextIntroMonths =
        finalUpdateData.introMonths !== undefined
          ? Math.floor(Number(finalUpdateData.introMonths) || 0)
          : Math.floor(Number(existingMembership.introMonths) || 0);
      const prevIntro = coerceMembershipNumber(existingMembership.introPrice ?? 0);
      const prevMonths = Math.floor(Number(existingMembership.introMonths) || 0);
      if (nextIntroPrice > 0 && nextIntroMonths >= 1) {
        if (
          nextIntroPrice !== prevIntro ||
          nextIntroMonths !== prevMonths ||
          !String(existingMembership.introStripePriceId || '').trim()
        ) {
          const created = await createMembershipStripePrice({
            stripe: stripe as any,
            name: `${name} Intro`,
            type,
            price: nextIntroPrice,
            currency,
            billingCycle,
            membershipId,
            kind: 'intro',
            existingProductId:
              String(finalUpdateData.stripeProductId ?? productId ?? '').trim() || undefined,
          });
          finalUpdateData.introStripePriceId = created.stripePriceId;
          if (!finalUpdateData.stripeProductId) {
            finalUpdateData.stripeProductId = created.stripeProductId;
          }
        }
      } else if (
        finalUpdateData.introPrice === 0 ||
        finalUpdateData.introPrice === null ||
        finalUpdateData.introMonths === 0
      ) {
        finalUpdateData.introStripePriceId = '';
      }

      // Normalizar launchEndsAt a Timestamp si viene ISO string
      if (typeof finalUpdateData.launchEndsAt === 'string' && finalUpdateData.launchEndsAt) {
        const d = new Date(finalUpdateData.launchEndsAt);
        if (!Number.isNaN(d.getTime())) {
          finalUpdateData.launchEndsAt = admin.firestore.Timestamp.fromDate(d);
        }
      }
    } catch (stripeSyncErr) {
      const message =
        stripeSyncErr instanceof Error ? stripeSyncErr.message : 'Error sincronizando Stripe';
      console.error('Stripe price sync:', stripeSyncErr);
      return NextResponse.json(
        {
          error:
            'No se pudo sincronizar el Price en Stripe. El plan no se actualizó para evitar un checkout roto.',
          details: message,
        },
        { status: 502 }
      );
    }

    console.log('💾 Updating membership with cleaned data:', JSON.stringify(finalUpdateData, null, 2));

    await db.collection('memberships').doc(membershipId).update(finalUpdateData as UpdateData<DocumentData>);

    try {
      await syncMembershipFeaturesToTenants(
        membershipId,
        (mergedFeatures ?? existingMembership.features) as Record<string, unknown> | undefined
      );
    } catch (syncError) {
      console.warn('⚠️ syncMembershipFeaturesToTenants (no bloquea guardado):', syncError);
    }

    const updated = await readMembershipFromAdminDb(membershipId);
    return NextResponse.json({
      membership: updated,
      message: 'Membresía actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error updating membership:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('No document to update') || message.includes('NOT_FOUND')) {
      return NextResponse.json({ error: 'Membresía no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
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
