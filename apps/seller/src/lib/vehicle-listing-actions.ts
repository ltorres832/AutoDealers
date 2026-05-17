/**
 * Acciones de listado en inventario (misma instancia Firestore que el resto del panel vendedor).
 */
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import type { VehicleListingAction } from '@autodealers/inventory';

function fieldValue() {
  getFirestore();
  return admin.firestore.FieldValue;
}

export async function applyVehicleListingActionForSeller(
  tenantId: string,
  vehicleId: string,
  action: VehicleListingAction,
  options?: { showPublicSoldBadge?: boolean }
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Vehicle not found');
  }

  const ts = fieldValue().serverTimestamp();
  const base = { updatedAt: ts };

  switch (action) {
    case 'sold': {
      const showPublic = Boolean(options?.showPublicSoldBadge);
      await ref.update({
        ...base,
        status: 'sold',
        showSoldBadge: true,
        showPublicSoldBadge: showPublic,
        publishedOnPublicPage: showPublic,
        soldAt: ts,
        deleted: false,
      });
      return;
    }
    case 'hide':
      await ref.update({
        ...base,
        status: 'hidden',
        showSoldBadge: false,
        showPublicSoldBadge: false,
        publishedOnPublicPage: false,
        deleted: false,
      });
      return;
    case 'reactivate': {
      const FieldValue = fieldValue();
      await ref.update({
        ...base,
        status: 'available',
        showSoldBadge: false,
        showPublicSoldBadge: false,
        publishedOnPublicPage: true,
        deleted: false,
        soldAt: FieldValue.delete(),
        verificationStatus: FieldValue.delete(),
        vehicleStatus: FieldValue.delete(),
      });
      return;
    }
    case 'delete':
      await ref.update({
        ...base,
        status: 'hidden',
        showSoldBadge: false,
        showPublicSoldBadge: false,
        publishedOnPublicPage: false,
        deleted: true,
      });
      return;
    default:
      throw new Error(`Unknown listing action: ${action}`);
  }
}

export async function keepVehicleListingActiveForSeller(
  tenantId: string,
  vehicleId: string
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
  await ref.update({
    status: 'available',
    showSoldBadge: false,
    showPublicSoldBadge: false,
    publishedOnPublicPage: true,
    deleted: false,
    updatedAt: fieldValue().serverTimestamp(),
  });
}
