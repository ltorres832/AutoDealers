/**
 * Sync cross-tenant: cuando un vehículo se marca vendido, propaga el estado
 * a todos los listados activos con el mismo VIN (vinNormalized).
 *
 * Solo Admin SDK (collection group). Idempotente: no re-marca ya vendidos
 * ni reentra si la actualización viene de un sync previo.
 */
import {
  getFirestore,
  getFirestoreFieldValue,
  normalizeVin,
  isValidVinFormat,
  toVinNormalized,
  notifyManagersAndAdmins,
} from '@autodealers/core';

function getDb() {
  return getFirestore();
}

const ACTIVE_STATUSES = new Set([
  'available',
  'reserved',
  'disponible',
  'in_stock',
  'instock',
  'listed',
  'list',
  'public',
  'active',
  'activo',
  'for_sale',
  'forsale',
  'on_sale',
  '',
]);

export type VinSoldSyncOptions = {
  soldReason?: string;
  showPublicSoldBadge?: boolean;
  /** Evita bucles cuando la marca sold viene del propio sync. */
  skipVinSoldSync?: boolean;
};

export type VinListingMatch = {
  tenantId: string;
  vehicleId: string;
  status?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  vinNormalized?: string;
};

export type VinSoldSyncResult = {
  vinNormalized: string;
  updated: number;
  skipped: number;
  matches: VinListingMatch[];
};

function resolveTenantIdFromRef(ref: { path?: string }): string {
  const parts = String(ref.path || '').split('/');
  // tenants/{tenantId}/vehicles/{vehicleId}
  const ti = parts.indexOf('tenants');
  if (ti >= 0 && parts[ti + 1]) return parts[ti + 1];
  return '';
}

function isAlreadySold(data: Record<string, unknown>): boolean {
  const st = String(data.status ?? '')
    .toLowerCase()
    .trim();
  if (st === 'sold') return true;
  if (data.soldAt != null && data.soldAt !== '') return true;
  return false;
}

