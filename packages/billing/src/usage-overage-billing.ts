// Facturación automática de excesos de uso.
// Agrupa cargos pendientes del ledger, crea una factura en Stripe,
// la cobra automáticamente y guarda la evidencia en la cuenta del tenant.

import { getFirestore } from '@autodealers/shared';
import { getSubscriptionByTenantId } from './subscription-management';
import {
  getUsageCharges,
  updateOverageChargeStatus,
  type UsageOverageCharge,
} from './usage-metering';

function getDb() {
  return getFirestore();
}

export interface OverageInvoiceResult {
  tenantId: string;
  invoiced: boolean;
  stripeInvoiceId?: string;
  totalUsd?: number;
  chargeCount?: number;
  error?: string;
}

/**
 * Factura todos los cargos pendientes de exceso de un tenant en una sola factura Stripe.
 * La factura se cobra automáticamente al método de pago guardado y se envía por email.
 */
export async function invoicePendingOverages(tenantId: string): Promise<OverageInvoiceResult> {
  const pending = (await getUsageCharges(tenantId, { limit: 200 })).filter(
    (c) => c.status === 'pending'
  );
  if (!pending.length) {
    return { tenantId, invoiced: false, chargeCount: 0 };
  }

  const subscription = await getSubscriptionByTenantId(tenantId);
  const customerId = subscription?.stripeCustomerId?.trim();
  if (!customerId) {
    return { tenantId, invoiced: false, error: 'Tenant sin cliente de Stripe' };
  }

  try {
    const core: any = await import('@autodealers/core');
    const stripe = await core.getStripeInstance();

    // Crear invoice items por cada cargo
    for (const charge of pending) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(charge.totalUsd * 100),
        currency: 'usd',
        description: charge.description,
        metadata: {
          tenantId,
          usageChargeId: charge.id,
          metric: charge.metric,
          period: charge.period,
        },
      });
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'charge_automatically',
      auto_advance: true,
      description: 'Cargos por uso adicional — AutoDealers',
      metadata: { tenantId, type: 'usage_overage' },
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    const totalUsd = pending.reduce((sum, c) => sum + c.totalUsd, 0);
    await Promise.all(
      pending.map((c) =>
        updateOverageChargeStatus(tenantId, c.id, {
          status: 'invoiced',
          stripeInvoiceId: finalized.id,
          stripeInvoiceUrl: finalized.hosted_invoice_url || undefined,
        })
      )
    );

    // Evidencia en la cuenta del tenant (record de pagos de la plataforma)
    await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('receipts')
      .doc(finalized.id)
      .set(
        JSON.parse(
          JSON.stringify({
            id: finalized.id,
            type: 'usage_overage',
            description: 'Cargos por uso adicional',
            amount: Math.round(totalUsd * 100) / 100,
            currency: 'usd',
            stripeInvoiceId: finalized.id,
            stripeInvoiceUrl: finalized.hosted_invoice_url || null,
            status: finalized.status,
            charges: pending.map((c: UsageOverageCharge) => ({
              id: c.id,
              metric: c.metric,
              units: c.units,
              unitPriceUsd: c.unitPriceUsd,
              totalUsd: c.totalUsd,
              period: c.period,
            })),
            createdAt: new Date(),
          })
        ),
        { merge: true }
      );

    return {
      tenantId,
      invoiced: true,
      stripeInvoiceId: finalized.id,
      totalUsd,
      chargeCount: pending.length,
    };
  } catch (error: any) {
    console.error(`[billing] Error facturando excesos de ${tenantId}:`, error);
    return { tenantId, invoiced: false, error: error?.message || 'Error desconocido' };
  }
}

/**
 * Job periódico: busca tenants con cargos pendientes y los factura.
 * Se ejecuta desde un cron (functions o API route con autorización).
 */
export async function processAllPendingOverages(limit = 50): Promise<OverageInvoiceResult[]> {
  const snap = await getDb()
    .collectionGroup('usage_charges')
    .where('status', '==', 'pending')
    .limit(500)
    .get();

  const allIds: string[] = snap.docs
    .map((d) => (d.data() as any).tenantId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  const tenantIds = Array.from(new Set(allIds)).slice(0, limit);

  const results: OverageInvoiceResult[] = [];
  for (const tenantId of tenantIds) {
    results.push(await invoicePendingOverages(tenantId));
  }
  return results;
}

/** Marca facturas de exceso pagadas desde el webhook de Stripe (invoice.paid). */
export async function markOverageInvoicePaid(tenantId: string, stripeInvoiceId: string): Promise<void> {
  const charges = await getUsageCharges(tenantId, { limit: 200 });
  const related = charges.filter((c) => c.stripeInvoiceId === stripeInvoiceId);
  await Promise.all(
    related.map((c) => updateOverageChargeStatus(tenantId, c.id, { status: 'paid' }))
  );
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('receipts')
    .doc(stripeInvoiceId)
    .set({ status: 'paid', paidAt: new Date() }, { merge: true });
}
