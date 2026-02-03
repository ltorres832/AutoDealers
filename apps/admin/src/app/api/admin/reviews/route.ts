import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getReviews, getReviewStats } from '@autodealers/crm';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const allTenants = searchParams.get('allTenants') === 'true';

    // Si se especifica un tenant, obtener solo sus reseñas
    if (tenantId && !allTenants) {
      const filters: any = {};
      if (status) filters.status = status;

      const reviews = await getReviews(tenantId, filters);
      const stats = await getReviewStats(tenantId);

      return NextResponse.json({ reviews, stats, tenantId });
    }

    // Obtener todas las reseñas de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    const allReviews: any[] = [];
    const tenantStats: { [key: string]: any } = {};

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();

      try {
        const filters: any = {};
        if (status) filters.status = status;

        const reviews = await getReviews(tenantId, filters);
        const stats = await getReviewStats(tenantId);

        // Agregar información del tenant a cada reseña
        const enrichedReviews = reviews.map((review) => ({
          ...review,
          tenantName: tenantData.name,
          tenantSubdomain: tenantData.subdomain,
          tenantType: tenantData.type,
          tenantCompanyName: tenantData.companyName,
        }));

        allReviews.push(...enrichedReviews);
        tenantStats[tenantId] = {
          ...stats,
          tenantName: tenantData.name,
          tenantSubdomain: tenantData.subdomain,
          tenantType: tenantData.type,
          tenantCompanyName: tenantData.companyName,
        };
      } catch (error) {
        console.error(`Error fetching reviews for tenant ${tenantId}:`, error);
      }
    }

    // Ordenar por fecha de creación (más recientes primero)
    allReviews.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    });

    // Calcular estadísticas globales
    const globalStats = {
      total: allReviews.length,
      approved: allReviews.filter((r) => r.status === 'approved').length,
      pending: allReviews.filter((r) => r.status === 'pending').length,
      rejected: allReviews.filter((r) => r.status === 'rejected').length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { [key: number]: number },
    };

    if (allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      globalStats.averageRating = totalRating / allReviews.length;

      allReviews.forEach((review) => {
        globalStats.ratingDistribution[review.rating] =
          (globalStats.ratingDistribution[review.rating] || 0) + 1;
      });
    }

    return NextResponse.json({
      reviews: allReviews,
      globalStats,
      tenantStats,
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


