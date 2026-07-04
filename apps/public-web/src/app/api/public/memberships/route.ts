export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkMultiDealerAccess } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import { getSelfServiceActiveMemberships } from '@autodealers/billing';
import { serializeMembershipForApi } from '@autodealers/billing/membership-coerce';
import { getMembershipTrialDays } from '@autodealers/billing/membership-trial';
import { getActiveDynamicFeatureCatalog } from '@autodealers/billing/dynamic-feature-catalog';
import { isMultiDealerPlan } from '@/lib/membership-flags';

export async function GET(request: NextRequest) {
  const db = getFirestore();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'dealer' | 'seller' | null;
  const userId = searchParams.get('userId');
  const showMultiDealer = searchParams.get('showMultiDealer') === 'true';

  try {
    const memberships = await getSelfServiceActiveMemberships(type || undefined);
    const filteredMemberships: typeof memberships = [];

    for (const membership of memberships) {
      const isMultiDealer = isMultiDealerPlan(membership.features);

      if (!isMultiDealer) {
        filteredMemberships.push(membership);
        continue;
      }

      // Multi-dealer: solo si admin aprobó una solicitud concreta (no autoservicio en registro).
      if (showMultiDealer) {
        continue;
      }
      if (userId) {
        const access = await checkMultiDealerAccess(userId);
        if (access.hasAccess && !access.isExpired) {
          const requestDoc = await db.collection('multi_dealer_requests').doc(userId).get();
          if (requestDoc.exists) {
            const request = requestDoc.data();
            if (request?.membershipId === membership.id) {
              filteredMemberships.push(membership);
            }
          }
        }
      }
    }

    const dynamicFeatureCatalog = await getActiveDynamicFeatureCatalog();

    return NextResponse.json({
      memberships: filteredMemberships.map((m) =>
        serializeMembershipForApi(m as unknown as Record<string, unknown> & { id: string })
      ),
      total: filteredMemberships.length,
      trialDays: getMembershipTrialDays(),
      dynamicFeatureCatalog,
    });
  } catch (error: unknown) {
    console.error('Error fetching memberships:', error);
    const message = error instanceof Error ? error.message : 'Error al obtener membresías';
    return NextResponse.json({ error: message, memberships: [] }, { status: 500 });
  }
}
