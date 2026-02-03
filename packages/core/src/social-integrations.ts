// Gestión de integraciones de redes sociales

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export type SocialPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'tiktok';

export interface SocialIntegration {
  id: string;
  tenantId: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  status: 'active' | 'inactive' | 'expired' | 'error';
  permissions: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una integración de red social
 */
export async function createSocialIntegration(
  integration: Omit<SocialIntegration, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SocialIntegration> {
  const docRef = db
    .collection('tenants')
    .doc(integration.tenantId)
    .collection('integrations')
    .doc();

  await docRef.set({
    ...integration,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...integration,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene integraciones de un tenant
 */
export async function getSocialIntegrations(
  tenantId: string,
  platform?: SocialPlatform
): Promise<SocialIntegration[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations');

  if (platform) {
    query = query.where('platform', '==', platform);
  }

  query = query.where('status', '==', 'active');

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      expiresAt: data?.expiresAt?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as SocialIntegration;
  });
}

/**
 * Actualiza una integración
 */
export async function updateSocialIntegration(
  tenantId: string,
  integrationId: string,
  updates: Partial<SocialIntegration>
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .doc(integrationId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Desactiva una integración
 */
export async function deactivateSocialIntegration(
  tenantId: string,
  integrationId: string
): Promise<void> {
  await updateSocialIntegration(tenantId, integrationId, {
    status: 'inactive',
  });
}





