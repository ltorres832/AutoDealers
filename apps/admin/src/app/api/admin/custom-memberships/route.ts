export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { serializeFirestoreDoc } from '@/lib/serialize-firestore';

const db = getFirestore();

type MembershipType = 'dealer' | 'seller';
type CustomMembershipKind = 'seller' | 'dealer' | 'multi_dealer';
type BillingCycle = 'monthly' | 'yearly';

function assertType(value: unknown): MembershipType {
  if (value === 'dealer' || value === 'seller') return value;
  throw new Error('Tipo inválido. Usa dealer o seller.');
}

function assertPlanKind(value: unknown, fallback: MembershipType): CustomMembershipKind {
  if (value === 'seller' || value === 'dealer' || value === 'multi_dealer') return value;
  return fallback === 'dealer' ? 'dealer' : 'seller';
}

function assertBillingCycle(value: unknown): BillingCycle {
  if (value === 'monthly' || value === 'yearly') return value;
  throw new Error('Ciclo inválido. Usa monthly o yearly.');
}

function normalizeFeatures(
  features: unknown,
  type: MembershipType,
  planKind?: CustomMembershipKind
): Record<string, unknown> {
  const input =
    features && typeof features === 'object' && !Array.isArray(features)
      ? (features as Record<string, unknown>)
      : {};
  const resolvedKind =
    planKind || (input.customMembershipKind as CustomMembershipKind | undefined) || (type === 'dealer' ? 'dealer' : 'seller');
  const isMultiDealer = resolvedKind === 'multi_dealer';
  const dealerNames = Array.isArray(input.dealerNames)
    ? input.dealerNames.map((name) => String(name).trim()).filter(Boolean)
    : [];
  const maxDealersRaw = input.maxDealers;
  const maxDealers =
    typeof maxDealersRaw === 'number' && Number.isFinite(maxDealersRaw)
      ? maxDealersRaw
      : maxDealersRaw === null
        ? null
        : undefined;

  if (isMultiDealer) {
    if (maxDealers !== null && (!maxDealers || maxDealers <= 0)) {
      throw new Error('Multi Dealer requiere un límite de dealers mayor de 0.');
    }
    if (dealerNames.length === 0) {
      throw new Error('Multi Dealer requiere los nombres de los dealers de la red.');
    }
    if (typeof maxDealers === 'number' && dealerNames.length > maxDealers) {
      throw new Error(`La lista de dealers (${dealerNames.length}) excede el límite configurado (${maxDealers}).`);
    }
  }

  return {
    ...input,
    adminAssignOnly: true,
    customMembership: true,
    customMembershipKind: resolvedKind,
    multiDealerEnabled: type === 'dealer' ? isMultiDealer : false,
    multipleDealers: type === 'dealer' ? isMultiDealer : false,
    requiresAdminApproval: type === 'dealer' ? isMultiDealer : false,
    dealerNames: isMultiDealer ? dealerNames : [],
  };
}

