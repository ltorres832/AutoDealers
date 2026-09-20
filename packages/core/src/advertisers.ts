// Sistema de anunciantes (empresas externas)

import { getFirestore, getAuth } from '@autodealers/shared';
import { PLATFORM_NAME } from '@autodealers/shared/platform-sender';
import { sendOutboundEmail } from './messaging-outbound';
import { normalizeLoginEmail } from './user-auth-sync';
import {
  ensureAuthAccount,
  findPlatformProfile,
  PlatformProfileExistsError,
  storeAppPasswordForProfile,
} from './platform-registration';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

export type AdvertiserRegistrationSource = 'self' | 'admin';

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
  registrationSource?: AdvertiserRegistrationSource;
  createdBy?: string;
  createdByName?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  assignedAt?: Date;
  assignedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface AdvertiserAccountMeta {
  registrationSource: AdvertiserRegistrationSource;
  createdBy?: string;
  createdByName?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  assignedBy?: string;
}

export async function resolvePlatformAdminName(adminId?: string): Promise<string | undefined> {
  if (!adminId?.trim()) return undefined;
  const userDoc = await getDb().collection('users').doc(adminId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    return (data?.name as string) || (data?.email as string) || undefined;
  }
  const adminDoc = await getDb().collection('admin_users').doc(adminId).get();
  if (adminDoc.exists) {
    const data = adminDoc.data();
    return (data?.name as string) || (data?.email as string) || undefined;
  }
  return undefined;
}

export async function notifyAdvertiserAccountCreated(params: {
  advertiserId: string;
  companyName: string;
  contactName: string;
  email: string;
  registrationSource: AdvertiserRegistrationSource;
  createdByName?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
}): Promise<void> {
  const { notifyPlatformAdmins, notifyUser } = await import('./notifications');
  const { PLATFORM_ADMIN_TENANT_ID } = await import('./platform-social');

  const originLabel =
    params.registrationSource === 'self'
      ? 'Auto-registro'
      : `Admin${params.createdByName ? `: ${params.createdByName}` : ''}`;

  const assigneeSuffix = params.assignedAdminName
    ? ` · Asignado a ${params.assignedAdminName}`
    : '';

  await notifyPlatformAdmins({
    type: 'system_alert',
    title:
      params.registrationSource === 'self'
        ? 'Nuevo anunciante registrado'
        : 'Nuevo anunciante creado',
    message: `${params.companyName} (${params.contactName}, ${params.email}) — ${originLabel}${assigneeSuffix}.`,
    audience: 'platform',
    metadata: {
      advertiserId: params.advertiserId,
      route: `/admin/advertisers/${params.advertiserId}`,
      registrationSource: params.registrationSource,
      assignedAdminId: params.assignedAdminId || '',
    },
  });

  if (params.assignedAdminId) {
    await notifyUser(PLATFORM_ADMIN_TENANT_ID, params.assignedAdminId, {
      type: 'system_alert',
      title: 'Anunciante asignado a ti',
      message: `Se te asignó la cuenta de ${params.companyName} (${params.email}).`,
      metadata: {
        advertiserId: params.advertiserId,
        route: `/admin/advertisers/${params.advertiserId}`,
      },
    });
  }
}

export async function assignAdvertiserToAdmin(
  advertiserId: string,
  assignedAdminId: string | null,
  assignedBy: string
): Promise<Advertiser | null> {
  const ref = getDb().collection('advertisers').doc(advertiserId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  let assignedAdminName: string | undefined;
  if (assignedAdminId) {
    assignedAdminName = await resolvePlatformAdminName(assignedAdminId);
    if (!assignedAdminName) {
      throw new Error('El administrador asignado no existe');
    }
  }

  const patch: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    assignedBy,
  };

  if (assignedAdminId) {
    patch.assignedAdminId = assignedAdminId;
    patch.assignedAdminName = assignedAdminName;
    patch.assignedAt = admin.firestore.FieldValue.serverTimestamp();
  } else {
    patch.assignedAdminId = admin.firestore.FieldValue.delete();
    patch.assignedAdminName = admin.firestore.FieldValue.delete();
    patch.assignedAt = admin.firestore.FieldValue.delete();
  }

  await ref.update(patch);

  const data = (await ref.get()).data();
  const companyName = String(data?.companyName || '');
  const email = String(data?.email || '');

  if (assignedAdminId && assignedAdminName) {
    const { notifyUser } = await import('./notifications');
    const { PLATFORM_ADMIN_TENANT_ID } = await import('./platform-social');
    await notifyUser(PLATFORM_ADMIN_TENANT_ID, assignedAdminId, {
      type: 'system_alert',
      title: 'Anunciante asignado a ti',
      message: `Se te asignó la cuenta de ${companyName} (${email}).`,
      metadata: {
        advertiserId,
        route: `/admin/advertisers/${advertiserId}`,
      },
    });
  }

  return getAdvertiserById(advertiserId);
}

