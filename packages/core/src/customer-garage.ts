import { createHash, randomBytes } from 'crypto';
import { getFirestore, getAuth } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { isFeatureEnabled } from './feature-flags';
import { listPublishedAutomotiveBusinesses } from './automotive-business';
import { normalizeLoginEmail } from './user-auth-sync';
import {
  ensureAuthAccount,
  findPlatformProfile,
  PlatformProfileExistsError,
  storeAppPasswordForProfile,
} from './platform-registration';

function getDb() {
  return getFirestore();
}

export type GarageReminderKind = 'insurance' | 'inspection' | 'marbete' | 'tire_rotation' | 'oil_change';

export interface GarageVehicle {
  id: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  mileage?: number;
  vin?: string;
  plate?: string;
  color?: string;
  notes?: string;
  insuranceDueAt?: string;
  inspectionDueAt?: string;
  marbeteDueAt?: string;
  lastTireRotationAt?: string;
  source: 'listing' | 'appointment' | 'quote' | 'manual';
  listingId?: string;
}

export interface CustomerGarage {
  id: string;
  email?: string;
  phone?: string;
  userId?: string;
  accessToken: string;
  selectedVehicleId?: string;
  vehicles: GarageVehicle[];
}

export const EMPTY_VEHICLE_SERVICES_MESSAGE = 'No hay servicios publicados para este vehículo todavía';

function normalizeEmail(email?: string): string {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone?: string): string {
  return String(phone || '').replace(/\D+/g, '');
}

