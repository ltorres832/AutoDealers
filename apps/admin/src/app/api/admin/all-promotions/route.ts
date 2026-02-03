export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let promotions: any[] = [];

    // Obtener todas las promociones de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();

      const promotionsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('promotions')
        .get();
      
      for (const doc of promotionsSnapshot.docs) {
        const data = doc.data();
        
        // Obtener calificaciones del vendedor/dealer según el scope de la promoción
        let sellerRating = 0;
        let sellerRatingCount = 0;
        let dealerRating = 0;
        let dealerRatingCount = 0;

        try {
          if (data.promotionScope === 'seller' || data.promotionScope === 'vehicle') {
            // Si es promoción de seller o vehicle, obtener calificación del seller
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
          tenantName: tenantData.name,
          name: data.name || 'Sin nombre',
          description: data.description || '',
          type: data.type || 'discount',
          discount: data.discount,
          status: data.status || 'draft',
          startDate: data?.startDate?.toDate()?.toISOString() || new Date().toISOString(),
          endDate: data?.endDate?.toDate()?.toISOString(),
          expiresAt: data?.expiresAt?.toDate()?.toISOString(),
          isPaid: data.isPaid || false,
          priority: data.priority || 0,
          priorityScore: data.priorityScore || 0,
          price: data.price || 0,
          duration: data.duration || 0,
          promotionScope: data.promotionScope,
          views: data.views || 0,
          clicks: data.clicks || 0,
          // Incluir métricas de redes sociales
          socialMetrics: data.socialMetrics || undefined,
          socialPostIds: data.socialPostIds || undefined,
          // Calificaciones
          sellerRating,
          sellerRatingCount,
          dealerRating,
          dealerRatingCount,
        });
      }
    }

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error('Error fetching all promotions:', error);
    return NextResponse.json({ promotions: [] });
  }
}
