export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();

    // Reviews
    const reviewsSnapshot = await db.collectionGroup('reviews').get();
    let totalReviews = 0;
    let totalRating = 0;
    const reviewsByStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    
    reviewsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
      
      if (createdAt >= startDate && createdAt <= endDate) {
        totalReviews++;
        totalRating += data.rating || 0;
        
        const status = data.status || 'pending';
        reviewsByStatus[status] = (reviewsByStatus[status] || 0) + 1;
      }
    });

    // Inventory
    const vehiclesSnapshot = await db.collectionGroup('vehicles').get();
    let totalVehicles = 0;
    const vehiclesByStatus: Record<string, number> = { available: 0, sold: 0, pending: 0 };
    const vehiclesByCondition: Record<string, number> = { new: 0, used: 0, certified: 0 };
    
    vehiclesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalVehicles++;
      
      const status = data.status || 'available';
      vehiclesByStatus[status] = (vehiclesByStatus[status] || 0) + 1;
      
      const condition = data.condition || 'used';
      vehiclesByCondition[condition] = (vehiclesByCondition[condition] || 0) + 1;
    });

    // Appointments
    const appointmentsSnapshot = await db.collectionGroup('appointments').get();
    let totalAppointments = 0;
    const appointmentsByStatus: Record<string, number> = { scheduled: 0, completed: 0, cancelled: 0 };
    const appointmentsByMonth: Record<string, number> = {};
    
    appointmentsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const appointmentDate = data.date?.toDate?.() || new Date(data.date?.seconds * 1000 || Date.now());
      
      if (appointmentDate >= startDate && appointmentDate <= endDate) {
        totalAppointments++;
        
        const status = data.status || 'scheduled';
        appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
        
        const monthKey = appointmentDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        appointmentsByMonth[monthKey] = (appointmentsByMonth[monthKey] || 0) + 1;
      }
    });

    // Pre-qualifications
    const preQualSnapshot = await db.collectionGroup('preQualifications').get();
    let totalPreQual = 0;
    const preQualByScore: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    preQualSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
      
      if (createdAt >= startDate && createdAt <= endDate) {
        totalPreQual++;
        
        const score = data.score || 0;
        if (score >= 80) preQualByScore.excellent++;
        else if (score >= 60) preQualByScore.good++;
        else if (score >= 40) preQualByScore.fair++;
        else preQualByScore.poor++;
      }
    });

    // Social Media Posts
    const postsSnapshot = await db.collectionGroup('socialPosts').get();
    let totalPosts = 0;
    const postsByPlatform: Record<string, number> = { facebook: 0, instagram: 0 };
    
    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const publishedAt = data.publishedAt?.toDate?.() || new Date(data.publishedAt?.seconds * 1000 || Date.now());
      
      if (publishedAt >= startDate && publishedAt <= endDate) {
        totalPosts++;
        
        const platforms = data.platforms || [];
        platforms.forEach((platform: string) => {
          postsByPlatform[platform] = (postsByPlatform[platform] || 0) + 1;
        });
      }
    });

    // Customer Files
    const filesSnapshot = await db.collectionGroup('customerFiles').get();
    let totalCustomerFiles = 0;
    
    filesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
      
      if (createdAt >= startDate && createdAt <= endDate) {
        totalCustomerFiles++;
      }
    });

    const report = {
      reviews: {
        total: totalReviews,
        averageRating: totalReviews > 0 ? totalRating / totalReviews : 0,
        byStatus: reviewsByStatus,
      },
      inventory: {
        total: totalVehicles,
        byStatus: vehiclesByStatus,
        byCondition: vehiclesByCondition,
      },
      appointments: {
        total: totalAppointments,
        byStatus: appointmentsByStatus,
        byMonth: appointmentsByMonth,
      },
      preQualifications: {
        total: totalPreQual,
        byScore: preQualByScore,
      },
      socialPosts: {
        total: totalPosts,
        byPlatform: postsByPlatform,
      },
      customerFiles: {
        total: totalCustomerFiles,
      },
    };
    
    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error generating platform report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        report: {
          reviews: { total: 0, averageRating: 0, byStatus: {} },
          inventory: { total: 0, byStatus: {}, byCondition: {} },
          appointments: { total: 0, byStatus: {}, byMonth: {} },
          preQualifications: { total: 0, byScore: {} },
          socialPosts: { total: 0, byPlatform: {} },
          customerFiles: { total: 0 },
        }
      },
      { status: 500 }
    );
  }
}
