// Gestión de vendedores por dealers

import { getFirestore, getAuth } from '@autodealers/shared';

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

export type AdminSellerListFilters = {
  dealerId?: string;
  status?: string;
  search?: string;
  /** independent = sin dealerId; linked = con dealerId */
  linkType?: 'all' | 'independent' | 'linked';
};

export type AdminSellerRow = User & {
  dealerName?: string | null;
  tenantName?: string | null;
  tenantType?: string | null;
  authDisabled?: boolean;
};

function normalizeSellerDoc(doc: admin.firestore.QueryDocumentSnapshot): User {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data?.createdAt?.toDate?.() || new Date(),
    updatedAt: data?.updatedAt?.toDate?.() || new Date(),
    lastLogin: data?.lastLogin?.toDate?.(),
  } as User;
}

/**
 * Lista todos los vendedores (soporte admin). Filtros en memoria para evitar índices compuestos.
 */
export async function getAllSellersForAdmin(
  filters: AdminSellerListFilters = {}
): Promise<AdminSellerRow[]> {
  const snapshot = await getDb().collection('users').where('role', '==', 'seller').get();

  let rows = snapshot.docs.map((doc) => normalizeSellerDoc(doc));

  if (filters.dealerId) {
    const did = filters.dealerId.trim();
    rows = rows.filter(
      (s) => s.dealerId === did || (!s.dealerId && s.tenantId === did)
    );
  }

  if (filters.status) {
    rows = rows.filter((s) => (s.status || 'active') === filters.status);
  }

  if (filters.linkType === 'independent') {
    rows = rows.filter((s) => !s.dealerId);
  } else if (filters.linkType === 'linked') {
    rows = rows.filter((s) => !!s.dealerId);
  }

  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q)
    );
  }

  const tenantIds = new Set<string>();
  for (const s of rows) {
    if (s.tenantId) tenantIds.add(s.tenantId);
    if (s.dealerId) tenantIds.add(s.dealerId);
  }

  const tenantNames = new Map<string, { name: string; type?: string }>();
  const idList = [...tenantIds].slice(0, 200);
  await Promise.all(
    idList.map(async (tid) => {
      try {
        const snap = await getDb().collection('tenants').doc(tid).get();
        if (snap.exists) {
          const d = snap.data();
          tenantNames.set(tid, {
            name: (d?.name as string) || (d?.companyName as string) || tid,
            type: d?.type as string | undefined,
          });
        }
      } catch {
        /* ignore */
      }
    })
  );

  const enriched: AdminSellerRow[] = rows.map((s) => ({
    ...s,
    tenantName: s.tenantId ? tenantNames.get(s.tenantId)?.name ?? null : null,
    tenantType: s.tenantId ? tenantNames.get(s.tenantId)?.type ?? null : null,
    dealerName: s.dealerId ? tenantNames.get(s.dealerId)?.name ?? null : null,
  }));

  enriched.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  return enriched;
}

async function assertSellerUser(sellerId: string): Promise<admin.firestore.DocumentData> {
  const seller = await getDb().collection('users').doc(sellerId).get();
  const sellerData = seller.data();
  if (!seller.exists || sellerData?.role !== 'seller') {
    throw new Error('El usuario no es un vendedor o no existe');
  }
  return sellerData!;
}

/**
 * Suspende un vendedor (plataforma admin — sin validar dealer propietario).
 */
export async function adminSuspendSeller(sellerId: string, adminUserId: string): Promise<void> {
  await assertSellerUser(sellerId);
  await getDb()
    .collection('users')
    .doc(sellerId)
    .update({
      status: 'suspended',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspendedBy: adminUserId,
    } as any);
  await auth.updateUser(sellerId, { disabled: true });
}

/**
 * Reactiva un vendedor (admin).
 */
export async function adminReactivateSeller(sellerId: string, adminUserId: string): Promise<void> {
  await assertSellerUser(sellerId);
  await getDb()
    .collection('users')
    .doc(sellerId)
    .update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reactivatedBy: adminUserId,
    } as any);
  await auth.updateUser(sellerId, { disabled: false });
}

/**
 * Cancela / da de baja un vendedor (admin).
 */
export async function adminCancelSeller(sellerId: string, adminUserId: string): Promise<void> {
  const sellerData = await assertSellerUser(sellerId);
  await getDb()
    .collection('users')
    .doc(sellerId)
    .update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: adminUserId,
    } as any);
  await auth.updateUser(sellerId, { disabled: true });
  const tenantId = sellerData.tenantId as string | undefined;
  if (tenantId) {
    const t = await getDb().collection('tenants').doc(tenantId).get();
    if (t.exists && t.data()?.type === 'seller') {
      await getDb()
        .collection('tenants')
        .doc(tenantId)
        .update({
          status: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
    }
  }
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