function isActiveListing(data: Record<string, unknown>): boolean {
  if (data.deleted === true) return false;
  if (isAlreadySold(data)) return false;
  const st = String(data.status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (st === 'hidden' || st === 'deleted' || st === 'inactive') return false;
  return ACTIVE_STATUSES.has(st);
}

/**
 * Busca vehículos en todos los tenants con el mismo VIN normalizado.
 * Incluye fallback por campo `vin` para docs legacy sin vinNormalized.
 */
export async function findVehiclesByVin(
  vinRaw: string,
  options: { activeOnly?: boolean } = {}
): Promise<VinListingMatch[]> {
  const vinNormalized = toVinNormalized(vinRaw);
  if (!vinNormalized) return [];

  const db = getDb();
  const byKey = new Map<string, VinListingMatch>();

  const ingest = (docs: Array<{ id: string; ref: { path?: string }; data: () => Record<string, unknown> }>) => {
    for (const doc of docs) {
      const data = doc.data() || {};
      const tenantId =
        (typeof data.tenantId === 'string' && data.tenantId) || resolveTenantIdFromRef(doc.ref);
      if (!tenantId) continue;
      if (options.activeOnly && !isActiveListing(data)) continue;
      const key = `${tenantId}/${doc.id}`;
      byKey.set(key, {
        tenantId,
        vehicleId: doc.id,
        status: typeof data.status === 'string' ? data.status : undefined,
        make: typeof data.make === 'string' ? data.make : undefined,
        model: typeof data.model === 'string' ? data.model : undefined,
        year: typeof data.year === 'number' ? data.year : undefined,
        vin: typeof data.vin === 'string' ? data.vin : undefined,
        vinNormalized:
          typeof data.vinNormalized === 'string'
            ? data.vinNormalized
            : toVinNormalized(
                (data.vin as string) ||
                  (data.specifications as { vin?: string } | undefined)?.vin
              ) || undefined,
      });
    }
  };

  try {
    const snapNorm = await db
      .collectionGroup('vehicles')
      .where('vinNormalized', '==', vinNormalized)
      .get();
    ingest(snapNorm.docs as any);
  } catch (error) {
    console.warn('findVehiclesByVin: query vinNormalized falló:', error);
  }

  // Legacy: mismo VIN en campo `vin` (uppercase sin guiones)
  try {
    const snapVin = await db.collectionGroup('vehicles').where('vin', '==', vinNormalized).get();
    ingest(snapVin.docs as any);
  } catch (error) {
    console.warn('findVehiclesByVin: query vin falló:', error);
  }

  return Array.from(byKey.values());
}

/** Listados activos del mismo VIN en otros tenants (para avisos UI). */
export async function findActiveVinConflicts(
  vinRaw: string,
  exclude?: { tenantId?: string; vehicleId?: string }
): Promise<VinListingMatch[]> {
  const matches = await findVehiclesByVin(vinRaw, { activeOnly: true });
  return matches.filter((m) => {
    if (exclude?.tenantId && exclude?.vehicleId) {
      return !(m.tenantId === exclude.tenantId && m.vehicleId === exclude.vehicleId);
    }
    if (exclude?.tenantId) {
      return m.tenantId !== exclude.tenantId;
    }
    return true;
  });
}

/**
 * Marca vendidos todos los listados activos con el mismo VIN (excepto el origen).
 */
export async function syncSoldStatusByVin(
  sourceTenantId: string,
  sourceVehicleId: string,
  vinRaw: string,
  options: VinSoldSyncOptions = {}
): Promise<VinSoldSyncResult> {
  const empty: VinSoldSyncResult = {
    vinNormalized: '',
    updated: 0,
    skipped: 0,
    matches: [],
  };

  if (options.skipVinSoldSync) return empty;

  const vinNormalized = toVinNormalized(vinRaw);
  if (!vinNormalized || !isValidVinFormat(vinNormalized)) {
    return empty;
  }

  const matches = await findVehiclesByVin(vinNormalized);
  const FieldValue = getFirestoreFieldValue();
  const ts = FieldValue.serverTimestamp();
  const sourcePath = `tenants/${sourceTenantId}/vehicles/${sourceVehicleId}`;
  const db = getDb();

  let updated = 0;
  let skipped = 0;
  const notifiedTenants = new Set<string>();

  for (const match of matches) {
    if (match.tenantId === sourceTenantId && match.vehicleId === sourceVehicleId) {
      skipped++;
      continue;
    }

    const ref = db
      .collection('tenants')
      .doc(match.tenantId)
      .collection('vehicles')
      .doc(match.vehicleId);

    try {
      const snap = await ref.get();
      if (!snap.exists) {
        skipped++;
        continue;
      }
      const data = snap.data() || {};

      // Idempotencia: ya vendido o ya sincronizado desde esta fuente
      if (isAlreadySold(data)) {
        skipped++;
        continue;
      }
      if (data.soldSyncedFrom === sourcePath) {
        skipped++;
        continue;
      }

      const showPublic = Boolean(options.showPublicSoldBadge);
      await ref.update({
        status: 'sold',
        showSoldBadge: true,
        showPublicSoldBadge: showPublic,
        publishedOnPublicPage: showPublic,
        soldAt: ts,
        deleted: false,
        vinNormalized,
        vin: normalizeVin(data.vin || vinNormalized) || vinNormalized,
        soldReason: options.soldReason || 'vin_cross_tenant_sync',
        soldSyncedFrom: sourcePath,
        soldSyncedAt: ts,
        soldSyncedSourceTenantId: sourceTenantId,
        soldSyncedSourceVehicleId: sourceVehicleId,
        updatedAt: ts,
      });
      updated++;

      if (!notifiedTenants.has(match.tenantId)) {
        notifiedTenants.add(match.tenantId);
        const label =
          [match.year, match.make, match.model].filter(Boolean).join(' ') ||
          vinNormalized;
        try {
          await notifyManagersAndAdmins(match.tenantId, {
            type: 'system_alert',
            title: 'Vehículo marcado vendido (VIN)',
            message: `${label} (VIN ${vinNormalized}) se marcó vendido en otra cuenta. Se actualizó tu inventario automáticamente.`,
            metadata: {
              vinNormalized,
              sourceTenantId,
              sourceVehicleId,
              vehicleId: match.vehicleId,
              reason: 'vin_cross_tenant_sync',
            },
          });
        } catch (notifError) {
          console.warn('syncSoldStatusByVin: notificación falló', match.tenantId, notifError);
        }
      }
    } catch (error) {
      console.warn(
        'syncSoldStatusByVin: error actualizando',
        match.tenantId,
        match.vehicleId,
        error
      );
      skipped++;
    }
  }

  // Asegurar vinNormalized en el origen (best-effort)
  try {
    await db
      .collection('tenants')
      .doc(sourceTenantId)
      .collection('vehicles')
      .doc(sourceVehicleId)
      .update({
        vinNormalized,
        updatedAt: ts,
      });
  } catch {
    // ignore
  }

  return { vinNormalized, updated, skipped, matches };
}
