// Gestión de vendedores por dealers

import { getFirestore, getAuth } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import { User } from './types';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

/**
 * Obtiene todos los vendedores de un dealer
 */
export async function getSellersByDealer(dealerId: string): Promise<User[]> {
  const snapshot = await getDb().collection('users')
    .where('dealerId', '==', dealerId)
    .where('role', '==', 'seller')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      lastLogin: data?.lastLogin?.toDate(),
    } as User;
  });
}

/**
 * Suspende un vendedor (solo puede hacerlo el dealer que lo creó)
 */
export async function suspendSeller(
  dealerId: string,
  sellerId: string
): Promise<void> {
  // Verificar que el vendedor pertenece al dealer
  const seller = await getDb().collection('users').doc(sellerId).get();
  const sellerData = seller.data();

  if (!seller.exists || sellerData?.dealerId !== dealerId) {
    throw new Error('Vendedor no encontrado o no pertenece a este dealer');
  }

  if (sellerData?.role !== 'seller') {
    throw new Error('El usuario no es un vendedor');
  }

  // Actualizar estado a suspended
  await getDb().collection('users').doc(sellerId).update({
    status: 'suspended',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedBy: dealerId,
  } as any);

  // Deshabilitar en Firebase Auth
  await auth.updateUser(sellerId, { disabled: true });
}

/**
 * Reactiva un vendedor suspendido
 */
export async function reactivateSeller(
  dealerId: string,
  sellerId: string
): Promise<void> {
  // Verificar que el vendedor pertenece al dealer
  const seller = await getDb().collection('users').doc(sellerId).get();
  const sellerData = seller.data();

  if (!seller.exists || sellerData?.dealerId !== dealerId) {
    throw new Error('Vendedor no encontrado o no pertenece a este dealer');
  }

  // Actualizar estado a active
  await getDb().collection('users').doc(sellerId).update({
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactivatedBy: dealerId,
  } as any);

  // Habilitar en Firebase Auth
  await auth.updateUser(sellerId, { disabled: false });
}

/**
 * Elimina un vendedor (soft delete - solo puede hacerlo el dealer que lo creó)
 */
export async function deleteSeller(
  dealerId: string,
  sellerId: string
): Promise<void> {
  // Verificar que el vendedor pertenece al dealer
  const seller = await getDb().collection('users').doc(sellerId).get();
  const sellerData = seller.data();

  if (!seller.exists || sellerData?.dealerId !== dealerId) {
    throw new Error('Vendedor no encontrado o no pertenece a este dealer');
  }

  if (sellerData?.role !== 'seller') {
    throw new Error('El usuario no es un vendedor');
  }

  // Actualizar estado a cancelled
  await getDb().collection('users').doc(sellerId).update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedBy: dealerId,
  } as any);

  // Deshabilitar en Firebase Auth
  await auth.updateUser(sellerId, { disabled: true });

  // También eliminar el tenant del vendedor si existe
  if (sellerData?.tenantId) {
    await getDb().collection('tenants').doc(sellerData.tenantId).update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
  }
}


