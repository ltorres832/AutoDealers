// Sistema de Mantenimiento de Plataforma

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  currentStart?: Date;
  currentEnd?: Date;
  affectedDashboards: ('admin' | 'dealer' | 'seller' | 'public')[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Obtiene el estado actual del modo de mantenimiento
 */
export async function getMaintenanceMode(): Promise<MaintenanceMode | null> {
  const doc = await getDb().collection('system_settings').doc('maintenance_mode').get();
  
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data();
  return {
    enabled: data?.enabled || false,
    message: data?.message || 'La plataforma está en mantenimiento. Por favor, vuelve más tarde.',
    scheduledStart: data?.scheduledStart?.toDate(),
    scheduledEnd: data?.scheduledEnd?.toDate(),
    currentStart: data?.currentStart?.toDate(),
    currentEnd: data?.currentEnd?.toDate(),
    affectedDashboards: data?.affectedDashboards || [],
    createdAt: data?.createdAt?.toDate(),
    updatedAt: data?.updatedAt?.toDate(),
  } as MaintenanceMode;
}

/**
 * Verifica si el modo de mantenimiento está activo
 */
export async function isMaintenanceModeActive(): Promise<boolean> {
  const mode = await getMaintenanceMode();
  
  if (!mode || !mode.enabled) {
    return false;
  }
  
  // Verificar si hay una fecha de finalización y si ya pasó
  if (mode.currentEnd) {
    const now = new Date();
    if (now > mode.currentEnd) {
      // El mantenimiento ya terminó, desactivarlo automáticamente
      await updateMaintenanceMode({
        enabled: false,
        message: mode.message,
        affectedDashboards: mode.affectedDashboards,
      });
      return false;
    }
  }
  
  return true;
}

/**
 * Actualiza el modo de mantenimiento
 */
export async function updateMaintenanceMode(
  mode: Partial<MaintenanceMode>
): Promise<MaintenanceMode> {
  const existing = await getMaintenanceMode();
  
  const updateData: any = {
    ...existing,
    ...mode,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  // Si se está activando, establecer currentStart
  if (mode.enabled && !existing?.enabled) {
    updateData.currentStart = admin.firestore.FieldValue.serverTimestamp();
  }
  
  // Si se está desactivando, limpiar currentStart y currentEnd
  if (mode.enabled === false && existing?.enabled) {
    updateData.currentStart = null;
    updateData.currentEnd = null;
  }
  
  // Si no existe, establecer createdAt
  if (!existing) {
    updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  
  await getDb().collection('system_settings').doc('maintenance_mode').set(updateData, { merge: true });
  
  return await getMaintenanceMode() as MaintenanceMode;
}

