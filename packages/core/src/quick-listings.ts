import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { getFreePublicListingsSettings } from './free-public-listings';
import { normalizeLoginEmail } from './user-auth-sync';

/**
 * Quick Listings ("Publicar Gratis")
 * --------------------------------------------------------------
 * Anuncios públicos creados por particulares SIN registrarse.
 * Se muestran nombre, teléfono y datos del vehículo. Vencen
 * automáticamente a los N días definidos por el admin
 * (system_settings/free_public_listings.durationDays).
 *
 * Colección Firestore: quick_listings/{id}
 *
 * El sistema NO crea usuarios reales: cada anuncio guarda el
 * contacto (nombre/teléfono/email opcional) y aplica límites por
 * teléfono, dispositivo (visitorId) e IP para evitar abuso sin registro.
 */

const COLLECTION = 'quick_listings';

export interface QuickListingInput {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city?: string | null;

  make: string;
  model: string;
  year: number;

  /** Odómetro en millas (mercado PR / US). */
  mileage?: number | null;
  price: number;
  currency?: string;

  condition?: 'new' | 'used' | 'certified' | string;
  transmission?: string | null;
  fuelType?: string | null;
  color?: string | null;
  bodyType?: string | null;

  description?: string | null;
  photos?: string[] | null;

  ipHash?: string | null;
  userAgent?: string | null;
  /** ID anónimo del navegador (localStorage) para detectar abuso sin registro. */
  visitorId?: string | null;
  acceptTerms?: boolean;
}

export interface QuickListing {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  city: string | null;

  make: string;
  model: string;
  year: number;
  /** Millas recorridas. */
  mileage: number | null;
  price: number;
  currency: string;

  condition: string;
  transmission: string | null;
  fuelType: string | null;
  color: string | null;
  bodyType: string | null;

  description: string | null;
  photos: string[];

  status: 'active' | 'expired' | 'removed';
  views: number;

  createdAt: Date | null;
  expiresAt: Date | null;

  source: 'public-web';
  promotedToSellerAt: Date | null;
  /** Token secreto para consultar vistas y compartir sin cuenta. */
  managementToken?: string | null;
}

function getDb() {
  return getFirestore();
}

/** Normaliza un email para comparación de límites. */
export function normalizeQuickListingEmail(input: string): string {
  return normalizeLoginEmail(String(input || ''));
}

function isValidEmailFormat(email: string): boolean {
  const norm = normalizeQuickListingEmail(email);
  return norm.length >= 5 && norm.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm);
}

/** Normaliza un teléfono para comparación (solo dígitos, mantiene + inicial). */
export function normalizePhone(input: string): string {
  if (!input) return '';
  const trimmed = String(input).trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D+/g, '');
  return hasPlus ? `+${digits}` : digits;
}

function asStr(v: unknown, max = 200): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

function asNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function tsToDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const anyV = v as { toDate?: () => Date; _seconds?: number };
  if (typeof anyV.toDate === 'function') {
    try {
      return anyV.toDate();
    } catch {
      return null;
    }
  }
  if (typeof anyV._seconds === 'number') {
    return new Date(anyV._seconds * 1000);
  }
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : new Date(t);
  }
  return null;
}

function mapDoc(
  doc: admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot
): QuickListing | null {
  const d = doc.data();
  if (!d) return null;
  const photos = Array.isArray(d.photos)
    ? (d.photos as unknown[]).filter((p) => typeof p === 'string').slice(0, 12)
    : [];
  return {
    id: doc.id,
    contactName: String(d.contactName || ''),
    contactPhone: String(d.contactPhone || ''),
    contactEmail: typeof d.contactEmail === 'string' ? d.contactEmail : null,
    city: typeof d.city === 'string' ? d.city : null,
    make: String(d.make || ''),
    model: String(d.model || ''),
    year: Number(d.year) || 0,
    mileage: typeof d.mileage === 'number' ? d.mileage : null,
    price: Number(d.price) || 0,
    currency: typeof d.currency === 'string' && d.currency ? d.currency : 'USD',
    condition: typeof d.condition === 'string' && d.condition ? d.condition : 'used',
    transmission: typeof d.transmission === 'string' ? d.transmission : null,
    fuelType: typeof d.fuelType === 'string' ? d.fuelType : null,
    color: typeof d.color === 'string' ? d.color : null,
    bodyType: typeof d.bodyType === 'string' ? d.bodyType : null,
    description: typeof d.description === 'string' ? d.description : null,
    photos: photos as string[],
    status: (d.status === 'expired' || d.status === 'removed' ? d.status : 'active') as
      | 'active'
      | 'expired'
      | 'removed',
    views: Number(d.views) || 0,
    createdAt: tsToDate(d.createdAt),
    expiresAt: tsToDate(d.expiresAt),
    source: 'public-web',
    promotedToSellerAt: tsToDate(d.promotedToSellerAt),
    managementToken:
      typeof d.managementToken === 'string' && d.managementToken.length >= 16
        ? d.managementToken
        : null,
  };
}