function garageKey(email?: string, phone?: string): string {
  const emailN = normalizeEmail(email);
  const phoneN = normalizePhone(phone);
  const raw = emailN || phoneN;
  if (!raw) return '';
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalDateString(value: unknown): string | undefined {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : raw;
}

function mapGarageVehicle(raw: any, index: number): GarageVehicle {
  return {
    id: String(raw?.id || `v-${index}`),
    year: optionalNumber(raw?.year),
    make: raw?.make ? String(raw.make) : undefined,
    model: raw?.model ? String(raw.model) : undefined,
    trim: raw?.trim ? String(raw.trim) : undefined,
    mileage: optionalNumber(raw?.mileage),
    vin: raw?.vin ? String(raw.vin).trim().toUpperCase() : undefined,
    plate: raw?.plate ? String(raw.plate).trim().toUpperCase() : undefined,
    color: raw?.color ? String(raw.color) : undefined,
    notes: raw?.notes ? String(raw.notes) : undefined,
    insuranceDueAt: optionalDateString(raw?.insuranceDueAt),
    inspectionDueAt: optionalDateString(raw?.inspectionDueAt),
    marbeteDueAt: optionalDateString(raw?.marbeteDueAt),
    lastTireRotationAt: optionalDateString(raw?.lastTireRotationAt),
    source: (raw?.source || 'listing') as GarageVehicle['source'],
    listingId: raw?.listingId ? String(raw.listingId) : undefined,
  };
}

function serializeGarageVehicle(vehicle: GarageVehicle): Record<string, unknown> {
  return {
    id: vehicle.id,
    year: vehicle.year ?? null,
    make: vehicle.make || null,
    model: vehicle.model || null,
    trim: vehicle.trim || null,
    mileage: vehicle.mileage ?? null,
    vin: vehicle.vin || null,
    plate: vehicle.plate || null,
    color: vehicle.color || null,
    notes: vehicle.notes || null,
    insuranceDueAt: vehicle.insuranceDueAt || null,
    inspectionDueAt: vehicle.inspectionDueAt || null,
    marbeteDueAt: vehicle.marbeteDueAt || null,
    lastTireRotationAt: vehicle.lastTireRotationAt || null,
    source: vehicle.source,
    listingId: vehicle.listingId || null,
  };
}

function mapGarage(id: string, data: FirebaseFirestore.DocumentData): CustomerGarage {
  const vehicles = Array.isArray(data.vehicles)
    ? data.vehicles.map((v: any, index: number) => mapGarageVehicle(v, index))
    : [];
  const selectedVehicleId = data.selectedVehicleId ? String(data.selectedVehicleId) : undefined;
  return {
    id,
    email: data.email ? String(data.email) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    userId: data.userId ? String(data.userId) : undefined,
    accessToken: String(data.accessToken || ''),
    selectedVehicleId: vehicles.some((v) => v.id === selectedVehicleId)
      ? selectedVehicleId
      : vehicles[0]?.id,
    vehicles,
  };
}

export function pickSelectedGarageVehicle(
  garage: CustomerGarage | null | undefined,
  vehicleId?: string
): GarageVehicle | undefined {
  if (!garage?.vehicles?.length) return undefined;
  if (vehicleId) {
    const requested = garage.vehicles.find((v) => v.id === vehicleId);
    if (requested) return requested;
  }
  if (garage.selectedVehicleId) {
    const selected = garage.vehicles.find((v) => v.id === garage.selectedVehicleId);
    if (selected) return selected;
  }
  return garage.vehicles[0];
}

function sameVehicle(a: GarageVehicle, b: { year?: number; make?: string; model?: string }): boolean {
  return (
    String(a.make || '').trim().toLowerCase() === String(b.make || '').trim().toLowerCase() &&
    String(a.model || '').trim().toLowerCase() === String(b.model || '').trim().toLowerCase() &&
    (b.year ? a.year === b.year : true)
  );
}

async function resolveGarageRef(input: {
  userId?: string;
  token?: string;
  email?: string;
  phone?: string;
  allowCreateWithoutContact?: boolean;
}): Promise<{ ref: FirebaseFirestore.DocumentReference; existing: CustomerGarage | null } | null> {
  if (input.userId) {
    const byUser = await getGarageByUserId(input.userId);
    if (byUser) {
      return { ref: getDb().collection('customer_garage').doc(byUser.id), existing: byUser };
    }
    const key = garageKey(input.email, input.phone);
    if (key) {
      const snap = await getDb().collection('customer_garage').doc(key).get();
      if (snap.exists) return { ref: snap.ref, existing: mapGarage(snap.id, snap.data() || {}) };
    }
    if (input.token) {
      const byToken = await getGarageByToken(input.token);
      if (byToken) return { ref: getDb().collection('customer_garage').doc(byToken.id), existing: byToken };
    }
    return { ref: getDb().collection('customer_garage').doc(`user-${input.userId}`), existing: null };
  }

  if (input.token) {
    const byToken = await getGarageByToken(input.token);
    if (byToken) return { ref: getDb().collection('customer_garage').doc(byToken.id), existing: byToken };
  }

  const key = garageKey(input.email, input.phone);
  if (key) {
    const ref = getDb().collection('customer_garage').doc(key);
    const snap = await ref.get();
    return { ref, existing: snap.exists ? mapGarage(ref.id, snap.data() || {}) : null };
  }

  if (input.allowCreateWithoutContact) {
    return { ref: getDb().collection('customer_garage').doc(), existing: null };
  }
  return null;
}

async function persistGarage(
  ref: FirebaseFirestore.DocumentReference,
  existing: CustomerGarage | null,
  data: {
    email?: string;
    phone?: string;
    userId?: string;
    accessToken: string;
    vehicles: GarageVehicle[];
    selectedVehicleId?: string;
  }
): Promise<CustomerGarage> {
  const selectedVehicleId =
    data.selectedVehicleId && data.vehicles.some((v) => v.id === data.selectedVehicleId)
      ? data.selectedVehicleId
      : data.vehicles[0]?.id;
  await ref.set(
    {
      email: normalizeEmail(data.email) || existing?.email || null,
      phone: normalizePhone(data.phone) || existing?.phone || null,
      userId: data.userId || existing?.userId || null,
      accessToken: data.accessToken,
      vehicles: data.vehicles.map(serializeGarageVehicle),
      selectedVehicleId: selectedVehicleId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existing ? undefined : admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return mapGarage(ref.id, {
    email: normalizeEmail(data.email) || existing?.email,
    phone: normalizePhone(data.phone) || existing?.phone,
    userId: data.userId || existing?.userId,
    accessToken: data.accessToken,
    vehicles: data.vehicles,
    selectedVehicleId,
  });
}

export async function recognizeGarageVehicle(input: {
  email?: string;
  phone?: string;
  userId?: string;
  token?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  source: GarageVehicle['source'];
  listingId?: string;
}): Promise<CustomerGarage | null> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled) return null;
  const resolved = await resolveGarageRef({
    userId: input.userId,
    token: input.token,
    email: input.email,
    phone: input.phone,
  });
  if (!resolved) return null;

  const { ref, existing } = resolved;
  const vehicles = [...(existing?.vehicles || [])];
  const make = String(input.make || '').trim();
  const model = String(input.model || '').trim();
  const year = input.year ? Number(input.year) : undefined;
  const already = vehicles.find((v) => sameVehicle(v, { year, make, model }));
  let selectedVehicleId = existing?.selectedVehicleId;
  if (make && model && !already) {
    const next: GarageVehicle = {
      id: randomBytes(6).toString('hex'),
      year,
      make,
      model,
      trim: input.trim,
      source: input.source,
      listingId: input.listingId,
    };
    vehicles.push(next);
    selectedVehicleId = next.id;
  } else if (already) {
    selectedVehicleId = already.id;
  }

  const garage = await persistGarage(ref, existing, {
    email: input.email,
    phone: input.phone,
    userId: input.userId,
    accessToken: existing?.accessToken || randomBytes(18).toString('hex'),
    vehicles,
    selectedVehicleId,
  });

  if (make && model) {
    const vehicle = pickSelectedGarageVehicle(garage, selectedVehicleId);
    if (vehicle) await ensureGarageReminders(ref.id, vehicle);
  }

  return garage;
}

export async function addManualGarageVehicle(input: {
  userId?: string;
  token?: string;
  email?: string;
  phone?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  vin?: string;
  plate?: string;
  color?: string;
  notes?: string;
  insuranceDueAt?: string;
  inspectionDueAt?: string;
  marbeteDueAt?: string;
  lastTireRotationAt?: string;
}): Promise<CustomerGarage | null> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled) return null;

  const year = Number(input.year);
  const make = String(input.make || '').trim();
  const model = String(input.model || '').trim();
  if (!year || year < 1950 || year > new Date().getFullYear() + 1) {
    throw new Error('Indica un año válido.');
  }
  if (!make || !model) {
    throw new Error('Marca y modelo son requeridos para reconocer el vehículo.');
  }

  const resolved = await resolveGarageRef({
    userId: input.userId,
    token: input.token,
    email: input.email,
    phone: input.phone,
    allowCreateWithoutContact: true,
  });
  if (!resolved) return null;

  const { ref, existing } = resolved;
  const vehicles = [...(existing?.vehicles || [])];
  const fields: Omit<GarageVehicle, 'id' | 'source'> = {
    year,
    make,
    model,
    trim: String(input.trim || '').trim() || undefined,
    mileage: optionalNumber(input.mileage),
    vin: input.vin ? String(input.vin).trim().toUpperCase() : undefined,
    plate: input.plate ? String(input.plate).trim().toUpperCase() : undefined,
    color: String(input.color || '').trim() || undefined,
    notes: String(input.notes || '').trim() || undefined,
    insuranceDueAt: optionalDateString(input.insuranceDueAt),
    inspectionDueAt: optionalDateString(input.inspectionDueAt),
    marbeteDueAt: optionalDateString(input.marbeteDueAt),
    lastTireRotationAt: optionalDateString(input.lastTireRotationAt),
  };
  const alreadyIdx = vehicles.findIndex((v) => sameVehicle(v, { year, make, model }));
  let selectedVehicleId: string;
  if (alreadyIdx >= 0) {
    vehicles[alreadyIdx] = { ...vehicles[alreadyIdx], ...fields, source: 'manual' };
    selectedVehicleId = vehicles[alreadyIdx].id;
  } else {
    selectedVehicleId = randomBytes(6).toString('hex');
    vehicles.push({ id: selectedVehicleId, source: 'manual', ...fields });
  }

  const garage = await persistGarage(ref, existing, {
    email: input.email,
    phone: input.phone,
    userId: input.userId,
    accessToken: existing?.accessToken || randomBytes(18).toString('hex'),
    vehicles,
    selectedVehicleId,
  });

  const vehicle = pickSelectedGarageVehicle(garage, selectedVehicleId);
  if (vehicle) await ensureGarageReminders(ref.id, vehicle);
  return garage;
}

