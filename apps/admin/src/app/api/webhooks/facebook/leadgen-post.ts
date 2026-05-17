import { NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { ingestFacebookLeadgenWebhook } from '@autodealers/crm';

/**
 * Procesa webhooks de Meta Lead Ads — delega en `@autodealers/crm` (misma lógica que Cloud Functions).
 */
export async function processFacebookLeadgenFromBody(
  body: Record<string, unknown>,
  db: Firestore
): Promise<NextResponse> {
  const result = await ingestFacebookLeadgenWebhook(body, db);
  if (result.ok === false) {
    return NextResponse.json({ received: true, error: result.error });
  }
  return NextResponse.json({
    received: true,
    leadId: result.leadId,
    ...(result.duplicate ? { duplicate: true } : {}),
  });
}