function isExpired(item: QuickListing): boolean {
  if (item.status !== 'active') return true;
  if (!item.expiresAt) return false;
  return item.expiresAt.getTime() <= Date.now();
}

/** Hash estable del identificador de visitante (no reversible). */
export function hashQuickListingVisitorId(visitorId: string): string {
  const trimmed = String(visitorId || '').trim();
  if (trimmed.length < 8) return '';
  return crypto.createHash('sha256').update(`ql-v1:${trimmed}`).digest('hex').slice(0, 32);
}

type QuickListingIdentifierField =
  | 'contactPhoneNorm'
  | 'contactEmailNorm'
  | 'visitorIdHash'
  | 'ipHash';

async function countQuickListingsByIdentifier(
  field: QuickListingIdentifierField,
  value: string,
  opts: { activeOnly: boolean }
): Promise<number> {
  if (!value) return 0;
  let q: admin.firestore.Query = getDb().collection(COLLECTION).where(field, '==', value);
  if (opts.activeOnly) {
    q = q.where('status', '==', 'active');
  }
  const snap = await q.limit(50).get();
  let count = 0;
  for (const d of snap.docs) {
    const m = mapDoc(d);
    if (!m || m.status === 'removed') continue;
    if (opts.activeOnly) {
      if (!isExpired(m)) count += 1;
    } else {
      count += 1;
    }
  }
  return count;
}

export interface QuickListingEligibilityResult {
  allowed: boolean;
  reason?: string;
  code?: 'LIMIT_ACTIVE' | 'LIMIT_LIFETIME' | 'DISABLED' | 'MISSING_VISITOR';
  maxFreeListings?: number;
  durationDays?: number;
  registerPath?: string;
}

export async function checkQuickListingEligibility(input: {
  visitorId?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  ipHash?: string | null;
}): Promise<QuickListingEligibilityResult> {
  const settings = await getFreePublicListingsSettings();
  const registerPath = settings.registerPath || '/register?type=seller';
  const max = settings.maxActiveFreeVehiclesPerSeller;

  if (!settings.enabled || max <= 0) {
    return {
      allowed: false,
      code: 'DISABLED',
      reason: 'Las publicaciones gratuitas no están disponibles en este momento.',
      registerPath,
    };
  }

  const visitorIdHash = hashQuickListingVisitorId(String(input.visitorId || ''));
  if (!visitorIdHash) {
    return {
      allowed: false,
      code: 'MISSING_VISITOR',
      reason: 'No pudimos verificar tu dispositivo. Recarga la página e intenta de nuevo.',
      registerPath,
    };
  }

  const phoneNorm = input.contactPhone ? normalizePhone(input.contactPhone) : '';
  const emailNorm = input.contactEmail ? normalizeQuickListingEmail(input.contactEmail) : '';
  const ipHash = asStr(input.ipHash, 80) || '';

  const identifiers: { field: QuickListingIdentifierField; value: string; label: string }[] = [
    { field: 'visitorIdHash', value: visitorIdHash, label: 'este dispositivo' },
    ...(phoneNorm ? [{ field: 'contactPhoneNorm' as const, value: phoneNorm, label: 'este teléfono' }] : []),
    ...(emailNorm ? [{ field: 'contactEmailNorm' as const, value: emailNorm, label: 'este correo' }] : []),
    ...(ipHash ? [{ field: 'ipHash' as const, value: ipHash, label: 'tu conexión' }] : []),
  ];

  for (const id of identifiers) {
    const active = await countQuickListingsByIdentifier(id.field, id.value, { activeOnly: true });
    if (active >= max) {
      return {
        allowed: false,
        code: 'LIMIT_ACTIVE',
        maxFreeListings: max,
        durationDays: settings.durationDays,
        registerPath,
        reason: `Ya tienes ${max} anuncio(s) gratuito(s) activo(s) en ${id.label}. Cuando venzan, regístrate como vendedor para seguir publicando.`,
      };
    }

    const lifetime = await countQuickListingsByIdentifier(id.field, id.value, { activeOnly: false });
    if (lifetime >= max) {
      return {
        allowed: false,
        code: 'LIMIT_LIFETIME',
        maxFreeListings: max,
        durationDays: settings.durationDays,
        registerPath,
        reason: `Ya usaste tus ${max} publicación(es) gratuita(s) sin cuenta. Crea tu cuenta de vendedor para seguir publicando sin límite.`,
      };
    }
  }

  return {
    allowed: true,
    maxFreeListings: max,
    durationDays: settings.durationDays,
    registerPath,
  };
}

