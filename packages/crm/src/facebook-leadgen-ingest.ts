import type { Firestore } from 'firebase-admin/firestore';
import {
  mapMetaLeadFieldDataToLeadForm,
  formatMetaLeadNotes,
  createNotification,
} from '@autodealers/core';
import { createLead, findLeadByMetaLeadGenId, updateLead, assignLead } from './leads';
import { resolveSellerOwnedForUserId } from './seller-owned-leads';

export type FacebookLeadgenIngestResult =
  | { ok: true; leadId: string; duplicate?: boolean }
  | { ok: false; error: string };

/**
 * Procesa webhooks de Meta Lead Ads (`changes[].field === "leadgen"`).
 * Misma lógica que el webhook de Next.js admin; usar aquí y en Cloud Functions.
 */
export async function ingestFacebookLeadgenWebhook(
  body: Record<string, unknown>,
  db: Firestore
): Promise<FacebookLeadgenIngestResult> {
  const entry = body.entry as Record<string, unknown> | undefined;
  const changes = entry?.changes as Array<{ field?: string; value?: Record<string, unknown> }> | undefined;
  const change = Array.isArray(changes) ? changes.find((c) => c.field === 'leadgen') : undefined;
  const value = change?.value;
  const leadgenId = value?.leadgen_id;
  if (!leadgenId) {
    return { ok: false, error: 'No leadgen_id' };
  }

  const pageId = String(value?.page_id || entry?.id || '');
  if (!pageId) {
    return { ok: false, error: 'No page ID' };
  }

  let tenantId: string | null = null;
  let leadOwnerUserId: string | undefined;
  let fbIntegrationData: Record<string, unknown> | null = null;

  const fbIntSnap = await db
    .collectionGroup('integrations')
    .where('type', '==', 'facebook')
    .where('credentials.pageId', '==', pageId)
    .limit(1)
    .get();

  if (!fbIntSnap.empty) {
    const fbDoc = fbIntSnap.docs[0];
    tenantId = fbDoc.ref.parent.parent?.id ?? null;
    fbIntegrationData = fbDoc.data() as Record<string, unknown>;
    const lo = fbIntegrationData?.leadOwnerUserId;
    if (typeof lo === 'string' && lo.trim()) {
      leadOwnerUserId = lo.trim();
    }
  }

  if (!tenantId) {
    const tenantsSnapshot = await db
      .collection('tenants')
      .where('settings.facebook.pageId', '==', pageId)
      .limit(1)
      .get();
    if (!tenantsSnapshot.empty) {
      tenantId = tenantsSnapshot.docs[0].id;
    }
  }

  if (!tenantId) {
    const activeTenants = await db
      .collection('tenants')
      .where('status', '==', 'active')
      .limit(1)
      .get();
    if (!activeTenants.empty) {
      tenantId = activeTenants.docs[0].id;
      console.warn(`Leadgen: tenant fallback para página ${pageId}`);
    } else {
      return { ok: false, error: 'No tenant found' };
    }
  }

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const tenantData = tenantDoc.data();
  const facebookConfig = tenantData?.settings?.facebook as Record<string, unknown> | undefined;

  const creds = (fbIntegrationData?.credentials || {}) as Record<string, unknown>;
  const intToken = creds.accessToken as string | undefined;
  const intActive =
    fbIntegrationData?.status === 'active' && typeof intToken === 'string' && intToken.length > 0;
  const tenantToken =
    typeof facebookConfig?.accessToken === 'string' ? facebookConfig.accessToken : undefined;
  const tenantEnabled = facebookConfig?.enabled === true;

  if (!intActive && (!tenantEnabled || !tenantToken)) {
    return { ok: false, error: 'Facebook not configured' };
  }

  const accessToken = intToken || tenantToken;
  if (!accessToken) {
    return { ok: false, error: 'Facebook access token not found' };
  }

  const graphUrl = `https://graph.facebook.com/v18.0/${encodeURIComponent(
    String(leadgenId)
  )}?fields=field_data,created_time,form_id&access_token=${encodeURIComponent(accessToken)}`;
  const graphRes = await fetch(graphUrl);
  const graphJson = (await graphRes.json()) as {
    field_data?: { name: string; values?: string[] }[];
    form_id?: string;
    error?: { message?: string };
  };
  if (!graphRes.ok) {
    console.error('Meta lead fetch failed', graphJson);
    return { ok: false, error: graphJson.error?.message || 'graph_error' };
  }

  const mapped = mapMetaLeadFieldDataToLeadForm(graphJson.field_data, {
    leadgenId: String(leadgenId),
  });
  const notes = formatMetaLeadNotes(mapped, {
    formId: String(value?.form_id || graphJson.form_id || ''),
    adId: String(value?.ad_id || ''),
  });

  const existing = await findLeadByMetaLeadGenId(tenantId, String(leadgenId));
  if (existing) {
    const prevCity = (existing.contact as { city?: string }).city;
    const nextEmail =
      mapped.email && mapped.email.trim()
        ? mapped.email
        : existing.contact.email || '';
    const nextCity =
      mapped.city && mapped.city.trim() ? mapped.city : prevCity || '';
    await updateLead(tenantId, existing.id, {
      contact: {
        name: mapped.name || existing.contact.name,
        email: nextEmail,
        phone: mapped.phone || existing.contact.phone,
        preferredChannel: existing.contact.preferredChannel || 'facebook',
        city: nextCity,
      },
      notes: `${existing.notes}\n\n${notes}`.trim(),
      leadFormResponses: { ...(existing.leadFormResponses || {}), ...mapped.leadFormResponses },
    } as any);
    if (leadOwnerUserId && !existing.assignedTo) {
      await assignLead(tenantId, existing.id, leadOwnerUserId);
    }
    await createNotification({
      tenantId,
      userId: leadOwnerUserId || '',
      type: 'lead_created' as any,
      title: 'Lead actualizado (Meta Lead Ads)',
      message: `${mapped.name} — datos de formulario actualizados`,
      channels: ['system'],
      metadata: { leadId: existing.id } as any,
    } as any);
    return { ok: true, leadId: existing.id, duplicate: true };
  }

  let vehicleIdFromCampaign: string | undefined;
  let vehicleInterestExtra = mapped.vehicleInterest;
  const adId = value?.ad_id;
  if (adId) {
    const camp = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ad_campaigns')
      .where('adId', '==', String(adId))
      .limit(1)
      .get();
    if (!camp.empty) {
      const cd = camp.docs[0].data() as Record<string, unknown>;
      if (cd.vehicleId) {
        vehicleIdFromCampaign = String(cd.vehicleId);
      }
      if (!vehicleInterestExtra && cd.name) {
        vehicleInterestExtra = String(cd.name);
      }
    }
  }

  const owned = await resolveSellerOwnedForUserId(leadOwnerUserId);

  const lead = await createLead(
    tenantId,
    'facebook',
    {
      name: mapped.name,
      email: mapped.email,
      phone: mapped.phone,
      preferredChannel: 'facebook',
      city: mapped.city,
    },
    notes,
    {
      assignedTo: leadOwnerUserId,
      ...(owned.sellerOwned
        ? {
            sellerOwned: true,
            createdBy: owned.assignedTo,
            tags: ['vendedor_propio', 'meta_lead_ads'],
          }
        : {}),
      vehicleInterest: vehicleInterestExtra,
      vehicleId: vehicleIdFromCampaign,
      leadFormResponses: mapped.leadFormResponses,
      metaLeadGenId: String(leadgenId),
      metaFormId: String(value?.form_id || graphJson.form_id || ''),
      metaAdId: String(value?.ad_id || ''),
      populateStandardContactFields: true,
    }
  );

  await createNotification({
    tenantId,
    userId: leadOwnerUserId || '',
    type: 'lead_created' as any,
    title: 'Nuevo lead desde anuncio (Meta)',
    message: `${mapped.name} · ${mapped.phone}${mapped.email ? ` · ${mapped.email}` : ''}${
      mapped.city ? ` · ${mapped.city}` : ''
    }`,
    channels: ['system'],
    metadata: { leadId: lead.id } as any,
  } as any);

  return { ok: true, leadId: lead.id };
}
