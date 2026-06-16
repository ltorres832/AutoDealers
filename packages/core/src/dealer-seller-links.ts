/**
 * Vinculación dealer ↔ vendedor con cuenta propia (invitación / aceptación).
 * Colección Firestore: dealer_seller_links
 */

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { applyRegistrationLinks, normalizeLoginEmail } from './user-auth-sync';
import { createNotification } from './notifications';
import { canPerformAction } from './membership-validation';
import * as crypto from 'crypto';

function getDb() {
  return getFirestore();
}

export type DealerSellerLinkStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'revoked';

export type DealerSellerInviteStatus = 'active' | 'used' | 'cancelled' | 'expired';

export interface DealerSellerInvite {
  id: string;
  dealerTenantId: string;
  dealerUserId: string;
  dealerName: string;
  status: DealerSellerInviteStatus;
  /** Código público (token) de un solo uso. */
  code: string;
  /** ISO string o Date; almacenado como Timestamp en Firestore */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  usedBySellerUserId?: string;
  usedAt?: Date;
}

export interface DealerSellerLink {
  id: string;
  dealerTenantId: string;
  dealerUserId: string;
  dealerName: string;
  sellerUserId: string;
  sellerEmail: string;
  sellerTenantId: string;
  sellerName: string;
  status: DealerSellerLinkStatus;
  message?: string;
  inviteSource?: 'email' | 'code';
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
}

function randomCode(bytes = 18): string {
  // 18 bytes -> 36 chars hex, suficientemente largo para un token de un solo uso
  return crypto.randomBytes(bytes).toString('hex');
}

function nowPlusDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d;
}

