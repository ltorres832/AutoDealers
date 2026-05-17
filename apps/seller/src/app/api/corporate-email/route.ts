import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import {
  canCreateCorporateEmail,
  createCorporateEmail,
  getCorporateEmails,
  getCorporateEmailUsage,
} from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailGateGet = await requireTenantFeature(auth.tenantId, 'useCorporateEmail');
    if (emailGateGet) return emailGateGet;

    const emails = await getCorporateEmails(auth.userId, auth.tenantId);

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error('Error getting corporate emails:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailAlias } = body;

    if (!emailAlias || typeof emailAlias !== 'string') {
      return NextResponse.json(
        { error: 'emailAlias es requerido' },
        { status: 400 }
      );
    }

    const emailGate = await requireTenantFeature(auth.tenantId, 'useCorporateEmail');
    if (emailGate) return emailGate;

    // Crear email corporativo
    const email = await createCorporateEmail(
      auth.userId,
      auth.tenantId,
      emailAlias,
      'user'
    );

    return NextResponse.json({ email }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating corporate email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint para verificar límites
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailGatePut = await requireTenantFeature(auth.tenantId, 'useCorporateEmail');
    if (emailGatePut) return emailGatePut;

    const [usage, quota] = await Promise.all([
      getCorporateEmailUsage(auth.tenantId),
      canCreateCorporateEmail(auth.userId, auth.tenantId),
    ]);

    return NextResponse.json({
      usage,
      canCreate: quota.allowed,
      limit: quota.limit ?? usage.emailsLimit,
      used: quota.used ?? usage.emailsUsed,
      reason: quota.reason,
    });
  } catch (error: any) {
    console.error('Error getting email usage:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


