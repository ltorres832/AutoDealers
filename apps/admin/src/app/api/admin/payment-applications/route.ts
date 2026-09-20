import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  listPaymentApplications,
  reviewPaymentApplication,
  getPlatformPaymentFees,
  updatePlatformPaymentFees,
  buildPaymentsAgreementText,
  PAYMENTS_AGREEMENT_TITLE,
  PAYMENTS_AGREEMENT_VERSION,
  getPlatformPaymentMethodCatalog,
  isPaymentAgreementAccepted,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [applications, fees, catalog] = await Promise.all([
    listPaymentApplications(),
    getPlatformPaymentFees(),
    getPlatformPaymentMethodCatalog(),
  ]);
  return NextResponse.json({
    applications: applications.map((application) => ({
      ...application,
      accepted: isPaymentAgreementAccepted(application),
      acceptedAgreement: isPaymentAgreementAccepted(application),
    })),
    fees,
    feeLabels: catalog.feeLabels,
    platformMethods: catalog.methods.filter((method) => method.flagEnabled),
    agreement: {
      title: PAYMENTS_AGREEMENT_TITLE,
      text: buildPaymentsAgreementText(fees),
      version: PAYMENTS_AGREEMENT_VERSION,
    },
    bnplNote: 'Klarna y Affirm son métodos de la plataforma. El cliente los ve solo si el negocio tiene cobros activos.',
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  if (body.fees) {
    const fees = await updatePlatformPaymentFees(body.fees);
    return NextResponse.json({ fees });
  }
  if (!body.applicationId || !body.status) {
    return NextResponse.json({ error: 'applicationId y status requeridos' }, { status: 400 });
  }
  try {
    await reviewPaymentApplication(String(body.applicationId), body.status, body.notes);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo actualizar la solicitud' }, { status: 400 });
  }
}