function mapInviteDoc(
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot
): DealerSellerInvite | null {
  if (!doc.exists) return null;
  const data = doc.data() || {};
  const createdAt = (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date();
  const updatedAt = (data.updatedAt as { toDate?: () => Date })?.toDate?.() || createdAt;
  const usedAt = (data.usedAt as { toDate?: () => Date })?.toDate?.();
  const expiresAt = (data.expiresAt as { toDate?: () => Date })?.toDate?.() || nowPlusDays(7);
  const status = String(data.status || '') as DealerSellerInviteStatus;
  const normalizedStatus: DealerSellerInviteStatus =
    status === 'active' || status === 'used' || status === 'cancelled' || status === 'expired'
      ? status
      : 'active';
  return {
    id: doc.id,
    dealerTenantId: String(data.dealerTenantId || ''),
    dealerUserId: String(data.dealerUserId || ''),
    dealerName: String(data.dealerName || ''),
    status: normalizedStatus,
    code: String(data.code || ''),
    expiresAt,
    createdAt,
    updatedAt,
    usedBySellerUserId:
      typeof data.usedBySellerUserId === 'string' ? data.usedBySellerUserId : undefined,
    usedAt,
  };
}

function linkDocId(dealerTenantId: string, sellerUserId: string): string {
  return `${dealerTenantId.trim()}_${sellerUserId.trim()}`;
}

function mapLinkDoc(
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot
): DealerSellerLink | null {
  if (!doc.exists) return null;
  const data = doc.data() || {};
  const createdAt = (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date();
  const updatedAt = (data.updatedAt as { toDate?: () => Date })?.toDate?.() || createdAt;
  const respondedAt = (data.respondedAt as { toDate?: () => Date })?.toDate?.();
  return {
    id: doc.id,
    dealerTenantId: String(data.dealerTenantId || ''),
    dealerUserId: String(data.dealerUserId || ''),
    dealerName: String(data.dealerName || ''),
    sellerUserId: String(data.sellerUserId || ''),
    sellerEmail: String(data.sellerEmail || ''),
    sellerTenantId: String(data.sellerTenantId || ''),
    sellerName: String(data.sellerName || ''),
    status: (data.status as DealerSellerLinkStatus) || 'pending',
    message: typeof data.message === 'string' ? data.message : undefined,
    inviteSource:
      data.inviteSource === 'code' || data.inviteSource === 'email'
        ? (data.inviteSource as 'email' | 'code')
        : undefined,
    inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : undefined,
    createdAt,
    updatedAt,
    respondedAt,
  };
}

async function countActiveDealerSellers(dealerTenantId: string): Promise<number> {
  const db = getDb();
  const ids = new Set<string>();

  try {
    const subCol = await db
      .collection('tenants')
      .doc(dealerTenantId)
      .collection('sub_users')
      .get();
    subCol.docs.forEach((d) => {
      if (d.data()?.isActive !== false) ids.add(d.id);
    });
  } catch {
    /* ignore */
  }

  try {
    const globalSub = await db
      .collection('sub_users')
      .where('dealerTenantId', '==', dealerTenantId)
      .get();
    globalSub.docs.forEach((d) => {
      if (d.data()?.isActive !== false) ids.add(d.id);
    });
  } catch {
    /* ignore */
  }

  try {
    const users = await db
      .collection('users')
      .where('dealerId', '==', dealerTenantId)
      .where('role', '==', 'seller')
      .get();
    users.docs.forEach((d) => {
      const st = d.data()?.status;
      if (st !== 'cancelled') ids.add(d.id);
    });
  } catch {
    /* ignore */
  }

  return ids.size;
}

async function assertDealerCanAddSeller(dealerTenantId: string): Promise<void> {
  const membership = await (async () => {
    const { getTenantMembership } = await import('./membership-validation');
    return getTenantMembership(dealerTenantId);
  })();
  if (!membership) {
    throw new Error('No tienes membresía activa para agregar vendedores');
  }
  const billingModule = await import('@autodealers/billing');
  const count = await countActiveDealerSellers(dealerTenantId);
  const canCreate = billingModule.checkLimit(membership, 'maxSellers', count);
  if (!canCreate) {
    throw new Error(
      `Límite de vendedores alcanzado (${membership.features.maxSellers ?? 'plan'})`
    );
  }
}

async function loadDealerName(dealerTenantId: string): Promise<string> {
  const snap = await getDb().collection('tenants').doc(dealerTenantId).get();
  const d = snap.data();
  return (d?.name as string) || (d?.companyName as string) || 'Concesionario';
}

async function assertIndependentSeller(sellerUserId: string): Promise<{
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  dealerId?: string;
}> {
  const userSnap = await getDb().collection('users').doc(sellerUserId).get();
  if (!userSnap.exists) {
    throw new Error('Vendedor no encontrado');
  }
  const user = userSnap.data() || {};
  if (user.role !== 'seller') {
    throw new Error('El usuario no es un vendedor');
  }
  if (user.status === 'suspended' || user.status === 'cancelled') {
    throw new Error('El vendedor no está activo');
  }
  const tenantId = String(user.tenantId || '').trim();
  if (!tenantId) {
    throw new Error('El vendedor no tiene tenant asociado');
  }
  const tenantSnap = await getDb().collection('tenants').doc(tenantId).get();
  if (!tenantSnap.exists) {
    throw new Error('Tenant del vendedor no encontrado');
  }
  const tenant = tenantSnap.data() || {};
  if (tenant.type !== 'seller') {
    throw new Error('Solo se pueden invitar vendedores con cuenta independiente (tenant seller)');
  }
  const ownerId = String(tenant.ownerId || '').trim();
  if (ownerId && ownerId !== sellerUserId) {
    throw new Error('Este vendedor no es titular de su cuenta; no puede vincularse desde aquí');
  }
  if (user.dealerId) {
    throw new Error('Este vendedor ya está vinculado a un concesionario');
  }
  return {
    userId: sellerUserId,
    email: String(user.email || ''),
    name: String(user.name || 'Vendedor'),
    tenantId,
    dealerId: user.dealerId as string | undefined,
  };
}

async function syncSubUserLink(
  dealerTenantId: string,
  sellerUserId: string,
  sellerTenantId: string,
  sellerEmail: string,
  sellerName: string,
  createdBy: string,
  active: boolean
): Promise<void> {
  const ref = getDb().collection('sub_users').doc(sellerUserId);
  const ts = getFirestoreFieldValue().serverTimestamp();
  if (active) {
    await ref.set(
      {
        tenantId: sellerTenantId,
        sellerTenantId,
        dealerTenantId,
        createdBy,
        email: sellerEmail,
        name: sellerName,
        role: 'assistant',
        permissions: {
          canManageLeads: true,
          canManageInventory: false,
          canManageCampaigns: false,
          canManageMessages: true,
          canViewReports: true,
          canManageSettings: false,
        },
        isActive: true,
        linkSource: 'dealer_seller_invite',
        updatedAt: ts,
        createdAt: ts,
      },
      { merge: true }
    );
  } else {
    await ref.set({ isActive: false, updatedAt: ts }, { merge: true });
  }
}

async function notifySellerInvite(
  link: DealerSellerLink
): Promise<void> {
  await createNotification({
    tenantId: link.sellerTenantId,
    userId: link.sellerUserId,
    type: 'system_alert',
    title: 'Invitación de concesionario',
    message: `${link.dealerName} quiere vincular tu cuenta de vendedor. Revisa la invitación en Configuración.`,
    channels: ['system', 'push'],
    metadata: {
      kind: 'dealer_seller_invite',
      linkId: link.id,
      dealerTenantId: link.dealerTenantId,
      dealerName: link.dealerName,
    },
  });
}

async function notifyDealerResponse(
  link: DealerSellerLink,
  accepted: boolean
): Promise<void> {
  await createNotification({
    tenantId: link.dealerTenantId,
    userId: link.dealerUserId,
    type: 'system_alert',
    title: accepted ? 'Vendedor vinculado' : 'Invitación rechazada',
    message: accepted
      ? `${link.sellerName} aceptó vincular su cuenta a tu concesionario.`
      : `${link.sellerName} rechazó la invitación de vinculación.`,
    channels: ['system', 'push'],
    metadata: {
      kind: accepted ? 'dealer_seller_accepted' : 'dealer_seller_rejected',
      linkId: link.id,
      sellerUserId: link.sellerUserId,
    },
  });
}

async function notifySellerRevoked(link: DealerSellerLink, byDealer: boolean): Promise<void> {
  await createNotification({
    tenantId: link.sellerTenantId,
    userId: link.sellerUserId,
    type: 'system_alert',
    title: byDealer ? 'Vinculación cancelada' : 'Desvinculado del concesionario',
    message: byDealer
      ? `${link.dealerName} canceló la vinculación de tu cuenta.`
      : `Te desvinculaste de ${link.dealerName}.`,
    channels: ['system', 'push'],
    metadata: {
      kind: 'dealer_seller_revoked',
      linkId: link.id,
    },
  });
}

export async function findSellerByEmail(email: string): Promise<{
  userId: string;
  email: string;
  name: string;
  tenantId: string;
} | null> {
  const normalized = normalizeLoginEmail(email);
  if (!normalized) return null;
  const snap = await getDb()
    .collection('users')
    .where('email', '==', normalized)
    .where('role', '==', 'seller')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    userId: doc.id,
    email: String(data.email || normalized),
    name: String(data.name || ''),
    tenantId: String(data.tenantId || ''),
  };
}

export async function inviteExistingSellerToDealer(input: {
  dealerTenantId: string;
  dealerUserId: string;
  sellerEmail: string;
  message?: string;
  inviteSource?: 'email' | 'code';
  inviteCode?: string;
}): Promise<DealerSellerLink> {
  const dealerTenantId = input.dealerTenantId.trim();
  const sellerEmail = normalizeLoginEmail(input.sellerEmail);
  if (!dealerTenantId || !sellerEmail) {
    throw new Error('Email del vendedor requerido');
  }

  const validation = await canPerformAction(dealerTenantId, 'createSeller');
  if (!validation.allowed) {
    throw new Error(validation.reason || 'Límite de vendedores alcanzado en tu plan');
  }
  await assertDealerCanAddSeller(dealerTenantId);

  const found = await findSellerByEmail(sellerEmail);
  if (!found?.userId) {
    throw new Error(
      'No hay un vendedor registrado con ese email. Debe registrarse primero como vendedor independiente.'
    );
  }

  await assertIndependentSeller(found.userId);

  const dealerName = await loadDealerName(dealerTenantId);
  const docId = linkDocId(dealerTenantId, found.userId);
  const ref = getDb().collection('dealer_seller_links').doc(docId);
  const existing = await ref.get();
  const ts = getFirestoreFieldValue().serverTimestamp();

  if (existing.exists) {
    const current = mapLinkDoc(existing);
    if (current?.status === 'pending') {
      throw new Error('Ya existe una invitación pendiente para este vendedor');
    }
    if (current?.status === 'accepted') {
      throw new Error('Este vendedor ya está vinculado a tu concesionario');
    }
  }

  const payload = {
    dealerTenantId,
    dealerUserId: input.dealerUserId,
    dealerName,
    sellerUserId: found.userId,
    sellerEmail: found.email,
    sellerTenantId: found.tenantId,
    sellerName: found.name,
    status: 'pending' as const,
    message: input.message?.trim() || '',
    inviteSource: input.inviteSource || 'email',
    inviteCode: typeof input.inviteCode === 'string' ? input.inviteCode.trim() : '',
    updatedAt: ts,
    respondedAt: admin.firestore.FieldValue.delete(),
    ...(existing.exists ? {} : { createdAt: ts }),
  };

  await ref.set(payload, { merge: true });
  const saved = mapLinkDoc(await ref.get());
  if (!saved) throw new Error('No se pudo crear la invitación');
  await notifySellerInvite(saved);
  return saved;
}

export async function createDealerSellerInvite(input: {
  dealerTenantId: string;
  dealerUserId: string;
  /** Días de expiración del código (default 7). */
  expiresInDays?: number;
}): Promise<{ invite: DealerSellerInvite; url: string }> {
  const dealerTenantId = input.dealerTenantId.trim();
  if (!dealerTenantId) {
    throw new Error('dealerTenantId requerido');
  }

  const validation = await canPerformAction(dealerTenantId, 'createSeller');
  if (!validation.allowed) {
    throw new Error(validation.reason || 'Límite de vendedores alcanzado en tu plan');
  }
  await assertDealerCanAddSeller(dealerTenantId);

  const dealerName = await loadDealerName(dealerTenantId);
  const code = randomCode();
  const expiresAt = nowPlusDays(input.expiresInDays ?? 7);
  const ts = getFirestoreFieldValue().serverTimestamp();

  const ref = getDb().collection('dealer_seller_invites').doc();
  await ref.set({
    dealerTenantId,
    dealerUserId: input.dealerUserId,
    dealerName,
    status: 'active',
    code,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: ts,
    updatedAt: ts,
  } as any);

  const saved = mapInviteDoc(await ref.get());
  if (!saved) throw new Error('No se pudo crear el código');

  const base =
    (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || '').trim() ||
    'https://seller-app--autodealers-7f62e.us-central1.hosted.app';
  const url = `${base.replace(/\/$/, '')}/settings/dealer-link?code=${encodeURIComponent(code)}`;

  return { invite: saved, url };
}

export async function cancelDealerSellerInviteCode(input: {
  dealerTenantId: string;
  inviteId: string;
}): Promise<DealerSellerInvite> {
  const dealerTenantId = input.dealerTenantId.trim();
  const inviteId = input.inviteId.trim();
  if (!dealerTenantId || !inviteId) throw new Error('inviteId requerido');

  const ref = getDb().collection('dealer_seller_invites').doc(inviteId);
  const invite = mapInviteDoc(await ref.get());
  if (!invite || invite.dealerTenantId !== dealerTenantId) {
    throw new Error('Código no encontrado');
  }
  if (invite.status !== 'active') {
    throw new Error('Solo se pueden cancelar códigos activos');
  }
  const ts = getFirestoreFieldValue().serverTimestamp();
  await ref.update({ status: 'cancelled', updatedAt: ts });
  return mapInviteDoc(await ref.get())!;
}

async function markExpiredIfNeeded(invite: DealerSellerInvite): Promise<DealerSellerInvite> {
  if (invite.status !== 'active') return invite;
  if (invite.expiresAt.getTime() > Date.now()) return invite;
  const ref = getDb().collection('dealer_seller_invites').doc(invite.id);
  const ts = getFirestoreFieldValue().serverTimestamp();
  await ref.update({ status: 'expired', updatedAt: ts });
  return mapInviteDoc(await ref.get())!;
}

export async function acceptDealerSellerInviteCode(input: {
  sellerUserId: string;
  code: string;
}): Promise<DealerSellerLink> {
  const sellerUserId = input.sellerUserId.trim();
  const code = input.code.trim().toLowerCase();
  if (!sellerUserId || !code) throw new Error('Código requerido');

  // seller debe ser independiente al momento de aceptar
  await assertIndependentSeller(sellerUserId);

  const snap = await getDb()
    .collection('dealer_seller_invites')
    .where('code', '==', code)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new Error('Código inválido');
  }
  const inviteDoc = snap.docs[0];
  let invite = mapInviteDoc(inviteDoc);
  if (!invite) throw new Error('Código inválido');
  invite = await markExpiredIfNeeded(invite);
  if (invite.status !== 'active') {
    throw new Error('Este código ya no está disponible');
  }

  // Revalidar límite al aceptar.
  await assertDealerCanAddSeller(invite.dealerTenantId);

  // Cargar datos del seller (para crear link doc)
  const seller = await assertIndependentSeller(sellerUserId);

  const link = await inviteExistingSellerToDealer({
    dealerTenantId: invite.dealerTenantId,
    dealerUserId: invite.dealerUserId,
    sellerEmail: seller.email,
    inviteSource: 'code',
    inviteCode: invite.code,
  });

  const ts = getFirestoreFieldValue().serverTimestamp();
  await getDb()
    .collection('dealer_seller_invites')
    .doc(invite.id)
    .update({
      status: 'used',
      usedBySellerUserId: sellerUserId,
      usedAt: ts,
      updatedAt: ts,
    });

  return link;
}

