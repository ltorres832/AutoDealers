import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}
// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getTenantBySubdomain } = require('@autodealers/core') as any;

type PolicyType = 'privacy' | 'terms' | 'cookies' | 'returns' | 'warranty';

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string; type: string } }
) {
  try {
    const { subdomain, type } = params;

    // Validar tipo de política
    const validTypes: PolicyType[] = ['privacy', 'terms', 'cookies', 'returns', 'warranty'];
    if (!validTypes.includes(type as PolicyType)) {
      return NextResponse.json(
        { error: 'Invalid policy type' },
        { status: 400 }
      );
    }

    // Obtener tenant por subdominio
    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    // Obtener políticas del tenant
    // @ts-ignore - carga diferida para evitar error de tipos en build
    const { getFirestore } = require('@autodealers/core') as any;
    const db = getFirestore();
    const tenantDoc = await db.collection('tenants').doc(tenant.id).get();
    const tenantData = tenantDoc.data();
    const policies = tenantData?.policies || {};

    const policy = policies[type as PolicyType];

    if (!policy || !policy.enabled) {
      return NextResponse.json(
        { error: 'Policy not found or disabled' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      policy: {
        ...policy,
        tenantName: tenant.name,
        tenantSubdomain: tenant.subdomain,
      },
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


