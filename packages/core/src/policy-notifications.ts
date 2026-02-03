// Sistema de Notificaciones para Nuevas Versiones de Políticas

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';
import { createNotification } from './notifications';
import { getRequiredPoliciesForUser, hasUserAcceptedPolicy } from './policies';

function getDb() {
  // Solo ejecutar en el servidor
  if (typeof window !== 'undefined') {
    throw new Error('Esta función solo puede ejecutarse en el servidor');
  }
  
  const db = getFirestore();
  
  // Validar que db es un objeto Firestore válido
  if (!db || typeof getDb().collection !== 'function') {
    throw new Error('Firestore no está inicializado correctamente');
  }
  
  return db;
}

/**
 * Verifica y envía notificaciones para nuevas versiones de políticas requeridas
 */
export async function checkAndNotifyPolicyUpdates(
  userId: string,
  role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser',
  tenantId?: string
): Promise<void> {
  try {
    // Obtener políticas requeridas que el usuario aún no ha aceptado
    const requiredPolicies = await getRequiredPoliciesForUser(userId, role, tenantId);
    
    if (requiredPolicies.length === 0) {
      return; // No hay políticas pendientes
    }

    // Verificar si ya hay notificaciones pendientes para estas políticas
    const db = getDb();
    const notificationsSnapshot = await getDb().collection('tenants')
      .doc(tenantId || 'global')
      .collection('notifications')
      .where('userId', '==', userId)
      .where('type', '==', 'policy_update')
      .where('read', '==', false)
      .get();

    const existingPolicyIds = new Set(
      notificationsSnapshot.docs.map(doc => doc.data().metadata?.policyId).filter(Boolean)
    );

    // Crear notificaciones para políticas nuevas o actualizadas
    for (const policy of requiredPolicies) {
      // Verificar si el usuario ya aceptó una versión anterior
      const hasAcceptedPrevious = await hasUserAcceptedPolicy(userId, policy.id);
      
      // Si ya hay una notificación pendiente para esta política, no crear otra
      if (existingPolicyIds.has(policy.id)) {
        continue;
      }

      // Crear notificación
      await createNotification({
        tenantId: tenantId || 'global',
        userId,
        type: 'policy_update' as any,
        title: hasAcceptedPrevious 
          ? `Nueva versión de política: ${policy.title}`
          : `Política requerida: ${policy.title}`,
        message: hasAcceptedPrevious
          ? `Hay una nueva versión (${policy.version}) de la política "${policy.title}" que debes aceptar.`
          : `Debes aceptar la política "${policy.title}" para continuar usando la plataforma.`,
        channels: ['system'],
        metadata: {
          policyId: policy.id,
          policyType: policy.type,
          policyVersion: policy.version,
          isUpdate: hasAcceptedPrevious,
        },
      });
    }
  } catch (error) {
    console.error('Error checking and notifying policy updates:', error);
  }
}

/**
 * Envía notificación cuando se crea o actualiza una política requerida
 */
export async function notifyPolicyUpdate(
  policyId: string,
  policyTitle: string,
  policyVersion: string,
  applicableRoles: ('admin' | 'dealer' | 'seller' | 'public' | 'advertiser')[],
  tenantId?: string
): Promise<void> {
  try {
    // Obtener todos los usuarios afectados
    const db = getDb();
    let usersQuery: admin.firestore.Query = getDb().collection('users');
    
    if (tenantId) {
      usersQuery = usersQuery.where('tenantId', '==', tenantId);
    }

    const usersSnapshot = await usersQuery.get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userRole = userData.role;

      // Verificar si el rol del usuario está en los roles aplicables
      if (!applicableRoles.includes(userRole)) {
        continue;
      }

      // Verificar si el usuario ya aceptó esta versión
      const hasAccepted = await hasUserAcceptedPolicy(userDoc.id, policyId, policyVersion);

      if (!hasAccepted) {
        // Verificar si aceptó una versión anterior
        const hasAcceptedPrevious = await hasUserAcceptedPolicy(userDoc.id, policyId);

        await createNotification({
          tenantId: tenantId || userData.tenantId || 'global',
          userId: userDoc.id,
          type: 'policy_update' as any,
          title: hasAcceptedPrevious
            ? `Nueva versión de política: ${policyTitle}`
            : `Política requerida: ${policyTitle}`,
          message: hasAcceptedPrevious
            ? `Hay una nueva versión (${policyVersion}) de la política "${policyTitle}" que debes aceptar.`
            : `Debes aceptar la política "${policyTitle}" para continuar usando la plataforma.`,
          channels: ['system'],
          metadata: {
            policyId,
            policyVersion,
            isUpdate: hasAcceptedPrevious,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error notifying policy update:', error);
  }
}

