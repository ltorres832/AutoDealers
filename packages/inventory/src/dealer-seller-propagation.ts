/**
 * Propagación de bajas de inventario del dealer a vendedores dealer-managed.
 *
 * El inventario del dealer se comparte por referencia, pero los vendedores creados por
 * el dealer con tenant propio pueden tener copias del mismo vehículo (mismo VIN/stock).
 * Al marcar sold/hide/delete en el dealer, se aplica la misma acción a esas copias.
 * Vendedores independientes (billingMode self_service, sin dealer) quedan excluidos.
 */
import { getFirestore } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

export interface PropagatedVehicleInfo {
  id: string;
  vin?: string;
  stockNumber?: string;
  make?: string;
  model?: string;
  year?: number;
}

interface DealerManagedSellerTarget {
  userId: string;
  sellerTenantId: string;
}

/** Vendedores dealer-managed del dealer que tienen tenant propio (candidatos a tener copias). */
async function findDealerManagedSellerTenants(
  dealerTenantId: string
): Promise<DealerManagedSellerTarget[]> {
  const db = getDb();
  const targets = new Map<string, DealerManagedSellerTarget>();

  // 1) sub_users globales creados por el dealer con tenant propio
  try {
    const subUsersSnap = await db
      .collection('sub_users')
      .where('dealerTenantId', '==', dealerTenantId)
      .get();
    for (const doc of subUsersSnap.docs) {
      const data = doc.data();
      const sellerTenantId = String(data?.sellerTenantId || '').trim();
      if (sellerTenantId && sellerTenantId !== dealerTenantId) {
        targets.set(sellerTenantId, { userId: doc.id, sellerTenantId });
      }
    }
  } catch (error) {
    console.warn('propagation: error leyendo sub_users:', error);
  }

  // 2) usuarios vinculados al dealer (dealer_seller_links) — solo dealer-managed
  try {
    const usersSnap = await db
      .collection('users')
      .where('dealerId', '==', dealerTenantId)
      .get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      // Independientes vinculados que pagan su propia cuenta: excluidos
      if (data?.billingMode === 'self_service') continue;
      const sellerTenantId = String(data?.tenantId || '').trim();
      if (sellerTenantId && sellerTenantId !== dealerTenantId && !targets.has(sellerTenantId)) {
        targets.set(sellerTenantId, { userId: doc.id, sellerTenantId });
      }
    }
  } catch (error) {
    console.warn('propagation: error leyendo users por dealerId:', error);
  }

  return Array.from(targets.values());
}

/** True si el tenant es tipo dealer (solo los dealers propagan a vendedores). */
async function isDealerTenant(tenantId: string): Promise<boolean> {
  try {
    const doc = await getDb().collection('tenants').doc(tenantId).get();
    return doc.exists && doc.data()?.type === 'dealer';
  } catch {
    return false;
  }
}

/**
 * Aplica la acción (sold/hide/delete) a copias del vehículo (mismo VIN o stock)
 * en los tenants propios de vendedores dealer-managed, y les notifica.
 */
