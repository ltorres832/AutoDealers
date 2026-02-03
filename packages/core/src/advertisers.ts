// Sistema de anunciantes (empresas externas)

import { getFirestore, getAuth } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

export interface Advertiser {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone?: string;
  website?: string;
  industry: 'automotive' | 'insurance' | 'banking' | 'finance' | 'other';
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  plan: 'starter' | 'professional' | 'premium' | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  defaultPaymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface SponsoredContent {
  id: string;
  advertiserId: string;
  advertiserName: string;
  campaignName?: string;
  type: 'banner' | 'promotion' | 'sponsor';
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  linkUrl: string;
  linkType: 'external' | 'landing_page';
  
  // Targeting opcional
  targetLocation?: string[];
  targetVehicleTypes?: string[];
  
  // Presupuesto y duración
  budget: number;
  budgetType: 'monthly' | 'total';
  startDate: Date;
  endDate: Date;
  
  // Métricas
  impressions: number;
  clicks: number;
  conversions: number;
  
  // Estado y aprobación
  status: 'pending' | 'approved' | 'active' | 'paused' | 'expired' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  
  // Stripe
  stripeSubscriptionId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea un nuevo anunciante
 */
export async function createAdvertiser(
  advertiserData: Omit<Advertiser, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Advertiser> {
  // Crear usuario en Firebase Auth
  const password = Math.random().toString(36).slice(-12) + 'A1!'; // Generar password temporal
  const userRecord = await auth.createUser({
    email: advertiserData.email,
    password,
    displayName: advertiserData.contactName,
  });

  // Establecer custom claims
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'advertiser',
  });

  // Crear documento en Firestore
  const advertiserRef = getDb().collection('advertisers').doc(userRecord.uid);
  
  await advertiserRef.set({
    ...advertiserData,
    status: advertiserData.status || 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // TODO: Enviar email con credenciales

  return {
    id: advertiserRef.id,
    ...advertiserData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene un anunciante por ID
 */
export async function getAdvertiserById(advertiserId: string): Promise<Advertiser | null> {
  const doc = await getDb().collection('advertisers').doc(advertiserId).get();
  
  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    defaultPaymentMethod: data?.defaultPaymentMethod,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    lastLogin: data?.lastLogin?.toDate(),
  } as Advertiser;
}

/**
 * Crea contenido patrocinado con validación de límites del plan
 */
export async function createSponsoredContent(
  contentData: Omit<SponsoredContent, 'id' | 'createdAt' | 'updatedAt' | 'impressions' | 'clicks' | 'conversions'>
): Promise<SponsoredContent> {
  // Validar límites del plan
  const { canCreateBanner } = await import('./advertiser-limits');
  const bannerCheck = await canCreateBanner(contentData.advertiserId, contentData.placement);
  
  if (!bannerCheck.allowed) {
    throw new Error(bannerCheck.reason || 'No se puede crear el banner');
  }

  const contentRef = getDb().collection('sponsored_content').doc();
  
  await contentRef.set({
    ...contentData,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    status: contentData.status || 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: contentRef.id,
    ...contentData,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene contenido patrocinado activo para mostrar públicamente
 */
export async function getActiveSponsoredContent(
  placement?: SponsoredContent['placement'],
  limit?: number
): Promise<SponsoredContent[]> {
  let query: admin.firestore.Query = getDb().collection('sponsored_content')
    .where('status', '==', 'active');

  if (placement) {
    query = query.where('placement', '==', placement);
  }

  const now = admin.firestore.Timestamp.now();
  query = query
    .where('startDate', '<=', now)
    .where('endDate', '>=', now);

  query = query.orderBy('createdAt', 'desc');

  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      approvedAt: data.approvedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SponsoredContent;
  });
}

/**
 * Actualiza métricas de contenido patrocinado con validación de límites
 */
export async function updateSponsoredContentMetrics(
  contentId: string,
  type: 'impression' | 'click' | 'conversion'
): Promise<{ success: boolean; reason?: string }> {
  // Obtener el contenido para verificar límites
  const contentDoc = await getDb().collection('sponsored_content').doc(contentId).get();
  if (!contentDoc.exists) {
    throw new Error('Contenido no encontrado');
  }

  const content = contentDoc.data() as any;
  const advertiserId = content.advertiserId;

  // Si es una impresión, verificar límites del plan
  if (type === 'impression') {
    const { checkAndIncrementImpression } = await import('./advertiser-limits');
    const check = await checkAndIncrementImpression(contentId, advertiserId);
    
    if (!check.allowed) {
      // Pausar automáticamente el contenido si alcanzó el límite
      await getDb().collection('sponsored_content').doc(contentId).update({
        status: 'paused',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return {
        success: false,
        reason: check.reason || 'Límite de impresiones alcanzado',
      };
    }

    // Registrar impresión en métricas mensuales
    const { recordMonthlyImpression } = await import('./advertiser-metrics');
    await recordMonthlyImpression(contentId, advertiserId);
  }

  const contentRef = getDb().collection('sponsored_content').doc(contentId);
  const updateData: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  switch (type) {
    case 'impression':
      updateData.impressions = admin.firestore.FieldValue.increment(1);
      break;
    case 'click':
      updateData.clicks = admin.firestore.FieldValue.increment(1);
      // También actualizar métricas mensuales para clicks
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const metricsRef = getDb().collection('sponsored_content')
        .doc(contentId)
        .collection('monthly_metrics')
        .doc(monthKey);
      const metricsDoc = await metricsRef.get();
      if (metricsDoc.exists) {
        await metricsRef.update({
          clicks: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await metricsRef.set({
          month: monthKey,
          impressions: 0,
          clicks: 1,
          conversions: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      break;
    case 'conversion':
      updateData.conversions = admin.firestore.FieldValue.increment(1);
      // También actualizar métricas mensuales para conversiones
      const now2 = new Date();
      const monthKey2 = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`;
      const metricsRef2 = getDb().collection('sponsored_content')
        .doc(contentId)
        .collection('monthly_metrics')
        .doc(monthKey2);
      const metricsDoc2 = await metricsRef2.get();
      if (metricsDoc2.exists) {
        await metricsRef2.update({
          conversions: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await metricsRef2.set({
          month: monthKey2,
          impressions: 0,
          clicks: 0,
          conversions: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      break;
  }

  await contentRef.update(updateData);
  return { success: true };
}

/**
 * Obtiene contenido patrocinado de un anunciante
 */
export async function getAdvertiserContent(advertiserId: string): Promise<SponsoredContent[]> {
  // Evitar requerir índices compuestos: no usamos orderBy para este listado.
  const snapshot = await getDb().collection('sponsored_content')
    .where('advertiserId', '==', advertiserId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      approvedAt: data.approvedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SponsoredContent;
  });
}