export async function acceptDealerSellerLink(
  linkId: string,
  sellerUserId: string
): Promise<DealerSellerLink> {
  const ref = getDb().collection('dealer_seller_links').doc(linkId);
  const snap = await ref.get();
  const link = mapLinkDoc(snap);
  if (!link || link.sellerUserId !== sellerUserId) {
    throw new Error('Invitación no encontrada');
  }
  if (link.status !== 'pending') {
    throw new Error('Esta invitación ya fue respondida');
  }

  await assertDealerCanAddSeller(link.dealerTenantId);
  await assertIndependentSeller(sellerUserId);

  const dealerTenantSnap = await getDb().collection('tenants').doc(link.dealerTenantId).get();
  const dealerMembershipId = (dealerTenantSnap.data()?.membershipId as string) || '';

  const ts = getFirestoreFieldValue().serverTimestamp();
  await getDb()
    .collection('users')
    .doc(sellerUserId)
    .update({
      dealerId: link.dealerTenantId,
      ...(dealerMembershipId ? { membershipId: dealerMembershipId } : {}),
      updatedAt: ts,
    });

  await applyRegistrationLinks(
    sellerUserId,
    { tenantId: link.sellerTenantId, dealerId: link.dealerTenantId },
    'seller'
  );

  await syncSubUserLink(
    link.dealerTenantId,
    sellerUserId,
    link.sellerTenantId,
    link.sellerEmail,
    link.sellerName,
    link.dealerUserId,
    true
  );

  await ref.update({
    status: 'accepted',
    respondedAt: ts,
    updatedAt: ts,
  });

  const updated = mapLinkDoc(await ref.get())!;
  await notifyDealerResponse(updated, true);
  return updated;
}