/** Cantidad de anuncios activos asociados a un número de teléfono normalizado. */
export async function countActiveQuickListingsByPhone(phone: string): Promise<number> {
  const norm = normalizePhone(phone);
  if (!norm) return 0;
  return countQuickListingsByIdentifier('contactPhoneNorm', norm, { activeOnly: true });
}

export interface CreateQuickListingResult {
  ok: boolean;
  status: number;
  id?: string;
  message?: string;
  expiresAt?: Date;
  durationDays?: number;
  managementToken?: string;
}

/**
 * Valida y crea un anuncio rápido. Aplica los límites configurados
 * por el admin (max anuncios por teléfono y duración en días).
 */
export async function createQuickListing(
  input: QuickListingInput
): Promise<CreateQuickListingResult> {
  const settings = await getFreePublicListingsSettings();
  if (!settings.enabled) {
    return {
      ok: false,
      status: 403,
      message: 'Las publicaciones gratuitas están desactivadas en este momento.',
    };
  }
  if (settings.maxActiveFreeVehiclesPerSeller <= 0) {
    return {
      ok: false,
      status: 403,
      message: 'En este momento no se aceptan anuncios gratuitos.',
    };
  }

  const name = asStr(input.contactName, 120);
  const phone = asStr(input.contactPhone, 40);
  const email = asStr(input.contactEmail, 200);
  const make = asStr(input.make, 60);
  const model = asStr(input.model, 80);
  const year = asNum(input.year);
  const price = asNum(input.price);

  if (!name) return { ok: false, status: 400, message: 'Nombre requerido.' };
  if (!phone) return { ok: false, status: 400, message: 'Teléfono requerido.' };
  if (!email) return { ok: false, status: 400, message: 'Correo electrónico requerido.' };
  if (!isValidEmailFormat(email)) {
    return { ok: false, status: 400, message: 'Correo electrónico inválido.' };
  }
  if (!make) return { ok: false, status: 400, message: 'Marca requerida.' };
  if (!model) return { ok: false, status: 400, message: 'Modelo requerido.' };
  if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
    return { ok: false, status: 400, message: 'Año inválido.' };
  }
  if (price == null || price <= 0) {
    return { ok: false, status: 400, message: 'Precio inválido.' };
  }
  if (input.acceptTerms !== true) {
    return { ok: false, status: 400, message: 'Debes aceptar los términos.' };
  }

  const phoneNorm = normalizePhone(phone);
  if (phoneNorm.replace(/\D+/g, '').length < 7) {
    return { ok: false, status: 400, message: 'Teléfono inválido.' };
  }

  const emailNorm = normalizeQuickListingEmail(email);
  const visitorIdHash = hashQuickListingVisitorId(String(input.visitorId || ''));
  const eligibility = await checkQuickListingEligibility({
    visitorId: input.visitorId,
    contactPhone: phone,
    contactEmail: email,
    ipHash: input.ipHash,
  });
  if (!eligibility.allowed) {
    return {
      ok: false,
      status: eligibility.code === 'MISSING_VISITOR' ? 400 : 403,
      message: eligibility.reason || 'No puedes publicar más anuncios gratis.',
    };
  }

  const photos = Array.isArray(input.photos)
    ? input.photos
        .filter((p): p is string => typeof p === 'string' && /^https?:\/\//i.test(p))
        .slice(0, 6)
    : [];

  const now = new Date();
  const expires = new Date(now.getTime() + settings.durationDays * 24 * 60 * 60 * 1000);

  const managementToken = crypto.randomUUID();

  const docRef = getDb().collection(COLLECTION).doc();
  await docRef.set({
    contactName: name,
    contactPhone: phone,
    contactPhoneNorm: phoneNorm,
    contactEmail: email,
    contactEmailNorm: emailNorm,
    city: asStr(input.city, 80),

    make,
    model,
    year,
    mileage: asNum(input.mileage),
    price,
    currency: (asStr(input.currency, 3) || 'USD').toUpperCase(),

    condition:
      typeof input.condition === 'string' && input.condition.trim()
        ? String(input.condition).trim().toLowerCase().slice(0, 20)
        : 'used',
    transmission: asStr(input.transmission, 30),
    fuelType: asStr(input.fuelType, 30),
    color: asStr(input.color, 30),
    bodyType: asStr(input.bodyType, 30),

    description: asStr(input.description, 4000),
    photos,

    status: 'active',
    views: 0,

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expires),

    source: 'public-web',
    promotedToSellerAt: null,

    ipHash: asStr(input.ipHash, 80),
    userAgent: asStr(input.userAgent, 240),
    visitorIdHash: visitorIdHash || null,
    managementToken,
  });

  return {
    ok: true,
    status: 201,
    id: docRef.id,
    expiresAt: expires,
    durationDays: settings.durationDays,
    managementToken,
  };
}