export interface SponsoredContent {
  id: string;
  advertiserId: string;
  advertiserName: string;
  campaignName?: string;
  type: 'banner' | 'promotion' | 'sponsor';
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content' | 'vehicle_page';
  title: string;
  description: string;
  imageUrl: string;
  images?: string[];
  animation?: 'none' | 'fade' | 'slide' | 'kenburns';
  videoUrl?: string;
  linkUrl: string;
  linkType:
    | 'external'
    | 'landing_page'
    | 'marketplace'
    | 'inventory'
    | 'contact'
    | 'none';
  
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
  status:
    | 'pending'
    | 'approved'
    | 'active'
    | 'paused'
    | 'expired'
    | 'rejected'
    | 'payment_pending';
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
  advertiserData: Omit<
    Advertiser,
    'id' | 'createdAt' | 'updatedAt' | 'assignedAt' | 'lastLogin'
  >,
  meta?: AdvertiserAccountMeta
): Promise<Advertiser> {
  const normalizedEmail = normalizeLoginEmail(advertiserData.email);
  const existing = await findPlatformProfile(normalizedEmail, 'advertiser');
  if (existing) {
    throw new PlatformProfileExistsError('advertiser');
  }

  const password = Math.random().toString(36).slice(-12) + 'A1!';
  const { authUserId, created } = await ensureAuthAccount({
    email: normalizedEmail,
    password,
    displayName: advertiserData.contactName,
  });

  if (created) {
    await auth.setCustomUserClaims(authUserId, {
      role: 'advertiser',
    });
  }

  const advertiserRef = created
    ? getDb().collection('advertisers').doc(authUserId)
    : getDb().collection('advertisers').doc();
  
  const assignedAdminName = meta?.assignedAdminId
    ? meta.assignedAdminName || (await resolvePlatformAdminName(meta.assignedAdminId))
    : undefined;

  await advertiserRef.set({
    ...advertiserData,
    email: normalizedEmail,
    authUserId,
    status: advertiserData.status || 'pending',
    registrationSource: meta?.registrationSource || 'admin',
    ...(meta?.createdBy ? { createdBy: meta.createdBy } : {}),
    ...(meta?.createdByName ? { createdByName: meta.createdByName } : {}),
    ...(meta?.assignedAdminId
      ? {
          assignedAdminId: meta.assignedAdminId,
          assignedAdminName,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(meta.assignedBy ? { assignedBy: meta.assignedBy } : {}),
        }
      : {}),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  await storeAppPasswordForProfile({
    appKey: 'advertiser',
    email: normalizedEmail,
    profileId: advertiserRef.id,
    authUserId,
    password,
    source: 'admin',
  });

  void notifyAdvertiserAccountCreated({
    advertiserId: advertiserRef.id,
    companyName: advertiserData.companyName,
    contactName: advertiserData.contactName,
    email: advertiserData.email,
    registrationSource: meta?.registrationSource || 'admin',
    createdByName: meta?.createdByName,
    assignedAdminId: meta?.assignedAdminId,
    assignedAdminName,
  }).catch((err) => console.warn('notifyAdvertiserAccountCreated failed:', err));

  const loginUrl =
    process.env.NEXT_PUBLIC_ADVERTISER_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://advertiser.autodealers-online.com';

  try {
    await sendOutboundEmail(
      advertiserData.email,
      `Bienvenido a ${PLATFORM_NAME} — credenciales de acceso`,
      `<p>Hola ${advertiserData.contactName},</p>
<p>Tu cuenta de anunciante para <strong>${advertiserData.companyName}</strong> ha sido creada.</p>
<p><strong>Email:</strong> ${advertiserData.email}<br/>
<strong>Contraseña temporal:</strong> ${password}</p>
<p>Inicia sesión en <a href="${loginUrl}/login">${loginUrl}/login</a> y cambia tu contraseña lo antes posible.</p>
<p>Equipo ${PLATFORM_NAME}</p>`,
      'platform'
    );
  } catch (emailError) {
    console.warn('Advertiser welcome email failed:', emailError);
  }

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
  contentData: Omit<SponsoredContent, 'id' | 'createdAt' | 'updatedAt' | 'impressions' | 'clicks' | 'conversions'> & {
    status?: string;
    billingMode?: 'per_ad' | 'subscription';
  }
): Promise<SponsoredContent> {
  const payPerAd =
    contentData.billingMode === 'per_ad' ||
    contentData.status === 'payment_pending';

  // Suscripción mensual: validar límites del plan. Pago por anuncio: no exige plan.
  if (!payPerAd) {
    const { canCreateBanner } = await import('./advertiser-limits');
    const bannerCheck = await canCreateBanner(contentData.advertiserId, contentData.placement);

    if (!bannerCheck.allowed) {
      throw new Error(bannerCheck.reason || 'No se puede crear el banner');
    }
  }

  const contentRef = getDb().collection('sponsored_content').doc();

  const startDate =
    contentData.startDate instanceof Date
      ? admin.firestore.Timestamp.fromDate(contentData.startDate)
      : contentData.startDate;
  const endDate =
    contentData.endDate instanceof Date
      ? admin.firestore.Timestamp.fromDate(contentData.endDate)
      : contentData.endDate;

  await contentRef.set({
    ...contentData,
    startDate,
    endDate,
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