export async function rejectDealerSellerLink(
  linkId: string,
  sellerUserId: string
): Promise<DealerSellerLink> {
  const ref = getDb().collection('dealer_seller_links').doc(linkId);
  const link = mapLinkDoc(await ref.get());
  if (!link || link.sellerUserId !== sellerUserId) {
    throw new Error('Invitación no encontrada');
  }
  if (link.status !== 'pending') {
    throw new Error('Esta invitación ya fue respondida');
  }
  const ts = getFirestoreFieldValue().serverTimestamp();
  await ref.update({ status: 'rejected', respondedAt: ts, updatedAt: ts });
  const updated = mapLinkDoc(await ref.get())!;
  await notifyDealerResponse(updated, false);
  return updated;
}

export async function cancelDealerSellerInvite(
  linkId: string,
  dealerTenantId: string
): Promise<DealerSellerLink> {
  const ref = getDb().collection('dealer_seller_links').doc(linkId);
  const link = mapLinkDoc(await ref.get());
  if (!link || link.dealerTenantId !== dealerTenantId) {
    throw new Error('Invitación no encontrada');
  }
  if (link.status !== 'pending') {
    throw new Error('Solo se pueden cancelar invitaciones pendientes');
  }
  const ts = getFirestoreFieldValue().serverTimestamp();
  await ref.update({ status: 'cancelled', respondedAt: ts, updatedAt: ts });
  return mapLinkDoc(await ref.get())!;
}

