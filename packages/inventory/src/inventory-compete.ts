/**
 * Servidor: share landings, photo sets, dealer site, alianzas, feeds, etiquetas DACO.
 * Aditivo — no modifica ni borra vehículos existentes.
 */

import * as admin from 'firebase-admin';
import { getFirestore } from '@autodealers/shared';
import { getVehicleById, getVehicles } from './vehicles';
import {
  PHOTO_GUIDE_ANGLES,
  DEFAULT_DACO_FOOTER_NOTE,
  DEFAULT_DACO_WARRANTY_NOTE,
  buildQrImageUrl,
  buildVehicleSharePath,
  type DacoLabelSettings,
  type DealerSiteConfig,
  type DealerSiteTemplateId,
  type InventoryAlliance,
  type InventoryFeedJob,
  type VehiclePhotoSlot,
} from './inventory-compete-constants';

function normalizeServices(input: unknown): string[] | undefined {
  if (Array.isArray(input)) {
    const list = input.map((s) => String(s).trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  if (typeof input === 'string') {
    const list = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function db() {
  return getFirestore();
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function slugify(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

// ---------------------------------------------------------------------------
// Photo sets (original siempre se conserva)
// ---------------------------------------------------------------------------

export async function getVehiclePhotoSet(
  tenantId: string,
  vehicleId: string
): Promise<{ slots: VehiclePhotoSlot[] }> {
  const ref = db()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicle_photo_sets')
    .doc(vehicleId);
  const snap = await ref.get();
  if (!snap.exists) {
    // Sembrar desde fotos existentes del vehículo (solo lectura, no borra)
    const vehicle = await getVehicleById(tenantId, vehicleId);
    const photos = Array.isArray(vehicle?.photos) ? vehicle!.photos : [];
    const slots: VehiclePhotoSlot[] = photos.map((url, i) => ({
      angleId: PHOTO_GUIDE_ANGLES[i]?.id || `extra_${i}`,
      originalUrl: url,
      editedUrl: null,
      sceneId: null,
    }));
    return { slots };
  }
  const data = snap.data() || {};
  return { slots: Array.isArray(data.slots) ? (data.slots as VehiclePhotoSlot[]) : [] };
}

export async function upsertVehiclePhotoSlot(input: {
  tenantId: string;
  vehicleId: string;
  angleId: string;
  originalUrl: string;
  editedUrl?: string | null;
  sceneId?: string | null;
  /** Si true, también agrega originalUrl al array photos del vehículo (sin quitar las demás). */
  appendToVehiclePhotos?: boolean;
}): Promise<{ slots: VehiclePhotoSlot[] }> {
  const { tenantId, vehicleId, angleId, originalUrl } = input;
  if (!originalUrl?.trim()) throw new Error('La URL de la foto es requerida');

  const ref = db()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicle_photo_sets')
    .doc(vehicleId);
  const existing = await getVehiclePhotoSet(tenantId, vehicleId);
  const slots = [...existing.slots];
  const idx = slots.findIndex((s) => s.angleId === angleId);
  const next: VehiclePhotoSlot = {
    angleId,
    originalUrl: originalUrl.trim(),
    editedUrl: input.editedUrl ?? (idx >= 0 ? slots[idx].editedUrl : null) ?? null,
    sceneId: input.sceneId ?? (idx >= 0 ? slots[idx].sceneId : null) ?? null,
    createdAt: new Date().toISOString(),
  };
  if (idx >= 0) slots[idx] = { ...slots[idx], ...next };
  else slots.push(next);

  await ref.set({ slots, updatedAt: nowTs(), vehicleId, tenantId }, { merge: true });

  if (input.appendToVehiclePhotos !== false) {
    const vehicleRef = db().collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
    const vehicleSnap = await vehicleRef.get();
    if (vehicleSnap.exists) {
      const photos: string[] = Array.isArray(vehicleSnap.data()?.photos)
        ? [...vehicleSnap.data()!.photos]
        : [];
      const displayUrl = (next.editedUrl || next.originalUrl).trim();
      if (displayUrl && !photos.includes(displayUrl) && !photos.includes(next.originalUrl)) {
        photos.push(next.originalUrl);
        await vehicleRef.set({ photos, updatedAt: nowTs() }, { merge: true });
      }
    }
  }

  return { slots };
}

export async function setVehiclePhotoEdited(input: {
  tenantId: string;
  vehicleId: string;
  angleId: string;
  editedUrl: string;
  sceneId?: string | null;
}): Promise<{ slots: VehiclePhotoSlot[] }> {
  const set = await getVehiclePhotoSet(input.tenantId, input.vehicleId);
  const slot = set.slots.find((s) => s.angleId === input.angleId);
  if (!slot) throw new Error('Primero sube la foto original de ese ángulo');
  return upsertVehiclePhotoSlot({
    tenantId: input.tenantId,
    vehicleId: input.vehicleId,
    angleId: input.angleId,
    originalUrl: slot.originalUrl,
    editedUrl: input.editedUrl,
    sceneId: input.sceneId ?? null,
    appendToVehiclePhotos: false,
  });
}

// ---------------------------------------------------------------------------
// Share landing data
// ---------------------------------------------------------------------------

export async function getShareLandingPayload(tenantId: string, vehicleId: string) {
  const vehicle = await getVehicleById(tenantId, vehicleId);
  if (!vehicle || vehicle.deleted === true) return null;
  if (vehicle.status === 'hidden' && !vehicle.publishedOnPublicPage) return null;

  const tenantSnap = await db().collection('tenants').doc(tenantId).get();
  const tenant = tenantSnap.data() || {};
  const photoSet = await getVehiclePhotoSet(tenantId, vehicleId);
  const displayPhotos =
    photoSet.slots.length > 0
      ? photoSet.slots.map((s) => s.editedUrl || s.originalUrl).filter(Boolean)
      : vehicle.photos || [];

  const sharePath = buildVehicleSharePath(tenantId, vehicleId);
  return {
    vehicle: {
      id: vehicle.id,
      tenantId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      currency: vehicle.currency || 'USD',
      mileage: vehicle.mileage,
      condition: vehicle.condition,
      description: vehicle.description || '',
      vin: vehicle.vin || vehicle.specifications?.vin,
      stockNumber: vehicle.stockNumber,
      photos: displayPhotos,
      videos: vehicle.videos || [],
      status: vehicle.status,
      publishedOnPublicPage: vehicle.publishedOnPublicPage === true,
    },
    dealer: {
      id: tenantId,
      name: String(tenant.name || tenant.companyName || 'Concesionario'),
      phone: String(tenant.phone || tenant.contactPhone || ''),
      whatsapp: String(tenant.whatsapp || tenant.phone || tenant.contactPhone || ''),
      email: String(tenant.email || tenant.contactEmail || ''),
      logoUrl: String(tenant.branding?.logoUrl || tenant.logo || tenant.logoUrl || ''),
      address: String(tenant.address || ''),
    },
    sharePath,
    qrImageUrl: buildQrImageUrl(
      // relative; caller should prefix with public origin when printing
      sharePath
    ),
  };
}

// ---------------------------------------------------------------------------
// Dealer site
// ---------------------------------------------------------------------------

export async function getDealerSite(tenantId: string): Promise<DealerSiteConfig | null> {
  const snap = await db().collection('tenants').doc(tenantId).collection('settings').doc('dealer_site').get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return {
    templateId: (data.templateId || 'starter') as DealerSiteTemplateId,
    published: data.published === true,
    slug: String(data.slug || tenantId),
    headline: optionalString(data.headline),
    tagline: optionalString(data.tagline),
    phone: optionalString(data.phone),
    whatsapp: optionalString(data.whatsapp),
    email: optionalString(data.email),
    address: optionalString(data.address),
    mapUrl: optionalString(data.mapUrl),
    hours: optionalString(data.hours),
    showFinancing: data.showFinancing === true,
    showJobs: data.showJobs === true,
    primaryColor: optionalString(data.primaryColor) || '#0f172a',
    heroImageUrl: optionalString(data.heroImageUrl),
    aboutHtml: optionalString(data.aboutHtml),
    ctaLabel: optionalString(data.ctaLabel),
    ctaUrl: optionalString(data.ctaUrl),
    services: normalizeServices(data.services),
    facebookUrl: optionalString(data.facebookUrl),
    instagramUrl: optionalString(data.instagramUrl),
    youtubeUrl: optionalString(data.youtubeUrl),
    logoUrl: optionalString(data.logoUrl),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || undefined,
  };
}

export async function saveDealerSite(
  tenantId: string,
  input: Partial<DealerSiteConfig> & { templateId?: DealerSiteTemplateId }
): Promise<DealerSiteConfig> {
  const tenantSnap = await db().collection('tenants').doc(tenantId).get();
  const tenant = tenantSnap.data() || {};
  const current = (await getDealerSite(tenantId)) || {
    templateId: 'starter' as DealerSiteTemplateId,
    published: false,
    slug: slugify(String(tenant.name || tenantId)) || tenantId,
    primaryColor: '#0f172a',
  };

  let slug = String(input.slug || current.slug || tenantId).trim();
  slug = slugify(slug) || tenantId;

  // Índice global de slugs (evita collectionGroup sin índice)
  const slugRef = db().collection('dealer_site_slugs').doc(slug);
  const slugSnap = await slugRef.get();
  if (slugSnap.exists && String(slugSnap.data()?.tenantId || '') !== tenantId) {
    throw new Error('Ese slug ya está en uso. Elige otro.');
  }
  if (current.slug && current.slug !== slug) {
    await db().collection('dealer_site_slugs').doc(current.slug).delete().catch(() => undefined);
  }

  const services =
    input.services !== undefined
      ? normalizeServices(input.services) || []
      : current.services;

  const next: DealerSiteConfig = {
    ...current,
    ...input,
    templateId: (input.templateId || current.templateId || 'starter') as DealerSiteTemplateId,
    published: input.published !== undefined ? Boolean(input.published) : current.published,
    slug,
    heroImageUrl: input.heroImageUrl !== undefined ? optionalString(input.heroImageUrl) : current.heroImageUrl,
    aboutHtml: input.aboutHtml !== undefined ? optionalString(input.aboutHtml) : current.aboutHtml,
    ctaLabel: input.ctaLabel !== undefined ? optionalString(input.ctaLabel) : current.ctaLabel,
    ctaUrl: input.ctaUrl !== undefined ? optionalString(input.ctaUrl) : current.ctaUrl,
    services,
    facebookUrl: input.facebookUrl !== undefined ? optionalString(input.facebookUrl) : current.facebookUrl,
    instagramUrl: input.instagramUrl !== undefined ? optionalString(input.instagramUrl) : current.instagramUrl,
    youtubeUrl: input.youtubeUrl !== undefined ? optionalString(input.youtubeUrl) : current.youtubeUrl,
    logoUrl: input.logoUrl !== undefined ? optionalString(input.logoUrl) : current.logoUrl,
  };

  await db()
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('dealer_site')
    .set(
      {
        ...next,
        updatedAt: nowTs(),
      },
      { merge: true }
    );

  await slugRef.set({ tenantId, slug, published: next.published, updatedAt: nowTs() }, { merge: true });

  return next;
}

export async function resolveDealerSiteBySlug(slug: string): Promise<{
  tenantId: string;
  site: DealerSiteConfig;
  dealerName: string;
  vehicles: Array<Record<string, unknown>>;
} | null> {
  const clean = slugify(slug);
  if (!clean) return null;

  const slugDoc = await db().collection('dealer_site_slugs').doc(clean).get();
  if (slugDoc.exists) {
    const tenantId = String(slugDoc.data()?.tenantId || '');
    if (tenantId) {
      const site = await getDealerSite(tenantId);
      if (site?.published) return buildPublicSitePayload(tenantId, site);
    }
  }

  // Compat: slug = tenantId
  const byTenant = await db().collection('tenants').doc(clean).get();
  if (byTenant.exists) {
    const site = await getDealerSite(clean);
    if (site?.published) {
      return buildPublicSitePayload(clean, site);
    }
  }

  return null;
}

async function buildPublicSitePayload(tenantId: string, site: DealerSiteConfig) {
  const tenantSnap = await db().collection('tenants').doc(tenantId).get();
  const tenant = tenantSnap.data() || {};
  const vehicles = await getVehicles(tenantId, { status: 'available' });
  const publicVehicles = vehicles
    .filter((v) => v.publishedOnPublicPage !== false && v.deleted !== true)
    .slice(0, 100)
    .map((v) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      price: v.price,
      currency: v.currency,
      mileage: v.mileage,
      photos: v.photos || [],
      condition: v.condition,
    }));

  return {
    tenantId,
    site,
    dealerName: String(tenant.name || tenant.companyName || site.headline || 'Concesionario'),
    vehicles: publicVehicles,
  };
}

// ---------------------------------------------------------------------------
// Alliances (compartir inventario con otro dealer, sin multi-dealer membership)
// ---------------------------------------------------------------------------

const ALLIANCES_COL = 'inventory_alliances';

export async function listAlliancesForTenant(tenantId: string): Promise<InventoryAlliance[]> {
  const [fromSnap, toSnap] = await Promise.all([
    db().collection(ALLIANCES_COL).where('fromTenantId', '==', tenantId).limit(100).get(),
    db().collection(ALLIANCES_COL).where('toTenantId', '==', tenantId).limit(100).get(),
  ]);
  const map = new Map<string, InventoryAlliance>();
  for (const doc of [...fromSnap.docs, ...toSnap.docs]) {
    const d = doc.data() || {};
    map.set(doc.id, {
      id: doc.id,
      fromTenantId: String(d.fromTenantId || ''),
      toTenantId: String(d.toTenantId || ''),
      toTenantName: d.toTenantName ? String(d.toTenantName) : undefined,
      vehicleIds: Array.isArray(d.vehicleIds) ? d.vehicleIds.map(String) : [],
      shareAll: d.shareAll === true,
      status: (d.status || 'pending') as InventoryAlliance['status'],
      createdAt: d.createdAt?.toDate?.()?.toISOString?.(),
      updatedAt: d.updatedAt?.toDate?.()?.toISOString?.(),
    });
  }
  return Array.from(map.values());
}

export async function createAllianceInvite(input: {
  fromTenantId: string;
  toTenantId: string;
  shareAll?: boolean;
  vehicleIds?: string[];
}): Promise<InventoryAlliance> {
  if (input.fromTenantId === input.toTenantId) {
    throw new Error('No puedes compartir inventario contigo mismo');
  }
  const toSnap = await db().collection('tenants').doc(input.toTenantId).get();
  if (!toSnap.exists) throw new Error('El dealer destino no existe');
  const toName = String(toSnap.data()?.name || toSnap.data()?.companyName || input.toTenantId);

  const existing = await db()
    .collection(ALLIANCES_COL)
    .where('fromTenantId', '==', input.fromTenantId)
    .where('toTenantId', '==', input.toTenantId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data();
    if (data.status !== 'revoked') {
      throw new Error('Ya existe una alianza con ese dealer');
    }
  }

  const ref = db().collection(ALLIANCES_COL).doc();
  const payload = {
    fromTenantId: input.fromTenantId,
    toTenantId: input.toTenantId,
    toTenantName: toName,
    shareAll: input.shareAll !== false && !(input.vehicleIds && input.vehicleIds.length),
    vehicleIds: input.vehicleIds || [],
    status: 'pending',
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
  await ref.set(payload);
  return {
    id: ref.id,
    fromTenantId: input.fromTenantId,
    toTenantId: input.toTenantId,
    toTenantName: toName,
    vehicleIds: payload.vehicleIds,
    shareAll: payload.shareAll,
    status: 'pending',
  };
}

export async function respondAlliance(
  allianceId: string,
  tenantId: string,
  accept: boolean
): Promise<InventoryAlliance> {
  const ref = db().collection(ALLIANCES_COL).doc(allianceId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Alianza no encontrada');
  const data = snap.data() || {};
  if (data.toTenantId !== tenantId && data.fromTenantId !== tenantId) {
    throw new Error('No autorizado');
  }
  const status = accept ? 'active' : 'revoked';
  if (!accept && data.fromTenantId !== tenantId && data.toTenantId !== tenantId) {
    throw new Error('No autorizado');
  }
  await ref.set({ status, updatedAt: nowTs() }, { merge: true });
  return {
    id: allianceId,
    fromTenantId: String(data.fromTenantId),
    toTenantId: String(data.toTenantId),
    toTenantName: data.toTenantName ? String(data.toTenantName) : undefined,
    vehicleIds: Array.isArray(data.vehicleIds) ? data.vehicleIds.map(String) : [],
    shareAll: data.shareAll === true,
    status,
  };
}

export async function listAlliedVehiclesForTenant(tenantId: string) {
  const alliances = (await listAlliancesForTenant(tenantId)).filter((a) => a.status === 'active');
  const incoming = alliances.filter((a) => a.toTenantId === tenantId);
  const results: Array<Record<string, unknown>> = [];
  for (const a of incoming) {
    const vehicles = await getVehicles(a.fromTenantId, { status: 'available' });
    const filtered = a.shareAll
      ? vehicles
      : vehicles.filter((v) => a.vehicleIds.includes(v.id));
    const fromSnap = await db().collection('tenants').doc(a.fromTenantId).get();
    const fromName = String(fromSnap.data()?.name || a.fromTenantId);
    for (const v of filtered) {
      if (v.deleted) continue;
      results.push({
        ...v,
        createdAt: v.createdAt?.toISOString?.() || null,
        updatedAt: v.updatedAt?.toISOString?.() || null,
        alliedFromTenantId: a.fromTenantId,
        alliedFromName: fromName,
        allianceId: a.id,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Feed sync jobs (URL CSV/JSON) — no borra vehículos locales
// ---------------------------------------------------------------------------

export async function listFeedJobs(tenantId: string): Promise<InventoryFeedJob[]> {
  const snap = await db()
    .collection('tenants')
    .doc(tenantId)
    .collection('inventory_feed_jobs')
    .limit(50)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      tenantId,
      name: String(d.name || 'Feed'),
      feedUrl: String(d.feedUrl || ''),
      format: d.format === 'json' ? 'json' : 'csv',
      enabled: d.enabled !== false,
      lastRunAt: d.lastRunAt?.toDate?.()?.toISOString?.() || null,
      lastStatus: d.lastStatus || null,
      lastError: d.lastError || null,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.(),
    };
  });
}

export async function saveFeedJob(
  tenantId: string,
  input: { id?: string; name: string; feedUrl: string; format?: 'csv' | 'json'; enabled?: boolean }
): Promise<InventoryFeedJob> {
  const url = String(input.feedUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('La URL del feed debe ser http(s)');
  const ref = input.id
    ? db().collection('tenants').doc(tenantId).collection('inventory_feed_jobs').doc(input.id)
    : db().collection('tenants').doc(tenantId).collection('inventory_feed_jobs').doc();
  await ref.set(
    {
      name: String(input.name || 'Feed').trim() || 'Feed',
      feedUrl: url,
      format: input.format === 'json' ? 'json' : 'csv',
      enabled: input.enabled !== false,
      updatedAt: nowTs(),
      ...(input.id ? {} : { createdAt: nowTs() }),
    },
    { merge: true }
  );
  const jobs = await listFeedJobs(tenantId);
  const job = jobs.find((j) => j.id === ref.id);
  if (!job) throw new Error('No se pudo guardar el feed');
  return job;
}

/**
 * Descarga el feed y corre preview/commit vía bulk-import existente.
 * Nunca borra vehículos que no vengan en el feed.
 */
export async function runFeedJob(
  tenantId: string,
  jobId: string,
  commit: boolean
): Promise<{ previewRows?: number; created?: number; updated?: number; errors?: string[] }> {
  const {
    parseInventoryFile,
    normalizeImportRows,
    buildImportPlan,
    commitInventoryImport,
  } = await import('./bulk-import');
  const ref = db().collection('tenants').doc(tenantId).collection('inventory_feed_jobs').doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Feed no encontrado');
  const job = snap.data() || {};
  const feedUrl = String(job.feedUrl || '');
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Feed respondió ${res.status}`);
    const text = await res.text();
    let normalized;
    if (job.format === 'json') {
      const json = JSON.parse(text);
      const arr = Array.isArray(json) ? json : Array.isArray(json.vehicles) ? json.vehicles : [];
      // Convertir JSON a CSV mínimo para reutilizar el parser
      const headers = ['vin', 'stockNumber', 'make', 'model', 'year', 'price', 'mileage', 'condition', 'status', 'description'];
      const lines = [headers.join(',')];
      for (const item of arr) {
        const row = item as Record<string, unknown>;
        lines.push(
          headers
            .map((h) => {
              const v = row[h] ?? row[h.toLowerCase()] ?? '';
              const s = String(v).replace(/"/g, '""');
              return `"${s}"`;
            })
            .join(',')
        );
      }
      const parsed = parseInventoryFile(Buffer.from(lines.join('\n'), 'utf8'));
      normalized = normalizeImportRows(parsed.rows, parsed.mapping);
    } else {
      const parsed = parseInventoryFile(Buffer.from(text, 'utf8'));
      normalized = normalizeImportRows(parsed.rows, parsed.mapping);
    }

    const plan = await buildImportPlan(tenantId, normalized, { matchKey: 'auto', decodeVins: true });
    if (!commit) {
      await ref.set(
        { lastRunAt: nowTs(), lastStatus: 'ok', lastError: null, lastPreviewCount: plan.rows.length },
        { merge: true }
      );
      return {
        previewRows: plan.rows.length,
        errors: plan.rows.filter((r) => r.action === 'error').map((r) => r.error || r.row.vin || 'fila'),
      };
    }
    const result = await commitInventoryImport(tenantId, plan);
    await ref.set(
      {
        lastRunAt: nowTs(),
        lastStatus: 'ok',
        lastError: null,
        lastCreated: result.created,
        lastUpdated: result.updated,
      },
      { merge: true }
    );
    return { created: result.created, updated: result.updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error en feed';
    await ref.set({ lastRunAt: nowTs(), lastStatus: 'error', lastError: message }, { merge: true });
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// DACO / etiqueta imprimible (HTML + QR). Texto legal básico editable.
// ---------------------------------------------------------------------------

function readDacoFields(data: Record<string, unknown> | undefined): DacoLabelSettings {
  return {
    warrantyNote: optionalString(data?.warrantyNote) || DEFAULT_DACO_WARRANTY_NOTE,
    footerNote: optionalString(data?.footerNote) || DEFAULT_DACO_FOOTER_NOTE,
    updatedAt:
      data?.updatedAt &&
      typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
        ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
        : typeof data?.updatedAt === 'string'
          ? data.updatedAt
          : undefined,
  };
}

/** Platform defaults: system_settings/daco_label (also reads settings/daco_label). */
export async function getPlatformDacoLabelSettings(): Promise<DacoLabelSettings> {
  const primary = await db().collection('system_settings').doc('daco_label').get();
  if (primary.exists) return readDacoFields(primary.data() as Record<string, unknown>);
  const alt = await db().collection('settings').doc('daco_label').get();
  if (alt.exists) return readDacoFields(alt.data() as Record<string, unknown>);
  return {
    warrantyNote: DEFAULT_DACO_WARRANTY_NOTE,
    footerNote: DEFAULT_DACO_FOOTER_NOTE,
  };
}

export async function savePlatformDacoLabelSettings(input: {
  warrantyNote?: string;
  footerNote?: string;
}): Promise<DacoLabelSettings> {
  const next: DacoLabelSettings = {
    warrantyNote: optionalString(input.warrantyNote) || DEFAULT_DACO_WARRANTY_NOTE,
    footerNote: optionalString(input.footerNote) || DEFAULT_DACO_FOOTER_NOTE,
  };
  await db()
    .collection('system_settings')
    .doc('daco_label')
    .set({ ...next, updatedAt: nowTs() }, { merge: true });
  // Mirror to settings/daco_label for the alternate path mentioned in product docs
  await db()
    .collection('settings')
    .doc('daco_label')
    .set({ ...next, updatedAt: nowTs() }, { merge: true })
    .catch(() => undefined);
  return next;
}

export async function getTenantDacoLabelSettings(
  tenantId: string
): Promise<DacoLabelSettings | null> {
  const snap = await db()
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('daco_label')
    .get();
  if (!snap.exists) return null;
  return readDacoFields(snap.data() as Record<string, unknown>);
}

/** Tenant override wins; otherwise platform defaults. */
export async function resolveDacoLabelSettings(tenantId?: string | null): Promise<DacoLabelSettings> {
  if (tenantId) {
    const tenant = await getTenantDacoLabelSettings(tenantId);
    if (tenant) return tenant;
  }
  return getPlatformDacoLabelSettings();
}

export function buildDacoLabelHtml(input: {
  dealerName: string;
  year: number;
  make: string;
  model: string;
  price: number;
  currency?: string;
  vin?: string;
  stockNumber?: string;
  mileage?: number;
  shareAbsoluteUrl: string;
  warrantyNote?: string;
  footerNote?: string;
}): string {
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: input.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(input.price || 0);
  const qr = buildQrImageUrl(input.shareAbsoluteUrl, 160);
  const warranty = input.warrantyNote || DEFAULT_DACO_WARRANTY_NOTE;
  const footer = input.footerNote || DEFAULT_DACO_FOOTER_NOTE;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta ${input.year} ${input.make} ${input.model}</title>
  <style>
    @page { size: 4in 6in; margin: 0.25in; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
    .card { border: 2px solid #0f172a; padding: 16px; width: 3.5in; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .dealer { font-size: 12px; color: #475569; margin-bottom: 12px; }
    .price { font-size: 28px; font-weight: bold; margin: 8px 0; }
    .meta { font-size: 12px; line-height: 1.4; }
    .qr { margin-top: 12px; text-align: center; }
    .qr img { width: 120px; height: 120px; }
    .note { font-size: 9px; color: #64748b; margin-top: 12px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
    .footer { font-size: 8px; color: #94a3b8; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="dealer">${escapeHtml(input.dealerName)}</div>
    <h1>${escapeHtml(String(input.year))} ${escapeHtml(input.make)} ${escapeHtml(input.model)}</h1>
    <div class="price">${escapeHtml(money)}</div>
    <div class="meta">
      ${input.stockNumber ? `<div>Stock: ${escapeHtml(input.stockNumber)}</div>` : ''}
      ${input.vin ? `<div>VIN: ${escapeHtml(input.vin)}</div>` : ''}
      ${input.mileage != null ? `<div>Millaje: ${escapeHtml(String(input.mileage))}</div>` : ''}
    </div>
    <div class="qr">
      <img src="${escapeHtml(qr)}" alt="QR" />
      <div style="font-size:10px;margin-top:4px;">Escanea para ver ficha</div>
    </div>
    <div class="note">${escapeHtml(warranty)}</div>
    ${footer ? `<div class="footer">${escapeHtml(footer)}</div>` : ''}
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); }</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
