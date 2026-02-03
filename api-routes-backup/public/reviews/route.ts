import { NextRequest, NextResponse } from 'next/server';

import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6');

    // Intentar obtener reseñas de ambas colecciones posibles: 'reviews' y 'ratings'
    let reviewsSnapshot;
    let collectionName = 'reviews';
    
    try {
      // Primero intentar con 'reviews' y filtro de status
      reviewsSnapshot = await db
        .collectionGroup('reviews')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      // Si no hay resultados, intentar con 'ratings' completados
      if (reviewsSnapshot.empty) {
        console.log('No reviews found, trying ratings collection...');
        collectionName = 'ratings';
        reviewsSnapshot = await db
          .collectionGroup('ratings')
          .where('status', '==', 'completed')
          .orderBy('completedAt', 'desc')
          .limit(limit)
          .get();
      }
    } catch (error: any) {
      console.warn('Error con filtro status, intentando sin filtro:', error.message);
      try {
        // Intentar sin filtro de status
        reviewsSnapshot = await db
          .collectionGroup('reviews')
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();
        
        if (reviewsSnapshot.empty) {
          collectionName = 'ratings';
          reviewsSnapshot = await db
            .collectionGroup('ratings')
            .where('status', '==', 'completed')
            .limit(limit)
            .get();
        }
      } catch (error2: any) {
        console.warn('Error con orderBy, intentando sin orden:', error2.message);
        // Intentar sin orderBy
        reviewsSnapshot = await db
          .collectionGroup('reviews')
          .limit(limit)
          .get();
        
        if (reviewsSnapshot.empty) {
          collectionName = 'ratings';
          reviewsSnapshot = await db
            .collectionGroup('ratings')
            .limit(limit)
            .get();
        }
      }
    }

    const reviews = [];

    for (const doc of reviewsSnapshot.docs) {
      const data = doc.data();
      
      // Filtrar solo reseñas aprobadas o completadas (si no tienen status, asumir aprobadas)
      if (collectionName === 'reviews' && data.status && data.status !== 'approved') {
        continue;
      }
      if (collectionName === 'ratings' && data.status && data.status !== 'completed') {
        continue;
      }
      
      // Obtener información del tenant
      const tenantPath = doc.ref.path.split('/');
      const tenantId = tenantPath[1];
      
      let vehicleName = '';
      let dealerName = '';
      let sellerName = '';
      let customerName = '';
      let customerPhoto = '';
      let rating = 0;
      let comment = '';
      let createdAt = '';

      // Mapear campos según la colección
      if (collectionName === 'ratings') {
        // Ratings tiene sellerRating y dealerRating, usar el promedio
        rating = data.sellerRating || 0;
        if (data.dealerRating) {
          rating = (rating + data.dealerRating) / 2;
        }
        // Combinar comentarios del seller y dealer si existen
        const comments = [];
        if (data.sellerComment) comments.push(data.sellerComment);
        if (data.dealerComment) comments.push(data.dealerComment);
        comment = comments.join(' ') || data.feedback || data.comment || '';
        customerName = data.customerName || 'Cliente';
        customerPhoto = data.customerPhoto;
        createdAt = data.completedAt?.toDate()?.toISOString() || data.createdAt?.toDate()?.toISOString() || new Date().toISOString();
      } else {
        // Reviews tiene rating y comment directamente
        rating = data.rating || 5;
        comment = data.comment || data.feedback || '';
        customerName = data.customerName || data.buyerName || 'Cliente';
        customerPhoto = data.customerPhoto || data.buyerPhoto;
        createdAt = data.createdAt?.toDate()?.toISOString() || new Date().toISOString();
      }

      try {
        // Obtener información del vehículo si existe
        if (data.vehicleId) {
          const vehicleDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(data.vehicleId)
            .get();
          
          if (vehicleDoc.exists) {
            const vehicleData = vehicleDoc.data();
            vehicleName = `${vehicleData?.year || ''} ${vehicleData?.make || ''} ${vehicleData?.model || ''}`.trim();
          }
        }

        // Obtener información del dealer o seller
        if (data.dealerId) {
          const dealerDoc = await db.collection('users').doc(data.dealerId).get();
          if (dealerDoc.exists) {
            dealerName = dealerDoc.data()?.name || '';
          }
        }

        if (data.sellerId) {
          const sellerDoc = await db.collection('users').doc(data.sellerId).get();
          if (sellerDoc.exists) {
            sellerName = sellerDoc.data()?.name || '';
          }
        }
      } catch (error) {
        console.error('Error fetching review details:', error);
      }

      // Solo agregar si tiene comentario y rating válido
      if (comment && comment.trim() && rating > 0) {
        reviews.push({
          id: doc.id,
          customerName,
          customerPhoto,
          rating,
          comment: comment.trim(),
          vehicleName,
          dealerName,
          sellerName,
          createdAt,
          verified: data.verified || false,
        });
      }
    }
    
    console.log(`Found ${reviews.length} reviews from ${collectionName} collection`);

    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

