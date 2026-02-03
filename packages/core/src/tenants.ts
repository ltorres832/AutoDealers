// Gestión de tenants (dealers/vendedores)

import { Tenant, TenantType } from './types';
import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

/**
 * Crea un nuevo tenant
 */
export async function createTenant(
  name: string,
  type: TenantType,
  subdomain?: string,
  membershipId?: string,
  companyName?: string
): Promise<Tenant> {
  const tenantData: any = {
    name,
    type,
    subdomain: subdomain || null,
    membershipId: membershipId || '',
    status: 'active',
    branding: {
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
    },
    settings: {},
  };

  // Solo agregar companyName si es dealer y tiene valor
  if (type === 'dealer' && companyName) {
    tenantData.companyName = companyName;
  }

  const docRef = getDb().collection('tenants').doc();
  await docRef.set({
    ...tenantData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...tenantData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene un tenant por ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();

  if (!tenantDoc.exists) {
    return null;
  }

  const data = tenantDoc.data();
  return {
    id: tenantDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Tenant;
}

/**
 * Obtiene un tenant por subdominio (solo activos)
 */
export async function getTenantBySubdomain(
  subdomain: string
): Promise<Tenant | null> {
  const snapshot = await getDb().collection('tenants')
    .where('subdomain', '==', subdomain)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Tenant;
}

/**
 * Obtiene todos los tenants (solo para admin)
 */
export async function getTenants(): Promise<Tenant[]> {
  const snapshot = await getDb().collection('tenants').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Tenant;
  });
}

/**
 * Actualiza un tenant
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Tenant>
): Promise<void> {
  await getDb().collection('tenants').doc(tenantId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Obtiene el tenantId por número de WhatsApp (busca en integraciones)
 */
export async function getTenantByWhatsAppNumber(
  phoneNumberId: string
): Promise<string | null> {
  try {
    // Buscar en la colección de integraciones
    const integrationsSnapshot = await getDb().collection('integrations')
      .where('type', '==', 'whatsapp')
      .where('phoneNumberId', '==', phoneNumberId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!integrationsSnapshot.empty) {
      const integration = integrationsSnapshot.docs[0].data();
      return integration.tenantId || null;
    }

    // Si no se encuentra, buscar en todos los tenants por settings
    const tenantsSnapshot = await getDb().collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantData = tenantDoc.data();
      const settings = tenantData?.settings || {};
      
      // Verificar si tiene WhatsApp configurado con este número
      if (settings.whatsapp?.phoneNumberId === phoneNumberId) {
        return tenantDoc.id;
      }
      
      // También buscar en subcolección de integraciones del tenant
      const tenantIntegrations = await getDb().collection('tenants')
        .doc(tenantDoc.id)
        .collection('integrations')
        .where('type', '==', 'whatsapp')
        .where('phoneNumberId', '==', phoneNumberId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!tenantIntegrations.empty) {
        return tenantDoc.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding tenant by WhatsApp number:', error);
    return null;
  }
}

