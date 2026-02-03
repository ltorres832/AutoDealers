import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
  getReviewStats,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const featured = searchParams.get('featured');
    const stats = searchParams.get('stats');

    // Si se piden estadísticas
    if (stats === 'true') {
      const statistics = await getReviewStats(auth.tenantId);
      return NextResponse.json({ stats: statistics });
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (featured === 'true') filters.featured = true;

    const reviews = await getReviews(auth.tenantId, filters);

    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
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
      status,
      featured,
    } = body;

    // Validaciones
    if (!customerName || !rating || !comment) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: customerName, rating, comment' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'El rating debe estar entre 1 y 5' },
        { status: 400 }
      );
    }

    const review = await createReview({
      tenantId: auth.tenantId,
      customerName,
      customerEmail,
      customerPhone,
      rating: parseInt(rating),
      title,
      comment,
      photos: photos || [],
      videos: videos || [],
      vehicleId,
      saleId,
      status: status || 'pending',
      featured: featured || false,
    });

    return NextResponse.json({ review, success: true });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de reseña requerido' }, { status: 400 });
    }

    await updateReview(auth.tenantId, id, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de reseña requerido' }, { status: 400 });
    }

    await deleteReview(auth.tenantId, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

