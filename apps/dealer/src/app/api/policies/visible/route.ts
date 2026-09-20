export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getVisiblePoliciesForAudience, type PolicyAudience } from '@autodealers/core';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { isDealerPortalRole, isSellerRole } from '@/lib/dealer-portal-roles';

function normalizePolicyType(type: string): string {
  if (type === 'cookie') return 'cookies';
  if (type === 'refund') return 'returns';
  return type || 'custom';
}

function normalizeBrandText(value: unknown): string {
  return String(value || '')
    .replace(/AUTODEALERS ONLINE/g, 'AutoDealersOnline')
    .replace(/AutoDealers Online/g, 'AutoDealersOnline')
    .replace(/AutoDealers(?!Online)/g, 'AutoDealersOnline');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let role: PolicyAudience;
    if (isDealerPortalRole(auth.role)) {
      role = 'dealer';
    } else if (isSellerRole(auth.role)) {
      role = 'seller';
    } else {
      return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 });
    }
    const tenantId = auth.tenantId;

    const { searchParams } = new URL(request.url);
    const language = (searchParams.get('language') || 'es') as 'es' | 'en';
    const policies = await getVisiblePoliciesForAudience(role, tenantId, language);

    return NextResponse.json({
      policies: policies.map((policy) => ({
        id: policy.id,
        type: normalizePolicyType(policy.type),
        title: normalizeBrandText(policy.title),
        content: normalizeBrandText(policy.content),
        version: policy.version,
        language: policy.language,
        isRequired: policy.isRequired === true,
        requiresAcceptance: policy.requiresAcceptance !== false,
        applicableTo: policy.applicableTo || [],
        lastUpdated: (policy.updatedAt || policy.effectiveDate || new Date()).toISOString(),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Error fetching visible policies:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener políticas visibles' },
      { status: 500 }
    );
  }
}
