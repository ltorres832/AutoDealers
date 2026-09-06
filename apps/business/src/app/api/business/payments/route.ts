import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { getAppOrigin } from '@/lib/app-origin';
import {
  submitPaymentApplication,
  recordPaymentAgreementAcceptance,
  getPaymentCapability,
  createOrReuseInvoicePaymentLink,
  listLedgerEntries,
  getAutomotiveBusinessById,
  getLatestPaymentApplicationForTenant,
  createTenantConnectOnboardingLink,
  getTenantConnectStatus,
  buildPaymentsAgreementText,
  PAYMENTS_AGREEMENT_TITLE,
  PAYMENTS_AGREEMENT_VERSION,
  displayPaymentStatus,
  PAYMENT_STATUS_LABELS,
  paymentLinkPublicUrl,
  getPlatformPaymentMethodCatalog,
  isPaymentAgreementAccepted,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const [capability, ledger, application, connect] = await Promise.all([
    getPaymentCapability(auth.tenantId),
    listLedgerEntries(auth.tenantId),
    getLatestPaymentApplicationForTenant(auth.tenantId),
    getTenantConnectStatus(auth.tenantId).catch(() => null),
  ]);
  const catalog = await getPlatformPaymentMethodCatalog(capability);
  const displayStatus = displayPaymentStatus(capability);
  const agreementAccepted = isPaymentAgreementAccepted(application);
  return NextResponse.json({
    capability,
    application,
    ledger,
    fees: catalog.fees,
    feeLabels: catalog.feeLabels,
    platformMethods: catalog.methods.filter((method) => method.flagEnabled),
    displayStatus,
    displayLabel: PAYMENT_STATUS_LABELS[displayStatus],
    agreement: {
      title: PAYMENTS_AGREEMENT_TITLE,
      text: buildPaymentsAgreementText(catalog.fees),
      version: PAYMENTS_AGREEMENT_VERSION,
    },
    agreementAccepted,
    connect: {
      ready: Boolean(connect?.chargesEnabled && connect?.payoutsEnabled),
      onboardingComplete: Boolean(connect?.onboardingComplete),
      chargesEnabled: Boolean(connect?.chargesEnabled),
      payoutsEnabled: Boolean(connect?.payoutsEnabled),
    },
    bnpl: {
      klarna: Boolean(catalog.flags.klarna && capability.klarna),
      affirm: Boolean(catalog.flags.affirm && capability.affirm),
      available: Boolean((catalog.flags.klarna && capability.klarna) || (catalog.flags.affirm && capability.affirm)),
      flags: catalog.flags,
      note:
        capability.card && (catalog.flags.klarna || catalog.flags.affirm)
          ? 'Klarna y Affirm aparecen en el enlace de pago del cliente solo si este negocio ya tiene cobros activos.'
          : 'Klarna y Affirm son métodos de la plataforma. El cliente los ve cuando los cobros están aprobados y Stripe Connect está listo.',
    },
    canCollectOnInvoices: Boolean(capability.card),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'connect') {
    const capability = await getPaymentCapability(auth.tenantId);
    if (!['approved', 'active'].includes(capability.status)) {
      return NextResponse.json(
        { error: 'Primero solicita cobros y espera la aprobación del administrador.' },
        { status: 400 }
      );
    }
    const origin = getAppOrigin(request);
    const link = await createTenantConnectOnboardingLink(
      auth.tenantId,
      `${origin}/dashboard/payments?connect=refresh`,
      `${origin}/dashboard/payments?connect=return`
    );
    return NextResponse.json({
      ...link,
      message: 'Te llevamos a Stripe para activar los depósitos. Luego vuelves aquí.',
    });
  }

  if (body.action === 'accept_agreement') {
    try {
      const application = await recordPaymentAgreementAcceptance({
        tenantId: auth.tenantId,
        notes: body.notes,
      });
      return NextResponse.json({ application, accepted: true });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'No se pudo registrar el acuerdo' }, { status: 400 });
    }
  }

  if (body.action === 'link') {
    const link = await createOrReuseInvoicePaymentLink({
      tenantId: auth.tenantId,
      invoiceId: String(body.invoiceId || ''),
      amountCents: Number(body.amountCents) || 0,
      description: String(body.description || 'Pago de servicio'),
    });
    return NextResponse.json({ link, url: paymentLinkPublicUrl(link.token) });
  }

  try {
    const business = await getAutomotiveBusinessById(auth.tenantId);
    const application = await submitPaymentApplication({
      tenantId: auth.tenantId,
      userId: auth.userId,
      businessName: business?.name || 'Negocio',
      acceptAgreement: body.acceptAgreement === true,
      notes: body.notes,
    });
    return NextResponse.json({ application });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo enviar la solicitud' }, { status: 400 });
  }
}
