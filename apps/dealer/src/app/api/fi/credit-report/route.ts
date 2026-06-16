export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { getFirestore } from '@autodealers/core';
import { pullCreditReport } from '@autodealers/crm';

const db = getFirestore();

async function getFIClientById(tenantId: string, clientId: string) {
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .get();

  if (!clientDoc.exists) return null;
  const data = clientDoc.data();
  return { id: clientDoc.id, ...data };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fiGate = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const body = await request.json();
    const { clientId, provider } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const client = await getFIClientById(auth.tenantId, clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientAny = client as Record<string, unknown>;
    const personal = (clientAny.personalInfo as Record<string, unknown>) || {};
    const clientData = {
      firstName: String(personal.firstName || String(clientAny.name || '').split(' ')[0] || ''),
      lastName: String(
        personal.lastName || String(clientAny.name || '').split(' ').slice(1).join(' ') || ''
      ),
      dateOfBirth: String(personal.dateOfBirth || ''),
      ssn: personal.ssn ? String(personal.ssn) : undefined,
      address: personal.address ? String(personal.address) : undefined,
      city: personal.city ? String(personal.city) : undefined,
      state: personal.state ? String(personal.state) : undefined,
      zipCode: personal.zipCode ? String(personal.zipCode) : undefined,
    };

    const creditReport = await pullCreditReport(
      auth.tenantId,
      clientId,
      clientData,
      provider
    );

    if (!creditReport) {
      return NextResponse.json({ error: 'Failed to retrieve credit report' }, { status: 500 });
    }

    return NextResponse.json({
      creditReport: {
        ...creditReport,
        reportDate: creditReport.reportDate.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching credit report:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