async function notifyDealerRevoked(link: DealerSellerLink, byDealer: boolean): Promise<void> {
  await createNotification({
    tenantId: link.dealerTenantId,
    userId: link.dealerUserId,
    type: 'system_alert',
    title: byDealer ? 'Vinculación revocada' : 'Vendedor desvinculado',
    message: byDealer
      ? `Revocaste la vinculación con ${link.sellerName}.`
      : `${link.sellerName} se desvinculó de tu concesionario.`,
    channels: ['system', 'push'],
    metadata: {
      kind: 'dealer_seller_revoked',
      linkId: link.id,
      sellerUserId: link.sellerUserId,
    },
  });
}

async function unlinkSellerFromDealer(link: DealerSellerLink, byDealer: boolean): Promise<DealerSellerLink> {
  const ref = getDb().collection('dealer_seller_links').doc(link.id);
  const ts = getFirestoreFieldValue().serverTimestamp();

  await getDb()
    .collection('users')
    .doc(link.sellerUserId)
    .update({
      dealerId: admin.firestore.FieldValue.delete(),
      membershipId: admin.firestore.FieldValue.delete(),
      updatedAt: ts,
    });

  // Al desvincular, el seller vuelve a ser independiente: la membresía deja de heredarse.
  try {
    await getDb()
      .collection('tenants')
      .doc(link.sellerTenantId)
      .update({
        membershipId: admin.firestore.FieldValue.delete(),
        updatedAt: ts,
      });
  } catch {
    /* ignore */
  }

  await applyRegistrationLinks(
    link.sellerUserId,
    { tenantId: link.sellerTenantId, dealerId: null },
    'seller'
  );

  await syncSubUserLink(
    link.dealerTenantId,
    link.sellerUserId,
    link.sellerTenantId,
    link.sellerEmail,
    link.sellerName,
    link.dealerUserId,
    false
  );

  await ref.update({
    status: 'revoked',
    respondedAt: ts,
    updatedAt: ts,
  });

  const updated = mapLinkDoc(await ref.get())!;
  await notifySellerRevoked(updated, byDealer);
  await notifyDealerRevoked(updated, byDealer);
  return updated;
}