export async function setSelectedGarageVehicle(input: {
  userId?: string;
  token?: string;
  vehicleId: string;
}): Promise<CustomerGarage | null> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled || !input.vehicleId) return null;
  const resolved = await resolveGarageRef({
    userId: input.userId,
    token: input.token,
  });
  if (!resolved?.existing) return null;
  const selected = resolved.existing.vehicles.find((v) => v.id === input.vehicleId);
  if (!selected) {
    throw new Error('Ese vehículo no está en tu garage.');
  }
  return persistGarage(resolved.ref, resolved.existing, {
    email: resolved.existing.email,
    phone: resolved.existing.phone,
    userId: input.userId || resolved.existing.userId,
    accessToken: resolved.existing.accessToken,
    vehicles: resolved.existing.vehicles,
    selectedVehicleId: selected.id,
  });
}

export async function getGarageByToken(token: string): Promise<CustomerGarage | null> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled || !token) return null;
  const snap = await getDb().collection('customer_garage').where('accessToken', '==', token).limit(1).get();
  if (snap.empty) return null;
  return mapGarage(snap.docs[0].id, snap.docs[0].data() || {});
}

export async function getGarageByUserId(userId: string): Promise<CustomerGarage | null> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled || !userId) return null;
  const byDoc = await getDb().collection('customer_garage').doc(`user-${userId}`).get();
  if (byDoc.exists) {
    return mapGarage(byDoc.id, byDoc.data() || {});
  }
  const snap = await getDb().collection('customer_garage').where('userId', '==', userId).limit(1).get();
  if (snap.empty) return null;
  return mapGarage(snap.docs[0].id, snap.docs[0].data() || {});
}

