// Cloud Functions para Subdominios
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear tenant con subdominio
export const createTenantWithSubdomain = onCall(async (request) => {
  const { name, type, subdomain, membershipId, companyName } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!name || !type) {
    throw new HttpsError('invalid-argument', 'name y type son requeridos');
  }

  try {
    // Validar subdominio si se proporciona
    if (subdomain) {
      const isValid = await validateSubdomainAvailability(subdomain);
      if (!isValid) {
        throw new HttpsError('already-exists', 'El subdominio ya está en uso');
      }
    }

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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (type === 'dealer' && companyName) {
      tenantData.companyName = companyName;
    }

    const docRef = db.collection('tenants').doc();
    await docRef.set(tenantData);

    return { id: docRef.id, ...tenantData };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al crear tenant: ${error.message}`);
  }
});

// Actualizar subdominio de tenant
export const updateTenantSubdomain = onCall(async (request) => {
  const { tenantId, subdomain } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !subdomain) {
    throw new HttpsError('invalid-argument', 'tenantId y subdomain son requeridos');
  }

  try {
    // Validar disponibilidad
    const isValid = await validateSubdomainAvailability(subdomain, tenantId);
    if (!isValid) {
      throw new HttpsError('already-exists', 'El subdominio ya está en uso');
    }

    await db.collection('tenants').doc(tenantId).update({
      subdomain,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al actualizar subdominio: ${error.message}`);
  }
});

// Validar disponibilidad de subdominio
export const validateSubdomain = onCall(async (request) => {
  const { subdomain, excludeTenantId } = request.data;

  if (!subdomain) {
    throw new HttpsError('invalid-argument', 'subdomain es requerido');
  }

  try {
    const isValid = await validateSubdomainAvailability(subdomain, excludeTenantId);
    return { available: isValid };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al validar subdominio: ${error.message}`);
  }
});

// Helper: Validar disponibilidad de subdominio
async function validateSubdomainAvailability(
  subdomain: string,
  excludeTenantId?: string
): Promise<boolean> {
  // Subdominios reservados
  const reservedSubdomains = ['admin', 'www', 'api', 'app', 'dealer', 'seller', 'advertiser'];
  if (reservedSubdomains.includes(subdomain.toLowerCase())) {
    return false;
  }

  // Validar formato (solo letras, números y guiones)
  if (!/^[a-z0-9-]+$/.test(subdomain.toLowerCase())) {
    return false;
  }

  // Verificar si ya existe
  let query = db.collection('tenants').where('subdomain', '==', subdomain.toLowerCase());

  const snapshot = await query.get();

  if (snapshot.empty) {
    return true; // Disponible
  }

  // Si hay resultados pero estamos excluyendo un tenantId, verificar
  if (excludeTenantId) {
    const existing = snapshot.docs.find((doc) => doc.id !== excludeTenantId);
    return !existing; // Disponible si no hay otros tenants con ese subdominio
  }

  return false; // No disponible
}

// Obtener tenant por subdominio
export const getTenantBySubdomain = onCall(async (request) => {
  const { subdomain } = request.data;

  if (!subdomain) {
    throw new HttpsError('invalid-argument', 'subdomain es requerido');
  }

  try {
    const snapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain.toLowerCase())
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { tenant: null };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      tenant: {
        id: doc.id,
        ...data,
      },
    };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener tenant: ${error.message}`);
  }
});


