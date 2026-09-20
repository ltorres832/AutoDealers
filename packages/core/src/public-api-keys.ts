// API keys de tenant para la API pública v0

import { createHash, randomBytes } from 'crypto';
import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

function getDb() {
  return getFirestore();
}

function keysCol(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('api_keys');
}

export interface PublicApiKeyRecord {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  active: boolean;
  lastUsedAt?: Date | null;
  createdAt: Date;
  createdBy: string;
  revokedAt?: Date | null;
}

const DEFAULT_SCOPES = [
  'vehicles:read',
  'leads:read',
  'leads:write',
  'appointments:read',
  'sales:read',
  'deals:read',
  'compensation:read',
] as const;

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/** Genera clave `ad_live_…` (solo se muestra una vez) */
export function generateApiKeySecret(): { rawKey: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const rawKey = `ad_live_${secret}`;
  const prefix = rawKey.slice(0, 16);
  return { rawKey, prefix, hash: hashApiKey(rawKey) };
}

export async function createTenantApiKey(input: {
  tenantId: string;
  name: string;
  createdBy: string;
  scopes?: string[];
}): Promise<{ record: PublicApiKeyRecord; rawKey: string }> {
  const { rawKey, prefix, hash } = generateApiKeySecret();
  const ref = keysCol(input.tenantId).doc();
  const now = new Date();
  const record: PublicApiKeyRecord = {
    id: ref.id,
    tenantId: input.tenantId,
    name: input.name.trim() || 'API key',
    keyPrefix: prefix,
    keyHash: hash,
    scopes: input.scopes?.length ? input.scopes : [...DEFAULT_SCOPES],
    active: true,
    lastUsedAt: null,
    createdAt: now,
    createdBy: input.createdBy,
  };
  await ref.set({
    ...record,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { record, rawKey };
}

export async function listTenantApiKeys(tenantId: string): Promise<PublicApiKeyRecord[]> {
  const snap = await keysCol(tenantId).orderBy('createdAt', 'desc').limit(50).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      scopes: data.scopes || [],
      active: data.active !== false && !data.revokedAt,
      lastUsedAt: data.lastUsedAt?.toDate?.() || null,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      createdBy: data.createdBy || '',
      revokedAt: data.revokedAt?.toDate?.() || null,
    };
  });
}

export async function revokeTenantApiKey(tenantId: string, keyId: string): Promise<void> {
  await keysCol(tenantId)
    .doc(keyId)
    .set(
      {
        active: false,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function authenticatePublicApiKey(
  rawKey: string
): Promise<{ tenantId: string; keyId: string; scopes: string[] } | null> {
  const trimmed = String(rawKey || '').trim();
  if (!trimmed.startsWith('ad_live_') && !trimmed.startsWith('ad_test_')) {
    return null;
  }
  const hash = hashApiKey(trimmed);
  const snap = await getDb()
    .collectionGroup('api_keys')
    .where('keyHash', '==', hash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  if (data.active === false || data.revokedAt) return null;
  const tenantId = data.tenantId || doc.ref.parent.parent?.id;
  if (!tenantId) return null;

  void doc.ref.set(
    { lastUsedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  return {
    tenantId,
    keyId: doc.id,
    scopes: Array.isArray(data.scopes) ? data.scopes : [...DEFAULT_SCOPES],
  };
}

export function apiKeyHasScope(scopes: string[], required: string): boolean {
  if (scopes.includes('*') || scopes.includes('admin')) return true;
  return scopes.includes(required);
}

export { DEFAULT_SCOPES };
