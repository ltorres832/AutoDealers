import type { VehicleListingAction } from './types';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/core';
import * as admin from 'firebase-admin';

function getDb() {
  return getFirestore();
}

function fv() {
  getFirestore();
  return admin.firestore.FieldValue;
}

export type ApplyListingActionOptions = {
  /** Si action=sold: mantener visible en web con etiqueta SOLD */
  showPublicSoldBadge?: boolean;
};

export async function applyVehicleListingAction(
  tenantId: string,
  vehicleId: string,
  action: VehicleListingAction,
  options: ApplyListingActionOptions = {}
): Promise<void> {
  const ref = getDb().collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Vehicle not found');
  }

  const ts = getFirestoreFieldValue().serverTimestamp();
  const base = { updatedAt: ts };

  switch (action) {
    case 'sold': {
      const showPublic = Boolean(options.showPublicSoldBadge);
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
      const FieldValue = fv();
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

/** Mantener unidad en venta sin marcar vendida ni ocultar. */
export async function keepVehicleListingActive(
  tenantId: string,
  vehicleId: string
): Promise<void> {
  const ref = getDb().collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
  await ref.update({
    status: 'available',
    showSoldBadge: false,
    showPublicSoldBadge: false,
    publishedOnPublicPage: true,
    deleted: false,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
}
