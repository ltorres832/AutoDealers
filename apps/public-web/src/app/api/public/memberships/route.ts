export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkMultiDealerAccess } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import { getMemberships } from '@autodealers/billing';
import { getMembershipTrialDays } from '@autodealers/billing/membership-trial';
import { isMultiDealerPlan } from '@/lib/membership-flags';

export async function GET(request: NextRequest) {
  const db = getFirestore();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'dealer' | 'seller' | null;
  const userId = searchParams.get('userId');
  const showMultiDealer = searchParams.get('showMultiDealer') === 'true';

  try {
    const allMemberships = await getMemberships(type || undefined);
    const memberships = allMemberships.filter((m) => m.isActive !== false);
    const filteredMemberships: typeof memberships = [];

    for (const membership of memberships) {
      const isMultiDealer = isMultiDealerPlan(membership.features);

      if (!isMultiDealer) {
        filteredMemberships.push(membership);
        continue;
      }

      if (showMultiDealer) {
        filteredMemberships.push(membership);
      } else if (userId) {
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

    return NextResponse.json({
      memberships: filteredMemberships,
      total: filteredMemberships.length,
      trialDays: getMembershipTrialDays(),
    });
  } catch (error: unknown) {
    console.error('Error fetching memberships:', error);
    const message = error instanceof Error ? error.message : 'Error al obtener membresías';
    return NextResponse.json({ error: message, memberships: [] }, { status: 500 });
  }
}
