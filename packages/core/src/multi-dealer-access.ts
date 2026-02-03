/**
 * Funciones para verificar y gestionar acceso Multi Dealer
 * El acceso es válido por 48 horas después de la aprobación
 */

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface MultiDealerAccess {
  hasAccess: boolean;
  approvedUntil?: Date;
  hoursRemaining?: number;
  isExpired: boolean;
}

/**
 * Verifica si un usuario tiene acceso activo a membresías Multi Dealer
 * El acceso es válido por 48 horas después de la aprobación
 */
export async function checkMultiDealerAccess(userId: string): Promise<MultiDealerAccess> {
  try {
    // Buscar solicitud Multi Dealer aprobada
    const requestDoc = await getDb().collection('multi_dealer_requests').doc(userId).get();

    if (!requestDoc.exists) {
      return {
        hasAccess: false,
        isExpired: false,
      };
    }

    const request = requestDoc.data();

    // Verificar que esté aprobada
    if (request?.status !== 'approved') {
      return {
        hasAccess: false,
        isExpired: false,
      };
    }

    // Verificar fecha de expiración
    const approvedUntil = request?.approvedUntil?.toDate?.();
    if (!approvedUntil) {
      return {
        hasAccess: false,
        isExpired: true,
      };
    }

    const now = new Date();
    const hoursSinceApproval = (now.getTime() - approvedUntil.getTime()) / (1000 * 60 * 60);

    // Si ha pasado más de 48 horas, el acceso expiró
    if (hoursSinceApproval > 48) {
      // Actualizar estado a expirado
      await getDb().collection('multi_dealer_requests').doc(userId).update({
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Deshabilitar usuario
      const { getAuth } = await import('./firebase');
      const auth = getAuth();
      try {
        await auth.updateUser(userId, {
          disabled: true,
        });
      } catch (error) {
        console.error('Error disabling user:', error);
      }

      // Actualizar usuario en Firestore
      await getDb().collection('users').doc(userId).update({
        multiDealerAccess: false,
        multiDealerAccessUntil: null,
        status: 'suspended',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        hasAccess: false,
        approvedUntil,
        hoursRemaining: 0,
        isExpired: true,
      };
    }

    const hoursRemaining = 48 - hoursSinceApproval;

    return {
      hasAccess: true,
      approvedUntil,
      hoursRemaining: Math.max(0, hoursRemaining),
      isExpired: false,
    };
  } catch (error) {
    console.error('Error checking multi dealer access:', error);
    return {
      hasAccess: false,
      isExpired: false,
    };
  }
}

/**
 * Verifica si un usuario puede ver una membresía Multi Dealer específica
 */
export async function canViewMultiDealerMembership(
  userId: string,
  membershipId: string
): Promise<boolean> {
  const access = await checkMultiDealerAccess(userId);
  
  if (!access.hasAccess) {
    return false;
  }

  // Verificar que la membresía solicitada coincida con la aprobada
  const requestDoc = await getDb().collection('multi_dealer_requests').doc(userId).get();
  if (!requestDoc.exists) {
    return false;
  }

  const request = requestDoc.data();
  return request?.membershipId === membershipId;
}



