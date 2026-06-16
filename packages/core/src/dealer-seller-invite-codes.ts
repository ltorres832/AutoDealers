/**
 * Códigos de invitación reutilizables dealer → vendedor independiente.
 * Un código activo por concesionario (doc id = dealerTenantId).
 */

import { randomBytes } from 'crypto';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { inviteExistingSellerToDealer } from './dealer-seller-links';
import type { DealerSellerLink } from './dealer-seller-links';

function getDb() {
  return getFirestore();
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export interface DealerSellerInviteCode {
  dealerTenantId: string;
  dealerUserId: string;
  dealerName: string;
  code: string;
  message?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function mapInviteCodeDoc(
  doc: admin.firestore.DocumentSnapshot
): DealerSellerInviteCode | null {
  if (!doc.exists) return null;
  const data = doc.data() || {};
  return {
    dealerTenantId: String(data.dealerTenantId || doc.id),
    dealerUserId: String(data.dealerUserId || ''),
    dealerName: String(data.dealerName || ''),
    code: String(data.code || ''),
    message: typeof data.message === 'string' ? data.message : undefined,
    isActive: data.isActive !== false,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
  };
}

async function loadDealerName(dealerTenantId: string): Promise<string> {
  const snap = await getDb().collection('tenants').doc(dealerTenantId).get();
  const d = snap.data();
  return (d?.name as string) || (d?.companyName as string) || 'Concesionario';
}

async function ensureUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateCode();
    const clash = await getDb()
      .collection('dealer_seller_invite_codes')
      .where('code', '==', code)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (clash.empty) return code;
  }
  throw new Error('No se pudo generar un código único. Intenta de nuevo.');
}

export function buildSellerJoinDealerUrl(appOrigin: string, code: string): string {
  const base = appOrigin.replace(/\/$/, '');
  return `${base}/join-dealer?code=${encodeURIComponent(code)}`;
}

export async function getDealerSellerInviteCode(
  dealerTenantId: string
): Promise<DealerSellerInviteCode | null> {
  const snap = await getDb().collection('dealer_seller_invite_codes').doc(dealerTenantId).get();
  const row = mapInviteCodeDoc(snap);
  if (!row || !row.isActive || !row.code) return null;
  return row;
}

export async function createOrRotateDealerSellerInviteCode(input: {
  dealerTenantId: string;
  dealerUserId: string;
  message?: string;
}): Promise<DealerSellerInviteCode> {
  const dealerTenantId = input.dealerTenantId.trim();
  const ts = getFirestoreFieldValue().serverTimestamp();
  const dealerName = await loadDealerName(dealerTenantId);
  const code = await ensureUniqueCode();
  const ref = getDb().collection('dealer_seller_invite_codes').doc(dealerTenantId);
  const existing = await ref.get();

  await ref.set(
    {
      dealerTenantId,
      dealerUserId: input.dealerUserId,
      dealerName,
      code,
      message: input.message?.trim() || '',
      isActive: true,
      updatedAt: ts,
      ...(existing.exists ? {} : { createdAt: ts }),
    },
    { merge: true }
  );

  const saved = mapInviteCodeDoc(await ref.get());
  if (!saved) throw new Error('No se pudo crear el código');
  return saved;
}

export async function deactivateDealerSellerInviteCode(dealerTenantId: string): Promise<void> {
  const ref = getDb().collection('dealer_seller_invite_codes').doc(dealerTenantId.trim());
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.update({
    isActive: false,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
}

export async function previewDealerSellerInviteCode(codeRaw: string): Promise<{
  valid: boolean;
  dealerName?: string;
  message?: string;
  dealerTenantId?: string;
}> {
  const code = normalizeInviteCode(codeRaw);
  if (code.length < 6) {
    return { valid: false };
  }
  const snap = await getDb()
    .collection('dealer_seller_invite_codes')
    .where('code', '==', code)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return { valid: false };
  const data = snap.docs[0].data();
  return {
    valid: true,
    dealerName: String(data.dealerName || 'Concesionario'),
    message: typeof data.message === 'string' ? data.message : undefined,
    dealerTenantId: String(data.dealerTenantId || snap.docs[0].id),
  };
}

export async function joinDealerWithInviteCode(
  codeRaw: string,
  sellerUserId: string
): Promise<DealerSellerLink> {
  const code = normalizeInviteCode(codeRaw);
  if (!code) throw new Error('Código inválido');

  const snap = await getDb()
    .collection('dealer_seller_invite_codes')
    .where('code', '==', code)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new Error('Código no válido o expirado. Pide uno nuevo a tu concesionario.');
  }

  const invite = snap.docs[0].data();
  const dealerTenantId = String(invite.dealerTenantId || snap.docs[0].id);
  const dealerUserId = String(invite.dealerUserId || '');
  const message = typeof invite.message === 'string' ? invite.message : undefined;

  const userSnap = await getDb().collection('users').doc(sellerUserId).get();
  const email = String(userSnap.data()?.email || '');
  if (!email) throw new Error('Tu cuenta no tiene email configurado');

  return inviteExistingSellerToDealer({
    dealerTenantId,
    dealerUserId,
    sellerEmail: email,
    message,
    inviteSource: 'code',
    inviteCode: code,
  });
}
