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
    const type = searchParams.get('type') as 'dealer' | 'seller' | 'business' | null;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const selfServiceOnly = searchParams.get('selfServiceOnly') === 'true';

    let memberships = await queryMembershipsFromFirestore({
      type: type ?? undefined,
      activeOnly,
    });

    if (selfServiceOnly) {
      memberships = memberships.filter((membership) => {
        const features = membership.features as Record<string, unknown> | undefined;
        return features?.adminAssignOnly !== true && features?.customMembership !== true;
      });
    }

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
    const {
      name,
      type,
      price,
      currency,
      billingCycle,
      features,
      isActive,
      createStripeProduct,
      launchPrice,
      launchEndsAt,
      introPrice,
      introMonths,
    } = body;

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
    let stripeProductId = body.stripeProductId || '';
    let launchStripePriceId = '';
    let introStripePriceId = '';

    const shouldCreateStripe = createStripeProduct !== false && Number(price) > 0;
    if (shouldCreateStripe) {
      try {
        const { getStripeInstance } = await import('@autodealers/core');
        const { createMembershipStripePrice } = await import('@autodealers/billing');
        const stripe = await getStripeInstance();

        const regular = await createMembershipStripePrice({
          stripe: stripe as any,
          name,
          type,
          price: Number(price),
          currency,
          billingCycle,
          kind: 'regular',
        });
        stripePriceId = regular.stripePriceId;
        stripeProductId = regular.stripeProductId;

        const launchAmt = Number(launchPrice) || 0;
        if (launchAmt > 0 && launchEndsAt) {
          const launch = await createMembershipStripePrice({
            stripe: stripe as any,
            name: `${name} Launch`,
            type,
            price: launchAmt,
            currency,
            billingCycle,
            kind: 'launch',
            existingProductId: stripeProductId,
          });
          launchStripePriceId = launch.stripePriceId;
        }

        const introAmt = Number(introPrice) || 0;
        const introN = Math.floor(Number(introMonths) || 0);
        if (introAmt > 0 && introN >= 1) {
          const intro = await createMembershipStripePrice({
            stripe: stripe as any,
            name: `${name} Intro`,
            type,
            price: introAmt,
            currency,
            billingCycle,
            kind: 'intro',
            existingProductId: stripeProductId,
          });
          introStripePriceId = intro.stripePriceId;
        }
      } catch (stripeError) {
        const message =
          stripeError instanceof Error ? stripeError.message : 'Error creando precio en Stripe';
        console.error('Error creando producto en Stripe:', stripeError);
        return NextResponse.json(
          {
            error:
              'No se pudo crear el Price en Stripe. El plan no se guardó para evitar un checkout roto.',
            details: message,
          },
          { status: 502 }
        );
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
      stripeProductId: stripeProductId || undefined,
      isActive: isActive !== undefined ? isActive : true,
      ...(launchStripePriceId
        ? {
            launchPrice: Number(launchPrice),
            launchEndsAt: launchEndsAt ? new Date(launchEndsAt) : undefined,
            launchStripePriceId,
          }
        : {}),
      ...(introStripePriceId
        ? {
            introPrice: Number(introPrice),
            introMonths: Math.floor(Number(introMonths) || 0),
            introStripePriceId,
          }
        : {}),
    });

    return NextResponse.json(
      {
        membership,
        stripeCreated: !!stripePriceId && shouldCreateStripe,
        stripePriceId: stripePriceId,
        launchStripePriceId: launchStripePriceId || undefined,
        introStripePriceId: introStripePriceId || undefined,
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
