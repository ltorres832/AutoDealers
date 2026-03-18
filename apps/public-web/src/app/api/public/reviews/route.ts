import { NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';

export const revalidate = 0; // Disable static caching for real-time data

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '6', 10);
        const db = getFirestore();

        console.log(`🔍 [API] Buscando reseñas (límite: ${limit})...`);

        // Intentar consulta con índice (requerido para orderBy)
        let reviewsSnapshot;
        try {
            reviewsSnapshot = await db.collectionGroup('reviews')
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
        } catch (indexError: any) {
            if (indexError.code === 9 || indexError.message?.includes('index')) {
                console.warn('⚠️ Consulta de reseñas falló por falta de índice compuesto, usando fallback...');
            } else {
                throw indexError; // Si no es un error de índice, lanzar error general
            }
        }

        // Fallback si la consulta principal falló por falta de índices
        if (!reviewsSnapshot) {
            // Recolectar de cada tenant o usar consultas sin order by
            try {
                reviewsSnapshot = await db.collectionGroup('reviews')
                    .where('status', '==', 'approved')
                    .limit(limit * 3) // Traemos extra porque después las ordenamos en código
                    .get();
            } catch (e: any) {
                console.warn(`❌ Error en fallback de getReviews:`, e.message);
                // En el peor de los casos, simplemente traer las primeras sin filtros
                reviewsSnapshot = await db.collectionGroup('reviews')
                    .limit(limit)
                    .get();
            }
        }

        const reviews: any[] = [];

        // Iterar para recuperar info cruzada
        for (const doc of reviewsSnapshot.docs) {
            const data = doc.data();
            const pathPaths = doc.ref.path.split('/');
            const tenantId = pathPaths[1];

            let vehicleName = '';
            let dealerName = '';
            let sellerName = '';

            // Podríamos optimizar esto obteniendo en batch, 
            // pero dado que el límite es usualmente 6, lo dejamos como en la web
            if (data.vehicleId && tenantId) {
                try {
                    const vSnap = await db.collection('tenants').doc(tenantId).collection('vehicles').doc(data.vehicleId).get();
                    if (vSnap.exists) {
                        const vData = vSnap.data();
                        vehicleName = `${vData?.year || ''} ${vData?.make || ''} ${vData?.model || ''}`.trim();
                    }
                } catch (e) { /* ignore */ }
            }

            if (data.dealerId) {
                try {
                    const dSnap = await db.doc(`users/${data.dealerId}`).get();
                    if (dSnap.exists) dealerName = dSnap.data()?.name || '';
                } catch (e) { /* ignore */ }
            }

            if (data.sellerId) {
                try {
                    const sSnap = await db.doc(`users/${data.sellerId}`).get();
                    if (sSnap.exists) sellerName = sSnap.data()?.name || '';
                } catch (e) { /* ignore */ }
            }

            reviews.push({
                id: doc.id,
                tenantId,
                customerName: data.customerName || 'Cliente',
                customerPhoto: data.customerPhoto,
                rating: data.rating || 5,
                comment: data.comment || '',
                vehicleName,
                dealerName,
                sellerName,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                verified: data.verified || false,
            });
        }

        // Ordenar manualmente si usamos fallback
        reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Limitar al count requerido si es que trajimos más en fallback
        const limitedReviews = reviews.slice(0, limit);

        console.log(`✅ [API] Reseñas obtenidas: ${limitedReviews.length}`);
        return NextResponse.json({ reviews: limitedReviews }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error: any) {
        console.error('❌ Error general obteniendo reseñas:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
