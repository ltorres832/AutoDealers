// Enlaces de satisfacción para que clientes evalúen a vendedores/dealers

import * as crypto from 'node:crypto';
import * as admin from 'firebase-admin';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { createReview } from './reviews';

function getDb() {
  return getFirestore();
}

const COLLECTION = 'review_invites';
const DEFAULT_EXPIRY_DAYS = 30;

export interface ReviewInvite {
  id: string;
  tenantId: string;
  token: string;
  sellerId?: string;
  dealerId?: string;
  /** Nombre mostrado al cliente (vendedor o concesionario). */
  providerName: string;
  customerNameHint?: string;
  vehicleId?: string;
  saleId?: string;
  status: 'pending' | 'used' | 'expired';
  reviewId?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
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
  if (typeof anyV._seconds === 'number') return new Date(anyV._seconds * 1000);
  return null;
}

function mapInviteDoc(
  doc: admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot
): ReviewInvite | null {
  const d = doc.data();
  if (!d) return null;
  const expiresAt = tsToDate(d.expiresAt);
  if (!expiresAt) return null;
  return {
    id: doc.id,
    tenantId: String(d.tenantId || ''),
    token: String(d.token || ''),
    sellerId: typeof d.sellerId === 'string' ? d.sellerId : undefined,
    dealerId: typeof d.dealerId === 'string' ? d.dealerId : undefined,
    providerName: String(d.providerName || 'Tu vendedor'),
    customerNameHint: typeof d.customerNameHint === 'string' ? d.customerNameHint : undefined,
    vehicleId: typeof d.vehicleId === 'string' ? d.vehicleId : undefined,
    saleId: typeof d.saleId === 'string' ? d.saleId : undefined,
    status: d.status === 'used' || d.status === 'expired' ? d.status : 'pending',
    reviewId: typeof d.reviewId === 'string' ? d.reviewId : undefined,
    createdBy: String(d.createdBy || ''),
    createdAt: tsToDate(d.createdAt) || new Date(),
    expiresAt,
    usedAt: tsToDate(d.usedAt) || undefined,
  };
}

function isInviteExpired(invite: ReviewInvite): boolean {
  return invite.expiresAt.getTime() <= Date.now() || invite.status === 'expired';
}

export interface CreateReviewInviteInput {
  tenantId: string;
  createdBy: string;
  providerName: string;
  sellerId?: string;
  dealerId?: string;
  customerNameHint?: string;
  vehicleId?: string;
  saleId?: string;
  expiryDays?: number;
}

export async function createReviewInvite(
  input: CreateReviewInviteInput
): Promise<{ invite: ReviewInvite; token: string }> {
  const token = crypto.randomBytes(24).toString('base64url');
  const days = Math.min(Math.max(input.expiryDays ?? DEFAULT_EXPIRY_DAYS, 1), 90);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const docRef = getDb()
    .collection('tenants')
    .doc(input.tenantId)
    .collection(COLLECTION)
    .doc();

  const data = {
    tenantId: input.tenantId,
    token,
    providerName: String(input.providerName || 'Tu vendedor').slice(0, 120),
    sellerId: input.sellerId || null,
    dealerId: input.dealerId || null,
    customerNameHint: input.customerNameHint?.trim().slice(0, 120) || null,
    vehicleId: input.vehicleId || null,
    saleId: input.saleId || null,
    status: 'pending',
    createdBy: input.createdBy,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    expiresAt,
  };

  await docRef.set(data);

  await getDb()
    .collection('review_invite_tokens')
    .doc(token)
    .set({
      tenantId: input.tenantId,
      inviteId: docRef.id,
      createdAt: getFirestoreFieldValue().serverTimestamp(),
    });

  return {
    token,
    invite: {
      id: docRef.id,
      tenantId: input.tenantId,
      token,
      sellerId: input.sellerId,
      dealerId: input.dealerId,
      providerName: data.providerName,
      customerNameHint: input.customerNameHint,
      vehicleId: input.vehicleId,
      saleId: input.saleId,
      status: 'pending',
      createdBy: input.createdBy,
      createdAt: new Date(),
      expiresAt,
    },
  };
}