export async function propagateListingActionToDealerSellers(
  dealerTenantId: string,
  vehicle: PropagatedVehicleInfo,
  action: 'sold' | 'hide' | 'delete',
  options: {
    /**
     * true cuando la venta en el dealer solo descontó 1 unidad (sigue disponible):
     * únicamente se descuentan copias que también manejan cantidad; las copias de
     * unidad única siguen activas porque el dealer aún tiene stock.
     */
    decrementOnly?: boolean;
  } = {}
): Promise<void> {
  const vin = (vehicle.vin || '').toUpperCase().trim();
  const stock = (vehicle.stockNumber || '').trim();
  if (!vin && !stock) return;

  if (!(await isDealerTenant(dealerTenantId))) return;

  const sellers = await findDealerManagedSellerTenants(dealerTenantId);
  if (sellers.length === 0) return;

  const db = getDb();
  const { applyVehicleListingAction } = await import('./listing-disposition');

  const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'vehículo';
  const actionLabel = options.decrementOnly
    ? 'con 1 unidad menos'
    : action === 'sold'
      ? 'vendido'
      : action === 'hide'
        ? 'no disponible'
        : 'eliminado del inventario';

  for (const seller of sellers) {
    try {
      const vehiclesCol = db
        .collection('tenants')
        .doc(seller.sellerTenantId)
        .collection('vehicles');

      const matchedDocs = new Map<string, Record<string, any>>();
      if (vin) {
        const snap = await vehiclesCol.where('vin', '==', vin).get();
        snap.docs.forEach((d) => matchedDocs.set(d.id, d.data() || {}));
      }
      if (stock) {
        const snap = await vehiclesCol.where('stockNumber', '==', stock).get();
        snap.docs.forEach((d) => matchedDocs.set(d.id, d.data() || {}));
      }
      if (matchedDocs.size === 0) continue;

      let applied = 0;
      for (const [vehicleId, data] of matchedDocs) {
        // Decremento: solo copias que también manejan cantidad (la acción 'sold' descuenta 1)
        if (options.decrementOnly && typeof data.quantity !== 'number') continue;
        await applyVehicleListingAction(seller.sellerTenantId, vehicleId, action, {
          skipDealerPropagation: true,
        });
        applied++;
      }
      if (applied === 0) continue;

      // Notificación al vendedor (best-effort)
      try {
        const { notifyUser } = await import('@autodealers/core');
        await notifyUser(seller.sellerTenantId, seller.userId, {
          type: 'system_alert',
          title: 'Inventario actualizado por tu dealer',
          message: `Tu dealer marcó ${label} (${vin || stock}) como ${actionLabel}. Se actualizó automáticamente en tu cuenta.`,
          metadata: { dealerTenantId, vehicleVin: vin || undefined, vehicleStock: stock || undefined, action },
        });
      } catch (notifError) {
        console.warn('propagation: error notificando al vendedor', seller.userId, notifError);
      }
    } catch (error) {
      console.warn('propagation: error en tenant de vendedor', seller.sellerTenantId, error);
    }
  }
}

/**
 * Notifica al dueño del dealer una baja de inventario (venta que descuenta unidades).
 */
export async function notifyDealerOfInventorySale(
  dealerTenantId: string,
  vehicle: PropagatedVehicleInfo,
  info: { remainingQuantity: number; soldByUserId?: string }
): Promise<void> {
  try {
    const db = getDb();
    const tenantDoc = await db.collection('tenants').doc(dealerTenantId).get();
    // Solo notificar bajas de inventario de tenants dealer (no del inventario propio del vendedor)
    if (!tenantDoc.exists || tenantDoc.data()?.type !== 'dealer') return;
    const ownerId = tenantDoc.data()?.ownerId;
    if (!ownerId) return;

    let sellerName = '';
    if (info.soldByUserId && info.soldByUserId !== ownerId) {
      try {
        const sellerDoc = await db.collection('users').doc(info.soldByUserId).get();
        const d = sellerDoc.data();
        sellerName = d?.displayName || d?.name || d?.email || '';
      } catch {
        sellerName = '';
      }
    }

    const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'vehículo';
    const ref = vehicle.vin || vehicle.stockNumber || vehicle.id;
    const soldBy = sellerName ? ` por ${sellerName}` : '';
    const isSoldOut = info.remainingQuantity <= 0;

    const { notifyUser } = await import('@autodealers/core');
    await notifyUser(dealerTenantId, ownerId, {
      type: 'system_alert',
      title: isSoldOut ? 'Inventario agotado' : 'Baja de inventario',
      message: isSoldOut
        ? `Se vendió la última unidad de ${label} (${ref})${soldBy}. Inventario agotado: la unidad dejó de mostrarse. Repón cantidad para reactivarla.`
        : `Se vendió 1 unidad de ${label} (${ref})${soldBy}. Quedan ${info.remainingQuantity} disponibles.`,
      channels: ['system', 'push', 'email'],
      metadata: {
        vehicleId: vehicle.id,
        remainingQuantity: info.remainingQuantity,
        soldByUserId: info.soldByUserId || null,
      },
    });
  } catch (error) {
    console.warn('notifyDealerOfInventorySale: error notificando al dealer:', error);
  }
}
