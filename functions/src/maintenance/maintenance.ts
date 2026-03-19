// Cloud Functions para Maintenance Mode

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener estado de mantenimiento
 */
export const getMaintenanceStatus = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const maintenanceDoc = await db.collection('admin_config').doc('maintenance').get();

      if (!maintenanceDoc.exists) {
        // Por defecto, mantenimiento desactivado
        return {
          enabled: false,
          message: '',
          scheduledStart: null,
          scheduledEnd: null,
        };
      }

      const maintenanceData = maintenanceDoc.data();
      return {
        enabled: maintenanceData?.enabled || false,
        message: maintenanceData?.message || '',
        scheduledStart: maintenanceData?.scheduledStart?.toDate() || null,
        scheduledEnd: maintenanceData?.scheduledEnd?.toDate() || null,
        allowedIPs: maintenanceData?.allowedIPs || [],
        allowedUsers: maintenanceData?.allowedUsers || [],
      };
    } catch (error: any) {
      console.error('Error getting maintenance status:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get maintenance status: ${error.message}`);
    }
  }
);

/**
 * Activar/Desactivar modo de mantenimiento (solo admin)
 */
export const setMaintenanceMode = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Verificar que sea admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can set maintenance mode');
      }

      const { enabled, message, scheduledStart, scheduledEnd, allowedIPs, allowedUsers } = request.data;

      if (enabled === undefined) {
        throw new HttpsError('invalid-argument', 'Enabled status is required');
      }

      const maintenanceData: any = {
        enabled,
        message: message || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      };

      if (scheduledStart) {
        maintenanceData.scheduledStart = admin.firestore.Timestamp.fromDate(new Date(scheduledStart));
      }

      if (scheduledEnd) {
        maintenanceData.scheduledEnd = admin.firestore.Timestamp.fromDate(new Date(scheduledEnd));
      }

      if (allowedIPs && Array.isArray(allowedIPs)) {
        maintenanceData.allowedIPs = allowedIPs;
      }

      if (allowedUsers && Array.isArray(allowedUsers)) {
        maintenanceData.allowedUsers = allowedUsers;
      }

      await db.collection('admin_config').doc('maintenance').set(maintenanceData, { merge: true });

      return {
        success: true,
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      };
    } catch (error: any) {
      console.error('Error setting maintenance mode:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to set maintenance mode: ${error.message}`);
    }
  }
);

/**
 * Verificar si el sistema está en mantenimiento (público)
 */
export const checkMaintenanceMode = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const maintenanceDoc = await db.collection('admin_config').doc('maintenance').get();

      if (!maintenanceDoc.exists) {
        return { inMaintenance: false };
      }

      const maintenanceData = maintenanceDoc.data();
      const enabled = maintenanceData?.enabled || false;

      if (!enabled) {
        return { inMaintenance: false };
      }

      // Verificar si hay mantenimiento programado
      const now = new Date();
      const scheduledStart = maintenanceData?.scheduledStart?.toDate();
      const scheduledEnd = maintenanceData?.scheduledEnd?.toDate();

      if (scheduledStart && scheduledEnd) {
        if (now < scheduledStart || now > scheduledEnd) {
          return { inMaintenance: false };
        }
      }

      // Verificar IPs permitidas si se proporciona
      const clientIP = request.rawRequest?.ip || '';
      const allowedIPs = maintenanceData?.allowedIPs || [];
      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        return {
          inMaintenance: true,
          message: maintenanceData?.message || 'El sistema está en mantenimiento',
        };
      }

      // Verificar usuarios permitidos si se proporciona
      if (request.auth) {
        const allowedUsers = maintenanceData?.allowedUsers || [];
        if (allowedUsers.length > 0 && allowedUsers.includes(request.auth.uid)) {
          return { inMaintenance: false };
        }
      }

      return {
        inMaintenance: true,
        message: maintenanceData?.message || 'El sistema está en mantenimiento',
      };
    } catch (error: any) {
      console.error('Error checking maintenance mode:', error);
      // En caso de error, no bloquear el acceso
      return { inMaintenance: false };
    }
  }
);


