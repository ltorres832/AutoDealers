import { NextRequest, NextResponse } from 'next/server';

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '12');

    // Obtener promociones internas del admin (siempre primero por prioridad)
    const internalPromotionsSnapshot = await db
      .collection('tenants')
      .doc('system')
      .collection('promotions')
      .where('isInternal', '==', true)
      .where('createdByAdmin', '==', true)
      .where('status', '==', 'active')
      .orderBy('priority', 'desc')
      .limit(limit)
      .get();

    // Obtener promociones pagadas Y gratuitas activas de todos los tenants
    // Primero obtener promociones pagadas
    const paidPromotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isPaid', '==', true)
      .where('status', '==', 'active')
      .orderBy('priority', 'asc')
      .limit(limit)
      .get();

    // Luego obtener promociones gratuitas (solo de tenants con la feature)
    const freePromotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isFreePromotion', '==', true)
      .where('status', '==', 'active')
      .where('isPaid', '==', false)
      .limit(limit)
      .get();

    // Combinar todas las consultas (internas primero por prioridad)
    const allPromotionsDocs = [
      ...internalPromotionsSnapshot.docs,
      ...paidPromotionsSnapshot.docs,
      ...freePromotionsSnapshot.docs,
    ];

    const promotions = [];
    const now = new Date();
    const processedTenants = new Set<string>(); // Para evitar duplicados

    // Verificar membresías de tenants para promociones gratuitas
    const tenantMemberships = new Map<string, boolean>(); // tenantId -> tiene feature

    for (const doc of allPromotionsDocs) {
      const data = doc.data();
      const tenantPath = doc.ref.path.split('/');
      const tenantId = tenantPath[1];
      
      // Si es promoción interna del admin, usar tenantId 'system'
      const isInternalAdmin = data.isInternal && data.createdByAdmin;
      
      // Obtener tenantId correcto
      const actualTenantId = isInternalAdmin ? 'system' : tenantId;
      
      // Verificar que no esté expirada
      if (data.expiresAt) {
        const expiresAt = data.expiresAt.toDate();
        if (expiresAt <= now) {
          continue; // Saltar promociones expiradas
        }
      }

      // Si es promoción gratuita, verificar que el tenant tenga la feature
      if (data.isFreePromotion && !data.isPaid) {
        if (!tenantMemberships.has(tenantId)) {
          // Obtener membresía del tenant
          try {
            const tenantDoc = await db.collection('tenants').doc(tenantId).get();
            const tenantData = tenantDoc.data();
            const membershipId = tenantData?.membershipId;
            
            if (membershipId) {
              const membershipDoc = await db.collection('memberships').doc(membershipId).get();
              const membershipData = membershipDoc.data();
              const hasFeature = membershipData?.features?.freePromotionsOnLanding === true;
              tenantMemberships.set(tenantId, hasFeature);
              
              if (!hasFeature) {
                continue; // Saltar si no tiene la feature
              }
            } else {
              continue; // Sin membresía = no puede tener promociones gratuitas
            }
          } catch (error) {
            console.error('Error checking membership:', error);
            continue; // En caso de error, saltar
          }
        } else if (!tenantMemberships.get(tenantId)) {
          continue; // Ya verificamos y no tiene la feature
        }
      }

    // Obtener información del tenant
      let tenantName = 'Concesionario';
      let sellerRating = 0;
      let sellerRatingCount = 0;
      let dealerRating = 0;
      let dealerRatingCount = 0;

      try {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (tenantDoc.exists) {
          tenantName = tenantDoc.data()?.name || tenantName;
        }
      } catch (error) {
        console.error('Error fetching tenant:', error);
      }

      // Obtener calificaciones del vendedor/dealer según el scope de la promoción
      try {
        if (data.promotionScope === 'seller' || data.promotionScope === 'vehicle') {
          // Si es promoción de seller o vehicle, obtener calificación del seller
          // Buscar el sellerId en la promoción o buscar sellers del tenant
          const sellerId = data.sellerId || data.createdBy;
          if (sellerId) {
            const sellerDoc = await db.collection('users').doc(sellerId).get();
            if (sellerDoc.exists) {
              const sellerData = sellerDoc.data();
              sellerRating = sellerData?.sellerRating || 0;
              sellerRatingCount = sellerData?.sellerRatingCount || 0;
            }
          } else {
            // Si no hay sellerId, buscar el primer seller del tenant
            const sellersSnapshot = await db.collection('users')
              .where('tenantId', '==', tenantId)
              .where('role', '==', 'seller')
              .limit(1)
              .get();
            
            if (!sellersSnapshot.empty) {
              const sellerData = sellersSnapshot.docs[0].data();
              sellerRating = sellerData?.sellerRating || 0;
              sellerRatingCount = sellerData?.sellerRatingCount || 0;
            }
          }
        }
        
        if (data.promotionScope === 'dealer') {
          // Si es promoción de dealer, obtener calificación del dealer
          // Buscar el dealer del tenant
          const dealersSnapshot = await db.collection('users')
            .where('tenantId', '==', tenantId)
            .where('role', '==', 'dealer')
            .limit(1)
            .get();
          
          if (!dealersSnapshot.empty) {
            const dealerData = dealersSnapshot.docs[0].data();
            dealerRating = dealerData?.dealerRating || 0;
            dealerRatingCount = dealerData?.dealerRatingCount || 0;
          }
        }
      } catch (error) {
        console.error('Error fetching ratings:', error);
      }

      promotions.push({
        id: doc.id,
        tenantId,
        tenantName,
        ...data,
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        startDate: data.startDate?.toDate()?.toISOString(),
        // Calificaciones
        sellerRating,
        sellerRatingCount,
        dealerRating,
        dealerRatingCount,
      });
    }

    // Ordenar por prioridad (mayor prioridad = aparece primero)
    // Si no hay prioridad, usar fecha de creación como fallback
    promotions.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      
      // Si tienen la misma prioridad, ordenar por fecha de creación
      if (priorityA === priorityB) {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Más recientes primero
      }
      
      // Mayor prioridad primero
      return priorityB - priorityA;
    });
    
    const limitedPromotions = promotions.slice(0, limit);

    return NextResponse.json({ promotions: limitedPromotions });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

