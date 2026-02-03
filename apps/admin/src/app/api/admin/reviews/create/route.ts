export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createReview } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantId,
      customerName,
      customerEmail,
      customerPhone,
      rating,
      title,
      comment,
      photos,
      videos,
      vehicleId,
      saleId,
      status = 'approved', // Por defecto aprobada si la crea el admin
      featured = false,
    } = body;

    if (!tenantId || !customerName || !rating || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, customerName, rating, comment' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Crear la reseña
    const review = await createReview({
      tenantId,
      customerName,
      customerEmail,
      customerPhone,
      rating,
      title,
      comment,
      photos: photos || [],
      videos: videos || [],
      vehicleId,
      saleId,
      status: status as 'pending' | 'approved' | 'rejected',
      featured: featured || false,
    });

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      review,
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


