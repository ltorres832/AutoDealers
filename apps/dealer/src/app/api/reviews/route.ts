import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getReviewStats,
  resyncDealerPublicRatings,
  resyncSellerPublicRatings,
  enrichReviewPatchOnApprove,
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

    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'sync-public-ratings') {
      const dealerResult = await resyncDealerPublicRatings(auth.tenantId, auth.userId);

      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      const sellersSnap = await db
        .collection('users')
        .where('tenantId', '==', auth.tenantId)
        .where('role', '==', 'seller')
        .get();

      let sellersPatched = 0;
      for (const doc of sellersSnap.docs) {
        const r = await resyncSellerPublicRatings(auth.tenantId, doc.id);
        sellersPatched += r.patched;
      }

      return NextResponse.json({
        success: true,
        message:
          'Calificaciones sincronizadas en la web pública (concesionario y vendedores).',
        dealerPatched: dealerResult.patched,
        sellersPatched,
      });
    }

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
      rating: parseInt(String(rating), 10),
      title,
      comment,
      photos: photos || [],
      videos: videos || [],
      vehicleId,
      saleId,
      sellerId: body.sellerId,
      dealerId: auth.role === 'dealer' ? auth.userId : body.dealerId,
      status: status || 'pending',
      featured: featured || false,
    });

    return NextResponse.json({ review, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in reviews POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
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

    const existing = await getReviewById(auth.tenantId, id);
    const patch = await enrichReviewPatchOnApprove(
      auth.tenantId,
      existing,
      updates as Partial<import('@autodealers/crm').Review>,
      { userId: auth.userId, role: auth.role }
    );

    await updateReview(auth.tenantId, id, patch);

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

