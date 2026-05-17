import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getFreePublicListingsSettings } from './free-public-listings';

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
 * contacto (nombre/teléfono/email opcional) y se identifica el
 * límite de anuncios activos por número de teléfono normalizado.
 */

const COLLECTION = 'quick_listings';

export interface QuickListingInput {
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
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
}

function getDb() {
  return getFirestore();
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
  };
}

function isExpired(item: QuickListing): boolean {
  if (item.status !== 'active') return true;
  if (!item.expiresAt) return false;
  return item.expiresAt.getTime() <= Date.now();
}

/** Cantidad de anuncios activos asociados a un número de teléfono normalizado. */
export async function countActiveQuickListingsByPhone(phone: string): Promise<number> {
  const norm = normalizePhone(phone);
  if (!norm) return 0;
  const snap = await getDb()
    .collection(COLLECTION)
    .where('contactPhoneNorm', '==', norm)
    .where('status', '==', 'active')
    .limit(50)
    .get();
  let count = 0;
  for (const d of snap.docs) {
    const m = mapDoc(d);
    if (m && !isExpired(m)) count += 1;
  }
  return count;
}

export interface CreateQuickListingResult {
  ok: boolean;
  status: number;
  id?: string;
  message?: string;
  expiresAt?: Date;
  durationDays?: number;
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
  const make = asStr(input.make, 60);
  const model = asStr(input.model, 80);
  const year = asNum(input.year);
  const price = asNum(input.price);

  if (!name) return { ok: false, status: 400, message: 'Nombre requerido.' };
  if (!phone) return { ok: false, status: 400, message: 'Teléfono requerido.' };
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

  const activeCount = await countActiveQuickListingsByPhone(phoneNorm);
  if (activeCount >= settings.maxActiveFreeVehiclesPerSeller) {
    return {
      ok: false,
      status: 403,
      message: `Ya tienes ${settings.maxActiveFreeVehiclesPerSeller} anuncio(s) activo(s) con este teléfono. Espera a que venzan o regístrate como vendedor para publicar más.`,
    };
  }

  const photos = Array.isArray(input.photos)
    ? input.photos
        .filter((p): p is string => typeof p === 'string' && /^https?:\/\//i.test(p))
        .slice(0, 6)
    : [];

  const now = new Date();
  const expires = new Date(now.getTime() + settings.durationDays * 24 * 60 * 60 * 1000);

  const docRef = getDb().collection(COLLECTION).doc();
  await docRef.set({
    contactName: name,
    contactPhone: phone,
    contactPhoneNorm: phoneNorm,
    contactEmail: asStr(input.contactEmail, 200),
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
  });

  return {
    ok: true,
    status: 201,
    id: docRef.id,
    expiresAt: expires,
    durationDays: settings.durationDays,
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