export async function revokeDealerSellerLink(
  linkId: string,
  dealerTenantId: string
): Promise<DealerSellerLink> {
  const ref = getDb().collection('dealer_seller_links').doc(linkId);
  const link = mapLinkDoc(await ref.get());
  if (!link || link.dealerTenantId !== dealerTenantId) {
    throw new Error('Vinculación no encontrada');
  }
  if (link.status !== 'accepted') {
    throw new Error('Solo se puede revocar una vinculación activa');
  }
  const userSnap = await getDb().collection('users').doc(link.sellerUserId).get();
  if (userSnap.data()?.dealerId !== dealerTenantId) {
    throw new Error('El vendedor ya no está vinculado a este concesionario');
  }
  return unlinkSellerFromDealer(link, true);
}

export async function disconnectSellerFromDealer(sellerUserId: string): Promise<DealerSellerLink | null> {
  const userSnap = await getDb().collection('users').doc(sellerUserId).get();
  const user = userSnap.data();
  if (!user?.dealerId) {
    throw new Error('No estás vinculado a ningún concesionario');
  }
  const docId = linkDocId(String(user.dealerId), sellerUserId);
  const ref = getDb().collection('dealer_seller_links').doc(docId);
  const link = mapLinkDoc(await ref.get());
  if (link?.status === 'accepted') {
    return unlinkSellerFromDealer(link, false);
  }

  const ts = getFirestoreFieldValue().serverTimestamp();
  await getDb()
    .collection('users')
    .doc(sellerUserId)
    .update({
      dealerId: admin.firestore.FieldValue.delete(),
      updatedAt: ts,
    });
  await applyRegistrationLinks(sellerUserId, { dealerId: null }, 'seller');

  if (link) {
    await ref.update({ status: 'revoked', respondedAt: ts, updatedAt: ts });
    return mapLinkDoc(await ref.get());
  }
  return null;
}

export async function getDealerSellerLinkById(linkId: string): Promise<DealerSellerLink | null> {
  const snap = await getDb().collection('dealer_seller_links').doc(linkId).get();
  return mapLinkDoc(snap);
}

export async function listDealerSellerLinksForDealer(
  dealerTenantId: string
): Promise<DealerSellerLink[]> {
  const snap = await getDb()
    .collection('dealer_seller_links')
    .where('dealerTenantId', '==', dealerTenantId)
    .orderBy('updatedAt', 'desc')
    .get();
  return snap.docs.map((d) => mapLinkDoc(d)!).filter(Boolean);
}

export async function listDealerSellerLinksForSeller(
  sellerUserId: string
): Promise<DealerSellerLink[]> {
  const snap = await getDb()
    .collection('dealer_seller_links')
    .where('sellerUserId', '==', sellerUserId)
    .orderBy('updatedAt', 'desc')
    .get();
  return snap.docs.map((d) => mapLinkDoc(d)!).filter(Boolean);
}
