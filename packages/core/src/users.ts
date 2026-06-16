// Gestión de usuarios

import { User, UserRole, TenantType } from './types';
import { getFirestore, getAuth } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { generateReferralCode } from './referrals';
import { normalizeLoginEmail, resolveRegistrationLinks } from './user-auth-sync';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

function getAuthInstance() {
  return getAuth();
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  tenantId?: string,
  dealerId?: string,
  membershipId?: string
): Promise<User> {
  const normalizedEmail = normalizeLoginEmail(email);

  // Crear usuario en Firebase Auth
  const userRecord = await getAuthInstance().createUser({
    email: normalizedEmail,
    password,
    displayName: name,
  });

  let resolvedTenantId = tenantId?.trim() || undefined;
  let resolvedDealerId = dealerId?.trim() || undefined;

  if (resolvedTenantId) {
    const tenantSnap = await getDb().collection('tenants').doc(resolvedTenantId).get();
    const tData = tenantSnap.data() || {};
    const links = resolveRegistrationLinks({
      role,
      tenantId: resolvedTenantId,
      tenantType: tData.type,
      tenantOwnerId: tData.ownerId,
      userId: userRecord.uid,
      explicitDealerId: resolvedDealerId,
    });
    if (links.tenantId) {
      resolvedTenantId = links.tenantId;
    }
    if (links.dealerId === null) {
      resolvedDealerId = undefined;
    } else if (typeof links.dealerId === 'string') {
      resolvedDealerId = links.dealerId;
    }
  }

  // Establecer custom claims después de crear el usuario
  const claims: Record<string, string> = { role };
  if (resolvedTenantId) claims.tenantId = resolvedTenantId;
  if (resolvedDealerId) claims.dealerId = resolvedDealerId;
  await getAuthInstance().setCustomUserClaims(userRecord.uid, claims);

  // Crear documento en Firestore - Limpiar undefined
  const userData: any = {
    email: normalizedEmail,
    name,
    role,
    membershipId: membershipId || '',
    membershipType: role === 'dealer' ? 'dealer' : 'seller',
    status: 'active',
    settings:
      role === 'seller' || role === 'dealer'
        ? {
            notifications: {
              push: true,
              email: true,
              sms: true,
              whatsapp: true,
              sound: true,
            },
            businessNotifications: {
              newLeads: true,
              newMessages: true,
              newAppointments: true,
              newSales: true,
              documents: true,
              tasks: true,
              catalogInterest: true,
              systemAlerts: true,
            },
          }
        : {},
  };

  // Solo agregar campos opcionales si tienen valor
  if (resolvedTenantId) {
    userData.tenantId = resolvedTenantId;
  }
  if (resolvedDealerId) {
    userData.dealerId = resolvedDealerId;
  }

  // Generar código de referido único automáticamente (solo para dealers y sellers)
  let referralCode: string | null = null;
  if (role === 'dealer' || role === 'seller') {
    try {
      referralCode = await generateReferralCode(userRecord.uid);
      userData.referralCode = referralCode;
    } catch (error) {
      console.error('Error generando código de referido:', error);
      // Continuar sin código de referido si hay error
    }
  }

  const db = getDb();
  await getDb().collection('users').doc(userRecord.uid).set({
    ...userData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    id: userRecord.uid,
    ...userData,
    referralCode: referralCode || undefined,
  };
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const db = getDb();
  const userDoc = await getDb().collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    lastLogin: data?.lastLogin?.toDate(),
  } as User;
}

/**
 * Obtiene usuarios por tenant
 */
export async function getUsersByTenant(
  tenantId: string
): Promise<User[]> {
  const db = getDb();
  const snapshot = await getDb().collection('users')
    .where('tenantId', '==', tenantId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    lastLogin: doc.data().lastLogin?.toDate(),
  })) as User[];
}

/**
 * Actualiza un usuario
 */
export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const db = getDb();
  await getDb().collection('users').doc(userId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Elimina un usuario (soft delete)
 */
export async function deleteUser(userId: string): Promise<void> {
  await updateUser(userId, { status: 'cancelled' });
  const auth = getAuthInstance();
  await auth.updateUser(userId, { disabled: true });
}

