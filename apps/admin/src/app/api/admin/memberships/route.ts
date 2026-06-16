export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createMembership, updateMembership, getMembershipById } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';
import { assertUniqueMembershipPrice } from '@/lib/membership-features-admin';
import { queryMembershipsFromFirestore } from '@/lib/query-memberships-firestore';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'dealer' | 'seller' | null;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const memberships = await queryMembershipsFromFirestore({
      type: type ?? undefined,
      activeOnly,
    });

    const membershipsWithCount = await Promise.all(
      memberships.map(async (membership) => {
        try {
          const tenantsSnap = await db
            .collection('tenants')
            .where('membershipId', '==', membership.id)
            .get();
          return { ...membership, tenantCount: tenantsSnap.size };
        } catch {
          return { ...membership, tenantCount: 0 };
        }
      })
    );

    return NextResponse.json({ memberships: membershipsWithCount });
  } catch (error) {
    console.error('Error in GET /api/admin/memberships:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, memberships: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, price, currency, billingCycle, features, isActive, createStripeProduct } = body;

    const priceDup = await assertUniqueMembershipPrice({
      db,
      type,
      currency,
      billingCycle,
      price: Number(price),
    });
    if (priceDup.ok === false) {
      return NextResponse.json(
        {
          error:
            'Ya existe un plan con el mismo precio para este tipo, moneda y ciclo. Cada membresía debe tener un precio distinto.',
          duplicateId: priceDup.duplicateId,
        },
        { status: 409 }
      );
    }

    let stripePriceId = body.stripePriceId || '';

    if (createStripeProduct && price > 0) {
      try {
        const { getStripeInstance } = await import('@autodealers/core');
        const stripe = await getStripeInstance();

        const product = await stripe.products.create({
          name: `${name} - ${type === 'dealer' ? 'Dealer' : 'Vendedor'}`,
          description: `Plan de membresía ${name} para ${type === 'dealer' ? 'dealers' : 'vendedores'}`,
          metadata: {
            type: type,
            managedBy: 'autodealers',
          },
        });

        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(price * 100),
          currency: currency.toLowerCase(),
          recurring: {
            interval: billingCycle === 'monthly' ? 'month' : 'year',
          },
        });

        stripePriceId = stripePrice.id;
      } catch (stripeError) {
        console.error('Error creando producto en Stripe:', stripeError);
      }
    }

    const validatedFeatures = {
      maxSellers: features?.maxSellers || undefined,
      maxInventory: features?.maxInventory || undefined,
      customSubdomain: features?.customSubdomain || false,
      aiEnabled: features?.aiEnabled || false,
      socialMediaEnabled: features?.socialMediaEnabled || false,
      marketplaceEnabled: features?.marketplaceEnabled || false,
      advancedReports: features?.advancedReports || false,
      ...features,
    };

    const membership = await createMembership({
      name,
      type,
      price,
      currency,
      billingCycle,
      features: validatedFeatures as any,
      stripePriceId: stripePriceId,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(
      {
        membership,
        stripeCreated: !!stripePriceId && createStripeProduct,
        stripePriceId: stripePriceId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating membership:', error);
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Membership ID required' }, { status: 400 });
    }

    await updateMembership(id, updates);

    const updated = await getMembershipById(id);
    return NextResponse.json({ membership: updated });
  } catch (error) {
    console.error('Error updating membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