/** Busca invitación por token. */
export async function getReviewInviteByToken(token: string): Promise<ReviewInvite | null> {
  const trimmed = String(token || '').trim();
  if (trimmed.length < 16) return null;

  const tokenSnap = await getDb().collection('review_invite_tokens').doc(trimmed).get();
  if (!tokenSnap.exists) return null;

  const tokenData = tokenSnap.data();
  const tenantId = String(tokenData?.tenantId || '');
  const inviteId = String(tokenData?.inviteId || '');
  if (!tenantId || !inviteId) return null;

  const inviteSnap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(COLLECTION)
    .doc(inviteId)
    .get();

  if (!inviteSnap.exists) return null;
  const invite = mapInviteDoc(inviteSnap);
  if (!invite) return null;

  if (isInviteExpired(invite) && invite.status === 'pending') {
    await inviteSnap.ref.update({ status: 'expired' }).catch(() => {});
    return { ...invite, status: 'expired' };
  }

  return invite;
}

export interface SubmitReviewFromInviteInput {
  token: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment: string;
}

export async function submitReviewFromInvite(
  input: SubmitReviewFromInviteInput
): Promise<{ ok: true; reviewId: string } | { ok: false; status: number; message: string }> {
  const invite = await getReviewInviteByToken(input.token);
  if (!invite) {
    return { ok: false, status: 404, message: 'Enlace no válido o expirado.' };
  }
  if (invite.status === 'used') {
    return { ok: false, status: 409, message: 'Este enlace ya fue utilizado.' };
  }
  if (isInviteExpired(invite) || invite.status === 'expired') {
    return { ok: false, status: 410, message: 'Este enlace ha expirado.' };
  }

  const name = String(input.customerName || '').trim().slice(0, 120);
  const comment = String(input.comment || '').trim().slice(0, 4000);
  const rating = Math.round(Number(input.rating));

  if (!name) return { ok: false, status: 400, message: 'Nombre requerido.' };
  if (!comment) return { ok: false, status: 400, message: 'Comentario requerido.' };
  if (rating < 1 || rating > 5) {
    return { ok: false, status: 400, message: 'La calificación debe ser entre 1 y 5.' };
  }

  const review = await createReview({
    tenantId: invite.tenantId,
    customerName: name,
    customerEmail: input.customerEmail?.trim() || undefined,
    customerPhone: input.customerPhone?.trim() || undefined,
    rating,
    title: input.title?.trim().slice(0, 200) || undefined,
    comment,
    vehicleId: invite.vehicleId,
    saleId: invite.saleId,
    sellerId: invite.sellerId,
    dealerId: invite.dealerId,
    status: 'pending',
    featured: false,
  });

  const inviteRef = getDb()
    .collection('tenants')
    .doc(invite.tenantId)
    .collection(COLLECTION)
    .doc(invite.id);

  await inviteRef.update({
    status: 'used',
    reviewId: review.id,
    usedAt: getFirestoreFieldValue().serverTimestamp(),
  });

  return { ok: true, reviewId: review.id };
}

export async function listReviewInvites(
  tenantId: string,
  opts: { createdBy?: string; limit?: number } = {}
): Promise<ReviewInvite[]> {
  const limit = Math.min(Math.max(opts.limit || 20, 1), 50);
  let q: admin.firestore.Query = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (opts.createdBy) {
    q = getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection(COLLECTION)
      .where('createdBy', '==', opts.createdBy)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }

  const snap = await q.get();
  const items: ReviewInvite[] = [];
  for (const d of snap.docs) {
    const m = mapInviteDoc(d);
    if (m) items.push(m);
  }
  return items;
}
