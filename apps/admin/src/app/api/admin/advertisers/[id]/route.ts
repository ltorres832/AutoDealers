import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById } from '@autodealers/core/advertisers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: advertiserId } = await params;
    const advertiser = await getAdvertiserById(advertiserId);
    if (!advertiser) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      advertiser: {
        ...advertiser,
        createdAt: advertiser.createdAt instanceof Date ? advertiser.createdAt.toISOString() : advertiser.createdAt,
        updatedAt: advertiser.updatedAt instanceof Date ? advertiser.updatedAt.toISOString() : advertiser.updatedAt,
        lastLogin: advertiser.lastLogin instanceof Date ? advertiser.lastLogin.toISOString() : advertiser.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('Error GET advertiser by id:', error);
    return NextResponse.json(
      { error: 'Error interno', details: error?.message },
      { status: 500 }
    );
  }
}

