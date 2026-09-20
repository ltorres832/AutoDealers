import * as admin from 'firebase-admin';
import { getAuth, getFirestore } from './firebase';

/**
 * Elimina/desactiva un usuario de plataforma (solo admin).
 * Soft delete: status cancelled + Auth deshabilitado.
 */
export async function adminDeletePlatformUser(
  userId: string,
  adminUserId: string
): Promise<{ role: string }> {
  const db = getFirestore();
  const auth = getAuth();
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error('Usuario no encontrado');
  }

  const data = snap.data() || {};
  const role = String(data.role || '');

  if (role === 'admin') {
    throw new Error('Usa la pantalla de administradores para eliminar cuentas admin');
  }

  await userRef.update({
    status: 'cancelled',
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedByAdmin: adminUserId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await auth.updateUser(userId, { disabled: true }).catch(() => undefined);

  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
  if (tenantId && (role === 'seller' || role === 'dealer')) {
    await db
      .collection('tenants')
      .doc(tenantId)
      .update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => undefined);
  }

  if (role === 'dealer' && tenantId) {
    await db
      .collection('dealers')
      .doc(tenantId)
      .update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => undefined);
  }

  return { role };
}

/**
 * Borra permanentemente un usuario de plataforma (Firestore + Firebase Auth).
 * Para limpiar cuentas de prueba antes de producción.
 */
export async function adminHardDeletePlatformUser(
  userId: string,
  adminUserId: string
): Promise<{ role: string }> {
  const db = getFirestore();
  const auth = getAuth();
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error('Usuario no encontrado');
  }

  const data = snap.data() || {};
  const role = String(data.role || '');

  if (role === 'admin') {
    throw new Error('Usa la pantalla de administradores para eliminar cuentas admin');
  }

  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
  const dealerId = typeof data.dealerId === 'string' ? data.dealerId.trim() : '';

  await userRef.delete();

  await auth.deleteUser(userId).catch(() => undefined);

  if (tenantId && (role === 'seller' || role === 'dealer')) {
    await db.collection('tenants').doc(tenantId).delete().catch(() => undefined);
  }

  if (role === 'dealer' && tenantId) {
    await db.collection('dealers').doc(tenantId).delete().catch(() => undefined);
  }

  if (role === 'seller' && dealerId) {
    const links = await db
      .collection('dealer_seller_links')
      .where('sellerUserId', '==', userId)
      .get()
      .catch(() => null);
    if (links && !links.empty) {
      const batch = db.batch();
      links.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit().catch(() => undefined);
    }
  }

  await db.collection('admin_audit').add({
    action: 'hard_delete_user',
    userId,
    role,
    tenantId: tenantId || null,
    deletedByAdmin: adminUserId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => undefined);

  return { role };
}

export async function adminHardDeleteAdvertiser(advertiserId: string): Promise<void> {
  const db = getFirestore();
  const auth = getAuth();
  const ref = db.collection('advertisers').doc(advertiserId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Anunciante no encontrado');
  }
  await ref.delete();
  await auth.deleteUser(advertiserId).catch(() => undefined);
}

export async function adminDeleteAdvertiser(
  advertiserId: string,
  options?: { permanent?: boolean }
): Promise<void> {
  if (options?.permanent) {
    await adminHardDeleteAdvertiser(advertiserId);
    return;
  }

  const db = getFirestore();
  const auth = getAuth();
  const ref = db.collection('advertisers').doc(advertiserId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Anunciante no encontrado');
  }

  await ref.update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await auth.updateUser(advertiserId, { disabled: true }).catch(() => undefined);
}

export async function adminDeleteContactInquiry(inquiryId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('contact_inquiries').doc(inquiryId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Consulta no encontrada');
  }
  await ref.delete();
}

export async function adminDeleteTenantSubcollectionDoc(
  tenantId: string,
  collection: string,
  entityId: string
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('tenants').doc(tenantId).collection(collection).doc(entityId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Registro no encontrado');
  }
  await ref.delete();
}