function mergeVehicles(lists: GarageVehicle[][]): GarageVehicle[] {
  const merged: GarageVehicle[] = [];
  for (const list of lists) {
    for (const vehicle of list) {
      const make = String(vehicle.make || '').trim().toLowerCase();
      const model = String(vehicle.model || '').trim().toLowerCase();
      const already = merged.some(
        (v) =>
          String(v.make || '').trim().toLowerCase() === make &&
          String(v.model || '').trim().toLowerCase() === model &&
          (vehicle.year ? v.year === vehicle.year : true)
      );
      if (!already && (make || model)) {
        merged.push(vehicle);
      }
    }
  }
  return merged;
}

export async function attachGarageToAccount(input: {
  userId: string;
  email?: string;
  phone?: string;
  token?: string;
}): Promise<CustomerGarage | null> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled || !input.userId) return null;

  const candidates: CustomerGarage[] = [];
  const seen = new Set<string>();
  const pushUnique = (garage: CustomerGarage | null) => {
    if (!garage || seen.has(garage.id)) return;
    seen.add(garage.id);
    candidates.push(garage);
  };

  if (input.token) {
    pushUnique(await getGarageByToken(input.token));
  }
  pushUnique(await getGarageByUserId(input.userId));

  const emailKey = garageKey(input.email, undefined);
  if (emailKey) {
    const snap = await getDb().collection('customer_garage').doc(emailKey).get();
    if (snap.exists) pushUnique(mapGarage(snap.id, snap.data() || {}));
  }
  const phoneKey = garageKey(undefined, input.phone);
  if (phoneKey) {
    const snap = await getDb().collection('customer_garage').doc(phoneKey).get();
    if (snap.exists) pushUnique(mapGarage(snap.id, snap.data() || {}));
  }

  const vehicles = mergeVehicles(candidates.map((g) => g.vehicles));
  const accessToken = candidates.find((g) => g.accessToken)?.accessToken || randomBytes(18).toString('hex');
  const email = normalizeEmail(input.email) || candidates.find((g) => g.email)?.email || '';
  const phone = normalizePhone(input.phone) || candidates.find((g) => g.phone)?.phone || '';
  const preferredSelected =
    candidates.find((g) => g.selectedVehicleId && vehicles.some((v) => v.id === g.selectedVehicleId))
      ?.selectedVehicleId || vehicles[0]?.id;
  const targetId = candidates[0]?.id || `user-${input.userId}`;
  const ref = getDb().collection('customer_garage').doc(targetId);
  const existing = await ref.get();

  await ref.set(
    {
      email: email || null,
      phone: phone || null,
      userId: input.userId,
      accessToken,
      vehicles: vehicles.map(serializeGarageVehicle),
      selectedVehicleId: preferredSelected || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existing.exists ? undefined : admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const extra of candidates.slice(1)) {
    if (extra.id === targetId) continue;
    await getDb().collection('customer_garage').doc(extra.id).set(
      {
        userId: input.userId,
        accessToken,
        vehicles: vehicles.map(serializeGarageVehicle),
        selectedVehicleId: preferredSelected || null,
        email: email || extra.email || null,
        phone: phone || extra.phone || null,
        mergedInto: targetId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return mapGarage(targetId, {
    email,
    phone,
    userId: input.userId,
    accessToken,
    vehicles,
    selectedVehicleId: preferredSelected,
  });
}

export async function registerCustomerAccount(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  token?: string;
  acceptPlatformTerms?: boolean;
}): Promise<{ userId: string; garage: CustomerGarage | null }> {
  const enabled = await isFeatureEnabled('public', 'my_garage_enabled');
  if (!enabled) {
    throw new Error('Mi garage no está habilitado.');
  }

  const name = String(input.name || '').trim();
  const email = normalizeLoginEmail(input.email);
  const password = String(input.password || '');
  const phone = normalizePhone(input.phone);

  if (!name) throw new Error('El nombre es requerido.');
  if (!email) throw new Error('El email es requerido.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  if (input.acceptPlatformTerms !== true) {
    throw new Error('Debes aceptar los términos y condiciones.');
  }

  const existingCustomer = await findPlatformProfile(email, 'customer');
  if (existingCustomer) {
    throw new PlatformProfileExistsError('customer');
  }

  for (const kind of ['dealer', 'seller', 'business', 'advertiser', 'affiliate'] as const) {
    const existing = await findPlatformProfile(email, kind);
    if (existing) {
      throw new Error(
        'Este correo ya tiene una cuenta de negocio. Usa otro correo para Mi garage, o entra al panel que ya tienes.'
      );
    }
  }

  const { authUserId, created } = await ensureAuthAccount({
    email,
    password,
    displayName: name,
  });

  if (!created) {
    const existingUsers = await getDb().collection('users').where('email', '==', email).limit(5).get();
    if (!existingUsers.empty) {
      throw new Error(
        'Este correo ya tiene una cuenta. Entra con esa cuenta o usa otro correo para Mi garage.'
      );
    }
  }

  const userId = authUserId;
  await getAuth().setCustomUserClaims(authUserId, { role: 'customer' });

  await getDb().collection('users').doc(userId).set({
    email,
    authUserId,
    name,
    phone: phone || null,
    role: 'customer',
    membershipId: '',
    membershipType: 'customer',
    status: 'active',
    settings: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await storeAppPasswordForProfile({
    appKey: 'customer',
    email,
    profileId: userId,
    authUserId,
    password,
  });

  const garage = await attachGarageToAccount({
    userId,
    email,
    phone: phone || undefined,
    token: input.token,
  });

  return { userId, garage };
}

export async function suggestBusinessesForVehicle(input: {
  make?: string;
  model?: string;
  year?: number;
  municipality?: string;
}): Promise<{
  groups: Array<{ categorySlug: string; title: string; emptyMessage: string; businesses: Awaited<ReturnType<typeof listPublishedAutomotiveBusinesses>> }>;
}> {
  const enabled = await isFeatureEnabled('public', 'vehicle_service_recommendations_enabled');
  if (!enabled) return { groups: [] };

  const hasVehicle = Boolean(input.make || input.model || input.year);
  const emptyMessage = hasVehicle ? EMPTY_VEHICLE_SERVICES_MESSAGE : 'Aún no hay negocios publicados en esta categoría.';
  const groupsSpec = [
    { categorySlug: 'talleres-mecanicos', specialtySlugs: ['motores-y-culatas'], title: 'Mecánica de motor' },
    { categorySlug: 'talleres-mecanicos', specialtySlugs: ['frenos'], title: 'Frenos' },
    { categorySlug: 'talleres-mecanicos', specialtySlugs: ['aceite-y-mantenimiento'], title: 'Aceite y mantenimiento' },
    { categorySlug: 'gomeras', specialtySlugs: ['gomas-nuevas', 'rotacion', 'balanceo-computarizado'], title: 'Gomas' },
    { categorySlug: 'detailing', specialtySlugs: ['detailing-completo', 'lavado-exterior'], title: 'Detailing' },
    { categorySlug: 'piezas', specialtySlugs: ['piezas-nuevas', 'piezas-usadas', 'busqueda-por-vin'], title: 'Piezas y accesorios' },
    { categorySlug: 'inspeccion', specialtySlugs: ['inspeccion-oficial', 'marbete'], title: 'Inspección y marbete' },
    { categorySlug: 'seguros', specialtySlugs: ['polizas-de-auto', 'cotizaciones'], title: 'Seguros' },
  ];

  const groups = await Promise.all(
    groupsSpec.map(async (spec) => {
      const businesses = await listPublishedAutomotiveBusinesses({
        categorySlug: spec.categorySlug,
        municipality: input.municipality,
        make: input.make,
        model: input.model,
        year: input.year,
        specialtySlugs: spec.specialtySlugs,
        requireDeclaredSpecializations: true,
        limit: 36,
      });
      return {
        categorySlug: spec.categorySlug,
        title: spec.title,
        emptyMessage,
        businesses: businesses.slice(0, 8),
      };
    })
  );
  return { groups };
}

function reminderDateFromVehicle(vehicle: GarageVehicle, kind: GarageReminderKind): Date | undefined {
  if (kind === 'insurance' && vehicle.insuranceDueAt) return new Date(`${vehicle.insuranceDueAt}T12:00:00`);
  if (kind === 'inspection' && vehicle.inspectionDueAt) return new Date(`${vehicle.inspectionDueAt}T12:00:00`);
  if (kind === 'marbete' && vehicle.marbeteDueAt) return new Date(`${vehicle.marbeteDueAt}T12:00:00`);
  if (kind === 'tire_rotation' && vehicle.lastTireRotationAt) {
    const last = new Date(`${vehicle.lastTireRotationAt}T12:00:00`);
    if (!Number.isNaN(last.getTime())) {
      last.setMonth(last.getMonth() + 6);
      return last;
    }
  }
  return undefined;
}

async function ensureGarageReminders(garageId: string, vehicle: GarageVehicle): Promise<void> {
  if (!vehicle.id) return;
  const kinds: Array<{ kind: GarageReminderKind; months: number; title: string }> = [
    { kind: 'insurance', months: 12, title: 'Renovar seguro' },
    { kind: 'inspection', months: 12, title: 'Inspección vehicular' },
    { kind: 'marbete', months: 12, title: 'Renovar marbete' },
    { kind: 'tire_rotation', months: 6, title: 'Rotación de gomas' },
    { kind: 'oil_change', months: 6, title: 'Cambio de aceite' },
  ];
  const existing = await getDb()
    .collection('garage_reminders')
    .where('garageId', '==', garageId)
    .where('vehicleId', '==', vehicle.id)
    .limit(20)
    .get();
  const have = new Map(existing.docs.map((d) => [String(d.data()?.kind || ''), d]));
  const now = Date.now();
  for (const item of kinds) {
    const customDue = reminderDateFromVehicle(vehicle, item.kind);
    const found = have.get(item.kind);
    if (found) {
      if (customDue && !Number.isNaN(customDue.getTime())) {
        await found.ref.set({ dueAt: customDue, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
      continue;
    }
    const dueAt = customDue && !Number.isNaN(customDue.getTime()) ? customDue : new Date(now);
    if (!customDue) dueAt.setMonth(dueAt.getMonth() + item.months);
    await getDb().collection('garage_reminders').add({
      garageId,
      vehicleId: vehicle.id,
      kind: item.kind,
      title: item.title,
      dueAt,
      status: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export async function listDueGarageReminders(limit = 100): Promise<
  Array<{ id: string; garageId: string; vehicleId: string; kind: GarageReminderKind; title: string; dueAt: Date }>
> {
  const snap = await getDb()
    .collection('garage_reminders')
    .where('status', '==', 'scheduled')
    .where('dueAt', '<=', new Date())
    .limit(limit)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      garageId: String(data.garageId || ''),
      vehicleId: String(data.vehicleId || ''),
      kind: (data.kind || 'oil_change') as GarageReminderKind,
      title: String(data.title || 'Recordatorio'),
      dueAt: data.dueAt?.toDate?.() || new Date(),
    };
  });
}
