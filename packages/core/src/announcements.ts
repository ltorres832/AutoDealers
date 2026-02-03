// Sistema de Anuncios y Notificaciones Globales

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';
import { createNotification } from './notifications';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export interface GlobalAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetDashboards: ('admin' | 'dealer' | 'seller' | 'public')[];
  targetRoles?: ('admin' | 'dealer' | 'seller' | 'advertiser')[];
  targetTenants?: string[]; // IDs específicos de tenants, si está vacío es para todos
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  showDismissButton: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  dismissedBy?: string[]; // IDs de usuarios que han descartado el anuncio
}

/**
 * Crea un nuevo anuncio global
 */
export async function createGlobalAnnouncement(
  announcement: Omit<GlobalAnnouncement, 'id' | 'createdAt' | 'updatedAt' | 'dismissedBy'>,
  sendNotifications: boolean = true
): Promise<GlobalAnnouncement> {
  const docRef = getDb().collection('global_announcements').doc();
  
  const announcementData: any = {
    ...announcement,
    dismissedBy: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  await docRef.set(announcementData);
  
  const created: GlobalAnnouncement = {
    id: docRef.id,
    ...announcement,
    dismissedBy: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Enviar notificaciones si se solicita
  if (sendNotifications && announcement.isActive) {
    await sendAnnouncementNotifications(created);
  }
  
  return created;
}

/**
 * Envía notificaciones del anuncio a los usuarios afectados
 */
async function sendAnnouncementNotifications(announcement: GlobalAnnouncement): Promise<void> {
  // Obtener todos los tenants si no hay targets específicos
  const tenantsSnapshot = announcement.targetTenants && announcement.targetTenants.length > 0
    ? await Promise.all(announcement.targetTenants.map(id => getDb().collection('tenants').doc(id).get()))
    : await getDb().collection('tenants').get();
  
  const tenants = announcement.targetTenants && announcement.targetTenants.length > 0
    ? (tenantsSnapshot as any[]).filter((doc: any) => doc.exists).map((doc: any) => doc.id)
    : (tenantsSnapshot as any).docs.map((doc: any) => doc.id);
  
  // Enviar notificaciones a cada tenant afectado
  for (const tenantId of tenants) {
    // Obtener usuarios del tenant con los roles objetivo
    const usersQuery = getDb().collection('users')
      .where('tenantId', '==', tenantId);
    
    if (announcement.targetRoles && announcement.targetRoles.length > 0) {
      usersQuery.where('role', 'in', announcement.targetRoles);
    }
    
    const usersSnapshot = await usersQuery.get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Verificar si el dashboard del usuario está en los targets
      const userDashboard = userData.role === 'admin' ? 'admin' :
                           userData.role === 'dealer' ? 'dealer' :
                           userData.role === 'seller' ? 'seller' : 'public';
      
      if (announcement.targetDashboards.includes(userDashboard)) {
        await createNotification({
          tenantId,
          userId: userDoc.id,
          type: 'announcement' as any,
          title: announcement.title,
          message: announcement.message,
          channels: ['system'],
          metadata: {
            announcementId: announcement.id,
            priority: announcement.priority,
            actionUrl: announcement.actionUrl,
          },
        });
      }
    }
  }
}

/**
 * Obtiene anuncios activos para un dashboard específico
 */
export async function getActiveAnnouncements(
  dashboard: 'admin' | 'dealer' | 'seller' | 'public',
  userId?: string,
  tenantId?: string
): Promise<GlobalAnnouncement[]> {
  const now = new Date();
  
  let query: admin.firestore.Query = getDb().collection('global_announcements')
    .where('isActive', '==', true)
    .where('targetDashboards', 'array-contains', dashboard);
  
  const snapshot = await query.get();
  
  const announcements: GlobalAnnouncement[] = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Verificar fechas
    if (data.startDate && data.startDate.toDate() > now) {
      return; // Aún no ha comenzado
    }
    
    if (data.endDate && data.endDate.toDate() < now) {
      return; // Ya terminó
    }
    
    // Verificar si el usuario ya lo descartó
    if (userId && data.dismissedBy && data.dismissedBy.includes(userId)) {
      return;
    }
    
    // Verificar si hay targets específicos de tenants
    if (data.targetTenants && data.targetTenants.length > 0) {
      if (!tenantId || !data.targetTenants.includes(tenantId)) {
        return; // No aplica a este tenant
      }
    }
    
    announcements.push({
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      dismissedBy: data.dismissedBy || [],
    } as GlobalAnnouncement);
  });
  
  // Ordenar por prioridad (urgent > high > medium > low)
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
  announcements.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  
  return announcements;
}

/**
 * Marca un anuncio como descartado por un usuario
 */
export async function dismissAnnouncement(
  announcementId: string,
  userId: string
): Promise<void> {
  const docRef = getDb().collection('global_announcements').doc(announcementId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    throw new Error('Anuncio no encontrado');
  }
  
  const data = doc.data();
  const dismissedBy = data?.dismissedBy || [];
  
  if (!dismissedBy.includes(userId)) {
    await docRef.update({
      dismissedBy: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Obtiene todos los anuncios (para admin)
 */
export async function getAllAnnouncements(): Promise<GlobalAnnouncement[]> {
  const snapshot = await getDb().collection('global_announcements')
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate(),
    endDate: doc.data().endDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    dismissedBy: doc.data().dismissedBy || [],
  })) as GlobalAnnouncement[];
}

/**
 * Actualiza un anuncio
 */
export async function updateGlobalAnnouncement(
  announcementId: string,
  updates: Partial<GlobalAnnouncement>
): Promise<GlobalAnnouncement> {
  const docRef = getDb().collection('global_announcements').doc(announcementId);
  
  const updateData: any = {
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  // Eliminar campos que no deben actualizarse directamente
  delete updateData.id;
  delete updateData.createdAt;
  delete updateData.createdBy;
  
  await docRef.update(updateData);
  
  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data(),
    startDate: updated.data()?.startDate?.toDate(),
    endDate: updated.data()?.endDate?.toDate(),
    createdAt: updated.data()?.createdAt?.toDate() || new Date(),
    updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
    dismissedBy: updated.data()?.dismissedBy || [],
  } as GlobalAnnouncement;
}

/**
 * Elimina un anuncio
 */
export async function deleteGlobalAnnouncement(announcementId: string): Promise<void> {
  await getDb().collection('global_announcements').doc(announcementId).delete();
}