async function createStripePrice(params: {
  name: string;
  type: MembershipType;
  planKind?: CustomMembershipKind;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  membershipId?: string;
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const { getStripeInstance } = await import('@autodealers/core');
  const stripe = await getStripeInstance();
  const planKind = params.planKind || (params.type === 'dealer' ? 'dealer' : 'seller');
  const product = await stripe.products.create({
    name: `${params.name} - Custom ${planKind === 'multi_dealer' ? 'Multi Dealer' : params.type === 'dealer' ? 'Dealer' : 'Seller'}`,
    description: 'Membresía custom asignable solo por admin en AutoDealersOnline.',
    metadata: {
      managedBy: 'autodealers',
      adminAssignOnly: 'true',
      customMembership: 'true',
      type: params.type,
      planKind,
      ...(params.membershipId ? { membershipId: params.membershipId } : {}),
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(params.price * 100),
    currency: params.currency.toLowerCase(),
    recurring: {
      interval: params.billingCycle === 'monthly' ? 'month' : 'year',
    },
    metadata: {
      managedBy: 'autodealers',
      adminAssignOnly: 'true',
      customMembership: 'true',
      type: params.type,
      planKind,
      ...(params.membershipId ? { membershipId: params.membershipId } : {}),
    },
  });

  return { stripeProductId: product.id, stripePriceId: price.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const snap = await db.collection('memberships').get();
    let memberships = snap.docs
      .map((doc) => serializeFirestoreDoc(doc))
      .filter((m) => {
        const features = m.features as Record<string, unknown> | undefined;
        return features?.adminAssignOnly === true || features?.customMembership === true;
      });

    if (type === 'dealer' || type === 'seller') {
      memberships = memberships.filter((m) => m.type === type);
    }

    memberships.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return NextResponse.json({ memberships });
  } catch (error) {
    console.error('custom memberships GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const type = assertType(body.type);
    const planKind = assertPlanKind(body.planKind, type);
    if (planKind === 'multi_dealer' && type !== 'dealer') {
      return NextResponse.json(
        { error: 'Multi Dealer debe guardarse como tipo dealer.' },
        { status: 400 }
      );
    }
    const billingCycle = assertBillingCycle(body.billingCycle || 'monthly');
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: 'El precio debe ser mayor de 0 para sincronizar con Stripe.' },
        { status: 400 }
      );
    }

    const currency = String(body.currency || 'USD').trim().toUpperCase();
    const features = normalizeFeatures(body.features, type, planKind);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = db.collection('memberships').doc();

    const stripeIds = await createStripePrice({
      name,
      type,
      planKind,
      price,
      currency,
      billingCycle,
      membershipId: ref.id,
    });

    await ref.set({
      id: ref.id,
      name,
      type,
      customMembershipKind: planKind,
      price,
      currency,
      billingCycle,
      features,
      stripeProductId: stripeIds.stripeProductId,
      stripePriceId: stripeIds.stripePriceId,
      isActive: body.isActive !== false,
      createdByAdminId: auth.userId,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
      syncVersion: 1,
    });

    await db.collection('custom_membership_audit').add({
      action: 'created',
      membershipId: ref.id,
      adminUserId: auth.userId,
      createdAt: now,
      after: { name, type, planKind, price, currency, billingCycle, features, ...stripeIds },
    });

    const doc = await ref.get();
    return NextResponse.json({ membership: serializeFirestoreDoc(doc) }, { status: 201 });
  } catch (error) {
    console.error('custom memberships POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Membership ID requerido' }, { status: 400 });

    const ref = db.collection('memberships').doc(id);
    const before = await ref.get();
    if (!before.exists) {
      return NextResponse.json({ error: 'Membresía no encontrada' }, { status: 404 });
    }
    const beforeData = before.data() || {};
    const beforeFeatures = beforeData.features as Record<string, unknown> | undefined;
    if (beforeFeatures?.adminAssignOnly !== true && beforeFeatures?.customMembership !== true) {
      return NextResponse.json(
        { error: 'Esta ruta solo edita membresías custom.' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncVersion: admin.firestore.FieldValue.increment(1),
    };

    if (typeof body.name === 'string') updates.name = body.name.trim();
    let nextPlanKind: CustomMembershipKind | undefined;
    if (body.type) updates.type = assertType(body.type);
    if (body.planKind) {
      nextPlanKind = assertPlanKind(body.planKind, (updates.type as MembershipType | undefined) || (beforeData.type as MembershipType));
      updates.customMembershipKind = nextPlanKind;
    }
    if (nextPlanKind === 'multi_dealer' && ((updates.type as MembershipType | undefined) || beforeData.type) !== 'dealer') {
      return NextResponse.json(
        { error: 'Multi Dealer debe guardarse como tipo dealer.' },
        { status: 400 }
      );
    }
    if (body.billingCycle) updates.billingCycle = assertBillingCycle(body.billingCycle);
    if (body.currency) updates.currency = String(body.currency).trim().toUpperCase();
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
      }
      updates.price = price;
    }
    if (body.isActive !== undefined) updates.isActive = body.isActive !== false;
    if (body.features !== undefined) {
      const nextType = (updates.type as MembershipType | undefined) || (beforeData.type as MembershipType);
      const resolvedPlanKind =
        nextPlanKind ||
        ((body.features as Record<string, unknown> | undefined)?.customMembershipKind as CustomMembershipKind | undefined) ||
        (beforeData.customMembershipKind as CustomMembershipKind | undefined);
      updates.features = normalizeFeatures(body.features, nextType, resolvedPlanKind);
    }

    const priceChanged =
      updates.price !== undefined ||
      updates.currency !== undefined ||
      updates.billingCycle !== undefined;
    if (priceChanged) {
      const next = {
        name: String(updates.name || beforeData.name || '').trim(),
        type: ((updates.type as MembershipType | undefined) || beforeData.type) as MembershipType,
        planKind:
          ((updates.customMembershipKind as CustomMembershipKind | undefined) ||
            (beforeData.customMembershipKind as CustomMembershipKind | undefined) ||
            ((beforeData.features as Record<string, unknown> | undefined)?.customMembershipKind as CustomMembershipKind | undefined)),
        price: Number(updates.price ?? beforeData.price),
        currency: String(updates.currency || beforeData.currency || 'USD'),
        billingCycle: ((updates.billingCycle as BillingCycle | undefined) ||
          beforeData.billingCycle ||
          'monthly') as BillingCycle,
      };
      const stripeIds = await createStripePrice({
        ...next,
        membershipId: id,
      });
      updates.stripeProductId = stripeIds.stripeProductId;
      updates.stripePriceId = stripeIds.stripePriceId;
      updates.lastSyncedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.update(updates);
    await db.collection('custom_membership_audit').add({
      action: 'updated',
      membershipId: id,
      adminUserId: auth.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      before: serializeFirestoreDoc(before),
      after: updates,
    });

    const doc = await ref.get();
    return NextResponse.json({ membership: serializeFirestoreDoc(doc) });
  } catch (error) {
    console.error('custom memberships PUT:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
