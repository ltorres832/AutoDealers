/**
 * Sell-to-dealer: cliente vende su auto al dealer (NO es trade-in / no compra otro vehículo).
 * Colección: tenants/{tenantId}/sell_to_dealer_requests/{id}
 * Tracking público: sellToDealerTracking/{token}
 */
import { randomBytes } from 'crypto';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

export const SELL_TO_DEALER_COLLECTION = 'sell_to_dealer_requests';
export const SELL_TO_DEALER_TRACKING_COLLECTION = 'sellToDealerTracking';

export type SellToDealerStatus =
  | 'new'
  | 'in_review'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'appointment_scheduled'
  | 'closed'
  | 'cancelled';

export type SellToDealerOfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn';

export interface SellToDealerContact {
  name: string;
  phone: string;
  email: string;
}

export interface SellToDealerVehicle {
  make: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  vin?: string;
  condition?: string;
  notes?: string;
  photos: string[];
}

export interface SellToDealerOffer {
  amount: number;
  currency: string;
  message?: string;
  expiresAt?: Date | null;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  status: SellToDealerOfferStatus;
  respondedAt?: Date | null;
}

export interface SellToDealerMessage {
  id: string;
  fromClient: boolean;
  fromUserId?: string;
  fromUserName?: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

export interface SellToDealerRequest {
  id: string;
  tenantId: string;
  subdomain?: string;
  contact: SellToDealerContact;
  vehicle: SellToDealerVehicle;
  status: SellToDealerStatus;
  offer?: SellToDealerOffer | null;
  publicToken: string;
  appointmentId?: string;
  assignedTo?: string;
  dealerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

function str(v: unknown, max: number): string {
  return String(v ?? '')
    .trim()
    .slice(0, max);
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function mapOffer(raw: Record<string, unknown> | null | undefined): SellToDealerOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    amount,
    currency: str(raw.currency, 8) || 'USD',
    message: str(raw.message, 2000) || undefined,
    expiresAt: raw.expiresAt ? toDate(raw.expiresAt) : null,
    createdAt: toDate(raw.createdAt),
    createdBy: str(raw.createdBy, 120),
    createdByName: str(raw.createdByName, 120) || undefined,
    status: (str(raw.status, 32) as SellToDealerOfferStatus) || 'pending',
    respondedAt: raw.respondedAt ? toDate(raw.respondedAt) : null,
  };
}

function mapRequest(id: string, data: Record<string, unknown>): SellToDealerRequest {
  const contact = (data.contact || {}) as Record<string, unknown>;
  const vehicle = (data.vehicle || {}) as Record<string, unknown>;
  const photos = Array.isArray(vehicle.photos)
    ? vehicle.photos.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : [];
  return {
    id,
    tenantId: str(data.tenantId, 120),
    subdomain: str(data.subdomain, 80) || undefined,
    contact: {
      name: str(contact.name, 120),
      phone: str(contact.phone, 40),
      email: str(contact.email, 160),
    },
    vehicle: {
      make: str(vehicle.make, 80),
      model: str(vehicle.model, 80),
      year: Number(vehicle.year) || 0,
      mileage: Number(vehicle.mileage) || 0,
      color: str(vehicle.color, 60),
      vin: str(vehicle.vin, 32).toUpperCase() || undefined,
      condition: str(vehicle.condition, 80) || undefined,
      notes: str(vehicle.notes, 5000) || undefined,
      photos,
    },
    status: (str(data.status, 40) as SellToDealerStatus) || 'new',
    offer: mapOffer(data.offer as Record<string, unknown> | null),
    publicToken: str(data.publicToken, 80),
    appointmentId: str(data.appointmentId, 120) || undefined,
    assignedTo: str(data.assignedTo, 120) || undefined,
    dealerNotes: str(data.dealerNotes, 5000) || undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

async function mirrorTracking(req: SellToDealerRequest): Promise<void> {
  const db = getDb();
  await db
    .collection(SELL_TO_DEALER_TRACKING_COLLECTION)
    .doc(req.publicToken)
    .set(
      {
        tenantId: req.tenantId,
        requestId: req.id,
        subdomain: req.subdomain || null,
        status: req.status,
        contactName: req.contact.name,
        contactPhone: req.contact.phone,
        contactEmail: req.contact.email,
        vehicleSummary: `${req.vehicle.year} ${req.vehicle.make} ${req.vehicle.model}`.trim(),
        offer: req.offer
          ? {
              amount: req.offer.amount,
              currency: req.offer.currency,
              message: req.offer.message || null,
              status: req.offer.status,
              expiresAt: req.offer.expiresAt || null,
              createdAt: req.offer.createdAt,
            }
          : null,
        appointmentId: req.appointmentId || null,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
}

async function notifyTenantStaff(
  tenantId: string,
  payload: { title: string; message: string; requestId: string }
): Promise<void> {
  try {
    const db = getDb();
    const usersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .limit(40)
      .get();
    const { notifyUser } = await import('@autodealers/core');
    for (const userDoc of usersSnapshot.docs) {
      const role = String(userDoc.data()?.role || '');
      if (
        !['dealer', 'master_dealer', 'dealer_admin', 'manager', 'seller'].includes(role)
      ) {
        continue;
      }
      try {
        await notifyUser(tenantId, userDoc.id, {
          type: 'sell_to_dealer',
          title: payload.title,
          message: payload.message,
          metadata: {
            requestId: payload.requestId,
            route: '/sell-to-dealer',
          },
        });
      } catch {
        /* ignore per-user */
      }
    }
  } catch (e) {
    console.warn('sell-to-dealer notify:', e);
  }
}

export type CreateSellToDealerInput = {
  tenantId: string;
  subdomain?: string;
  contact: SellToDealerContact;
  vehicle: SellToDealerVehicle;
  assignedTo?: string;
};

export function validateSellToDealerInput(input: {
  contact?: Partial<SellToDealerContact>;
  vehicle?: Partial<SellToDealerVehicle>;
}): string | null {
  const name = str(input.contact?.name, 120);
  const phone = str(input.contact?.phone, 40);
  const email = str(input.contact?.email, 160);
  if (!name) return 'Nombre es obligatorio';
  if (!phone || phone.length < 7) return 'Teléfono es obligatorio';
  if (!email || !email.includes('@')) return 'Email es obligatorio';

  const make = str(input.vehicle?.make, 80);
  const model = str(input.vehicle?.model, 80);
  const year = Number(input.vehicle?.year);
  const mileage = Number(input.vehicle?.mileage);
  const color = str(input.vehicle?.color, 60);
  const photos = Array.isArray(input.vehicle?.photos) ? input.vehicle!.photos! : [];
  if (!make) return 'Marca es obligatoria';
  if (!model) return 'Modelo es obligatorio';
  if (!Number.isFinite(year) || year < 1950 || year > 2105) return 'Año inválido';
  if (!Number.isFinite(mileage) || mileage < 0) return 'Millaje es obligatorio';
  if (!color) return 'Color es obligatorio';
  if (photos.length < 1) return 'Al menos una foto es obligatoria';
  if (photos.length > 20) return 'Máximo 20 fotos';
  return null;
}

export async function createSellToDealerRequest(
  input: CreateSellToDealerInput
): Promise<SellToDealerRequest> {
  const err = validateSellToDealerInput(input);
  if (err) throw new Error(err);

  const db = getDb();
  const docRef = db
    .collection('tenants')
    .doc(input.tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc();
  const publicToken = randomBytes(24).toString('hex');
  const ts = getFirestoreFieldValue().serverTimestamp();

  const vehicle: SellToDealerVehicle = {
    make: str(input.vehicle.make, 80),
    model: str(input.vehicle.model, 80),
    year: Math.floor(Number(input.vehicle.year)),
    mileage: Math.floor(Number(input.vehicle.mileage)),
    color: str(input.vehicle.color, 60),
    vin: str(input.vehicle.vin, 32).toUpperCase() || undefined,
    condition: str(input.vehicle.condition, 80) || undefined,
    notes: str(input.vehicle.notes, 5000) || undefined,
    photos: input.vehicle.photos.filter((p) => typeof p === 'string' && p.trim()).slice(0, 20),
  };

  const contact: SellToDealerContact = {
    name: str(input.contact.name, 120),
    phone: str(input.contact.phone, 40),
    email: str(input.contact.email, 160).toLowerCase(),
  };

  const data: Record<string, unknown> = {
    tenantId: input.tenantId,
    subdomain: input.subdomain || null,
    contact,
    vehicle,
    status: 'new' as SellToDealerStatus,
    offer: null,
    publicToken,
    appointmentId: null,
    assignedTo: input.assignedTo || null,
    createdAt: ts,
    updatedAt: ts,
    kind: 'sell_to_dealer',
  };

  await docRef.set(data);

  const req: SellToDealerRequest = {
    id: docRef.id,
    tenantId: input.tenantId,
    subdomain: input.subdomain,
    contact,
    vehicle,
    status: 'new',
    offer: null,
    publicToken,
    assignedTo: input.assignedTo,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await mirrorTracking(req);
  await notifyTenantStaff(input.tenantId, {
    title: 'Cliente quiere vender su auto',
    message: `${contact.name}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    requestId: docRef.id,
  });

  return req;
}

export async function getSellToDealerRequest(
  tenantId: string,
  requestId: string
): Promise<SellToDealerRequest | null> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(requestId)
    .get();
  if (!snap.exists) return null;
  return mapRequest(snap.id, snap.data() || {});
}

export async function getSellToDealerByToken(
  token: string
): Promise<SellToDealerRequest | null> {
  const t = str(token, 80);
  if (!t) return null;
  const track = await getDb().collection(SELL_TO_DEALER_TRACKING_COLLECTION).doc(t).get();
  if (!track.exists) return null;
  const data = track.data() || {};
  const tenantId = str(data.tenantId, 120);
  const requestId = str(data.requestId, 120);
  if (!tenantId || !requestId) return null;
  return getSellToDealerRequest(tenantId, requestId);
}

export async function listSellToDealerRequests(
  tenantId: string,
  options: { limit?: number; status?: SellToDealerStatus } = {}
): Promise<SellToDealerRequest[]> {
  const lim = Math.min(options.limit || 100, 200);
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(lim)
    .get();

  let list = snap.docs.map((d) => mapRequest(d.id, d.data() || {}));
  if (options.status) {
    list = list.filter((r) => r.status === options.status);
  }
  return list;
}

export async function updateSellToDealerStatus(
  tenantId: string,
  requestId: string,
  status: SellToDealerStatus,
  extras: { dealerNotes?: string; assignedTo?: string; appointmentId?: string } = {}
): Promise<SellToDealerRequest> {
  const ref = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(requestId);
  const patch: Record<string, unknown> = {
    status,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };
  if (extras.dealerNotes !== undefined) patch.dealerNotes = str(extras.dealerNotes, 5000);
  if (extras.assignedTo !== undefined) patch.assignedTo = extras.assignedTo || null;
  if (extras.appointmentId !== undefined) patch.appointmentId = extras.appointmentId || null;
  await ref.update(patch);
  const updated = await getSellToDealerRequest(tenantId, requestId);
  if (!updated) throw new Error('Solicitud no encontrada');
  await mirrorTracking(updated);
  return updated;
}

export async function createSellToDealerOffer(
  tenantId: string,
  requestId: string,
  input: {
    amount: number;
    currency?: string;
    message?: string;
    expiresAt?: Date | null;
    createdBy: string;
    createdByName?: string;
  }
): Promise<SellToDealerRequest> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Monto de oferta inválido');
  }
  const offer: SellToDealerOffer = {
    amount: Math.round(amount * 100) / 100,
    currency: str(input.currency, 8) || 'USD',
    message: str(input.message, 2000) || undefined,
    expiresAt: input.expiresAt || null,
    createdAt: new Date(),
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    status: 'pending',
    respondedAt: null,
  };

  const ref = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(requestId);

  await ref.update({
    offer: {
      ...offer,
      createdAt: getFirestoreFieldValue().serverTimestamp(),
      expiresAt: offer.expiresAt || null,
    },
    status: 'offer_sent',
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });

  const updated = await getSellToDealerRequest(tenantId, requestId);
  if (!updated) throw new Error('Solicitud no encontrada');
  await mirrorTracking(updated);

  await addSellToDealerMessage(tenantId, requestId, {
    fromClient: false,
    fromUserId: input.createdBy,
    fromUserName: input.createdByName,
    content: `Oferta enviada: ${offer.currency} ${offer.amount.toLocaleString('en-US')}${
      offer.message ? ` — ${offer.message}` : ''
    }`,
  });

  return updated;
}

export async function respondSellToDealerOffer(
  token: string,
  decision: 'accepted' | 'rejected'
): Promise<SellToDealerRequest> {
  const req = await getSellToDealerByToken(token);
  if (!req) throw new Error('Solicitud no encontrada');
  if (!req.offer || req.offer.status !== 'pending') {
    throw new Error('No hay una oferta pendiente');
  }
  if (req.offer.expiresAt && req.offer.expiresAt.getTime() < Date.now()) {
    throw new Error('La oferta expiró');
  }

  const nextStatus: SellToDealerStatus =
    decision === 'accepted' ? 'offer_accepted' : 'offer_rejected';

  await getDb()
    .collection('tenants')
    .doc(req.tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(req.id)
    .update({
      'offer.status': decision,
      'offer.respondedAt': getFirestoreFieldValue().serverTimestamp(),
      status: nextStatus,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    });

  const updated = await getSellToDealerRequest(req.tenantId, req.id);
  if (!updated) throw new Error('Solicitud no encontrada');
  await mirrorTracking(updated);

  await addSellToDealerMessage(req.tenantId, req.id, {
    fromClient: true,
    content:
      decision === 'accepted'
        ? 'El cliente aceptó la oferta. Debe agendar una cita para completar la transacción.'
        : 'El cliente rechazó la oferta.',
  });

  await notifyTenantStaff(req.tenantId, {
    title: decision === 'accepted' ? 'Oferta aceptada' : 'Oferta rechazada',
    message: `${req.contact.name} ${decision === 'accepted' ? 'aceptó' : 'rechazó'} la oferta`,
    requestId: req.id,
  });

  return updated;
}

export async function linkSellToDealerAppointment(
  token: string,
  appointmentId: string
): Promise<SellToDealerRequest> {
  const req = await getSellToDealerByToken(token);
  if (!req) throw new Error('Solicitud no encontrada');
  return updateSellToDealerStatus(req.tenantId, req.id, 'appointment_scheduled', {
    appointmentId,
  });
}

export async function addSellToDealerMessage(
  tenantId: string,
  requestId: string,
  input: {
    fromClient: boolean;
    content: string;
    fromUserId?: string;
    fromUserName?: string;
  }
): Promise<SellToDealerMessage> {
  const content = str(input.content, 5000);
  if (!content) throw new Error('Mensaje vacío');

  const ref = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(requestId)
    .collection('messages')
    .doc();

  const data: Record<string, unknown> = {
    fromClient: input.fromClient,
    content,
    read: !input.fromClient,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  };
  if (input.fromUserId) data.fromUserId = input.fromUserId;
  if (input.fromUserName) data.fromUserName = input.fromUserName;

  await ref.set(data);

  const parentRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(requestId);

  const current = await getSellToDealerRequest(tenantId, requestId);
  const patch: Record<string, unknown> = {
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
    lastMessagePreview: content.slice(0, 120),
    lastMessageAt: getFirestoreFieldValue().serverTimestamp(),
    lastMessageFromClient: input.fromClient,
  };
  if (input.fromClient && current?.status === 'new') {
    patch.status = 'in_review';
  }
  await parentRef.update(patch);

  const refreshed = await getSellToDealerRequest(tenantId, requestId);
  if (refreshed) await mirrorTracking(refreshed);

  if (input.fromClient) {
    await notifyTenantStaff(tenantId, {
      title: 'Nuevo mensaje — venta de auto',
      message: content.slice(0, 80),
      requestId,
    });
  }

  return {
    id: ref.id,
    fromClient: input.fromClient,
    fromUserId: input.fromUserId,
    fromUserName: input.fromUserName,
    content,
    createdAt: new Date(),
    read: !input.fromClient,
  };
}

export async function listSellToDealerMessages(
  tenantId: string,
  requestId: string
): Promise<SellToDealerMessage[]> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(SELL_TO_DEALER_COLLECTION)
    .doc(requestId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(300)
    .get();

  return snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      fromClient: Boolean(data.fromClient),
      fromUserId: typeof data.fromUserId === 'string' ? data.fromUserId : undefined,
      fromUserName: typeof data.fromUserName === 'string' ? data.fromUserName : undefined,
      content: str(data.content, 5000),
      createdAt: toDate(data.createdAt),
      read: Boolean(data.read),
    };
  });
}
