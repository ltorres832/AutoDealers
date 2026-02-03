// Sistema de promociones y ofertas

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';
// Importación dinámica para evitar dependencias circulares
// import { getLeads } from '@autodealers/crm';
// import { createMessage } from '@autodealers/crm';
// import { UnifiedMessagingService } from '@autodealers/messaging';
import { AIAssistant } from '@autodealers/ai';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export type PromotionType = 'discount' | 'special' | 'clearance' | 'seasonal';

export type PromotionStatus = 'active' | 'scheduled' | 'paused' | 'expired';

export type PromotionScope = 'vehicle' | 'dealer' | 'seller'; // Tipo de promoción pagada

export interface Promotion {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: PromotionType;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  applicableVehicles?: string[]; // vehicleIds
  applicableToAll: boolean;
  startDate: Date;
  endDate?: Date;
  status: PromotionStatus;
  autoSendToLeads: boolean;
  autoSendToCustomers: boolean;
  channels: ('email' | 'sms' | 'whatsapp')[];
  aiGenerated: boolean;
  // Nuevos campos para promociones pagadas
  isPaid?: boolean; // Si es promoción pagada (aparece en landing)
  isFreePromotion?: boolean; // Si es promoción gratuita para landing (requiere feature)
  promotionScope?: PromotionScope; // 'vehicle' | 'dealer' | 'seller'
  vehicleId?: string; // Si es promoción de vehículo específico
  price?: number; // Precio de la promoción pagada
  duration?: number; // Duración en días (3, 7, 15, 30)
  paymentId?: string; // ID del pago en Stripe
  paidAt?: Date; // Fecha de pago
  expiresAt?: Date; // Fecha de expiración (startDate + duration)
  views?: number; // Contador de vistas
  clicks?: number; // Contador de clics
  priority?: number; // Prioridad para ordenamiento (mayor = más arriba)
  // Métricas de redes sociales
  socialMetrics?: {
    facebook?: {
      views?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      engagement?: number;
    };
    instagram?: {
      views?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      engagement?: number;
    };
  };
  // IDs de posts en redes sociales
  socialPostIds?: {
    facebook?: string;
    instagram?: string;
  };
  // Campos para promociones internas del admin
  isInternal?: boolean; // Si es promoción interna de la plataforma
  createdByAdmin?: boolean; // Si fue creada por un admin
  imageUrl?: string; // URL de imagen para la promoción
  placement?: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content' | 'promotions_section'; // Dónde se muestra
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una nueva promoción
 */
export async function createPromotion(
  promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Promotion> {
  const docRef = getDb()
    .collection('tenants')
    .doc(promotion.tenantId)
    .collection('promotions')
    .doc();

  await docRef.set({
    ...promotion,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...promotion,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene promociones activas
 */
export async function getActivePromotions(
  tenantId: string
): Promise<Promotion[]> {
  const now = new Date();

  let snapshot;
  let promotions: Promotion[];

  try {
    // Intentar consulta con ambos filtros
    snapshot = await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .where('status', '==', 'active')
      .where('startDate', '<=', now)
      .get();

    promotions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data?.startDate?.toDate() || new Date(),
        endDate: data?.endDate?.toDate(),
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      } as Promotion;
    });
  } catch (queryError: any) {
    // Si falla por falta de índice, usar fallback
    const isIndexError = queryError.code === 9 || 
                         queryError.message?.includes('index') || 
                         queryError.details?.includes('index') ||
                         queryError.message?.includes('FAILED_PRECONDITION');
    
    if (isIndexError) {
      console.warn(`⚠️ Consulta de promociones falló por falta de índice para tenant ${tenantId}, usando fallback...`);
      
      try {
        // Fallback: solo filtrar por status, luego filtrar por fecha en memoria
        snapshot = await getDb()
          .collection('tenants')
          .doc(tenantId)
          .collection('promotions')
          .where('status', '==', 'active')
          .get();

        promotions = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startDate: data?.startDate?.toDate() || new Date(),
            endDate: data?.endDate?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
          } as Promotion;
        });

        // Filtrar por startDate en memoria
        promotions = promotions.filter((promo) => promo.startDate <= now);
      } catch (fallbackError: any) {
        console.error(`❌ Fallback también falló para tenant ${tenantId}:`, fallbackError.message);
        promotions = [];
      }
    } else {
      // Si no es error de índice, lanzar el error original
      throw queryError;
    }
  }

  // Filtrar por endDate (siempre en memoria)
  return promotions.filter((promo) => !promo.endDate || promo.endDate >= now);
}

/**
 * Envía promoción a leads sin compra
 */
export async function sendPromotionToLeads(
  tenantId: string,
  promotionId: string
): Promise<void> {
  const promotionDoc = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('promotions')
    .doc(promotionId)
    .get();

  if (!promotionDoc.exists) {
    throw new Error('Promotion not found');
  }

  const promotion = promotionDoc.data() as Promotion;

  // Obtener leads sin compra (importación dinámica para evitar dependencias circulares)
  const { getLeads } = await import('@autodealers/crm');
  const leads = await getLeads(tenantId);
  const leadsWithoutSale = leads.filter(
    (lead) => lead.status !== 'closed' && lead.status !== 'lost'
  );

  const { UnifiedMessagingService } = await import('@autodealers/messaging');
  const unifiedService = new UnifiedMessagingService();
  const { getOpenAIApiKey } = await import('./credentials');
  const apiKey = await getOpenAIApiKey() || '';
  const aiAssistant = new AIAssistant(apiKey);

  for (const lead of leadsWithoutSale) {
    // Generar mensaje personalizado con IA
    const messageContent = await aiAssistant.generateResponse(
      `Promoción: ${promotion.name}. ${promotion.description}`,
      `Crea un mensaje atractivo para ofrecer esta promoción a ${lead.contact.name}`,
      []
    );

    // Enviar por canales configurados
    for (const channel of promotion.channels) {
      try {
        await unifiedService.sendMessage({
          tenantId,
          leadId: lead.id,
          channel: channel as any,
          direction: 'outbound',
          from: '', // Se obtiene de la configuración
          to: lead.contact.phone || lead.contact.email || '',
          content: messageContent.content,
          metadata: {
            promotionId: promotionId,
            aiGenerated: true,
          },
        });
      } catch (error) {
        console.error(`Error sending promotion to ${lead.id}:`, error);
      }
    }
  }
}

/**
 * Obtiene promociones de un tenant
 */
export async function getPromotions(
  tenantId: string,
  filters?: {
    status?: PromotionStatus;
    type?: PromotionType;
  }
): Promise<Promotion[]> {
  let query: admin.firestore.Query = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('promotions');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }

  query = query.orderBy('createdAt', 'desc');

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data?.startDate?.toDate() || new Date(),
      endDate: data?.endDate?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Promotion;
  });
}




