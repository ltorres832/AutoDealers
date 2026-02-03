// Servicio completo de usuarios con Firebase

import * as admin from 'firebase-admin';
import { getFirestore, getAuth } from '../firebase';
import { User, UserRole, TenantType } from '../types';
import { generateReferralCode } from '../referrals';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

function getAuthInstance() {
  return getAuth();
}

/**
 * Crea un nuevo usuario en Firebase Auth y Firestore
 */
export async function createUserService(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  tenantId?: string,
  dealerId?: string
): Promise<User> {
  const authInstance = getAuthInstance();
  
  // Crear usuario en Firebase Auth
  const userRecord = await authInstance.createUser({
    email,
    password,
    displayName: name,
  });

  // Establecer custom claims después de crear el usuario
  await authInstance.setCustomUserClaims(userRecord.uid, {
    role,
    tenantId,
    dealerId,
  });

  // Crear documento en Firestore - Limpiar undefined
  const userData: any = {
    email,
    name,
    role,
    membershipId: '',
    membershipType: role === 'dealer' ? 'dealer' : 'seller',
    status: 'active',
    settings: {},
  };

  // Solo agregar campos opcionales si tienen valor
  if (tenantId) {
    userData.tenantId = tenantId;
  }
  if (dealerId) {
    userData.dealerId = dealerId;
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
export async function getUserByIdService(userId: string): Promise<User | null> {
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
export async function getUsersByTenantService(
  tenantId: string
): Promise<User[]> {
  const snapshot = await getDb()
    .collection('users')
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
export async function updateUserService(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  await getDb().collection('users').doc(userId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