export interface ListQuickListingsOptions {
  limit?: number;
  includeAll?: boolean;
  city?: string | null;
}

/**
 * Devuelve anuncios activos (no vencidos). Por defecto solo "active".
 */
export async function listQuickListings(
  opts: ListQuickListingsOptions = {}
): Promise<QuickListing[]> {
  const limit = Math.min(Math.max(opts.limit || 24, 1), 100);
  /** Solo orderBy: evita índice compuesto status+createdAt (sin él, la query falla y el catálogo queda vacío). */
  let q: admin.firestore.Query = getDb()
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit * 4, 200));
  const snap = await q.get();
  const items: QuickListing[] = [];
  for (const d of snap.docs) {
    const m = mapDoc(d);
    if (!m) continue;
    if (!opts.includeAll && m.status !== 'active') continue;
    if (!opts.includeAll && isExpired(m)) continue;
    if (opts.city && m.city && opts.city.toLowerCase() !== m.city.toLowerCase()) continue;
    items.push(m);
    if (items.length >= limit) break;
  }
  return items;
}

export async function getQuickListingById(id: string): Promise<QuickListing | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const m = mapDoc(doc);
  if (!m) return null;
  if (isExpired(m)) return null;
  return m;
}

export async function deleteQuickListing(id: string): Promise<boolean> {
  await getDb().collection(COLLECTION).doc(id).delete();
  return true;
}

/**
 * Marca como expirados / elimina anuncios cuyo expiresAt ya pasó.
 * Devuelve cuántos fueron eliminados.
 */
export async function purgeExpiredQuickListings(): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  const snap = await getDb()
    .collection(COLLECTION)
    .where('status', '==', 'active')
    .where('expiresAt', '<=', now)
    .limit(200)
    .get();
  if (snap.empty) return 0;
  const batch = getDb().batch();
  for (const d of snap.docs) batch.delete(d.ref);
  await batch.commit();
  return snap.size;
}

/** Incrementa contador de vistas (best effort). */
export async function incrementQuickListingView(id: string): Promise<void> {
  try {
    await getDb()
      .collection(COLLECTION)
      .doc(id)
      .update({ views: admin.firestore.FieldValue.increment(1) });
  } catch {
    /* ignore */
  }
}

export interface QuickListingOwnerSummary {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  views: number;
  status: QuickListing['status'];
  expiresAt: Date | null;
  managementToken: string | null;
}

/** Anuncios activos del mismo dispositivo (visitorId en localStorage). */
export async function listQuickListingsByVisitorId(
  visitorId: string,
  opts: { limit?: number } = {}
): Promise<QuickListingOwnerSummary[]> {
  const visitorIdHash = hashQuickListingVisitorId(visitorId);
  if (!visitorIdHash) return [];

  const limit = Math.min(Math.max(opts.limit || 10, 1), 20);
  let snap: admin.firestore.QuerySnapshot;
  try {
    snap = await getDb()
      .collection(COLLECTION)
      .where('visitorIdHash', '==', visitorIdHash)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
  } catch {
    snap = await getDb()
      .collection(COLLECTION)
      .where('visitorIdHash', '==', visitorIdHash)
      .limit(limit * 4)
      .get();
  }

  const items: QuickListingOwnerSummary[] = [];
  const mapped: QuickListing[] = [];
  for (const d of snap.docs) {
    const m = mapDoc(d);
    if (m) mapped.push(m);
  }
  mapped.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

  for (const m of mapped) {
    if (m.status === 'removed' || isExpired(m)) continue;
    items.push({
      id: m.id,
      make: m.make,
      model: m.model,
      year: m.year,
      price: m.price,
      currency: m.currency,
      views: m.views,
      status: m.status,
      expiresAt: m.expiresAt,
      managementToken: m.managementToken || null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

/** Estadísticas del dueño si el token de gestión coincide. */
export async function getQuickListingOwnerStats(
  id: string,
  managementToken: string
): Promise<QuickListingOwnerSummary | null> {
  const token = String(managementToken || '').trim();
  if (!id || token.length < 16) return null;

  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const m = mapDoc(doc);
  if (!m || m.managementToken !== token) return null;
  if (isExpired(m)) return null;

  return {
    id: m.id,
    make: m.make,
    model: m.model,
    year: m.year,
    price: m.price,
    currency: m.currency,
    views: m.views,
    status: m.status,
    expiresAt: m.expiresAt,
    managementToken: m.managementToken || null,
  };
}
