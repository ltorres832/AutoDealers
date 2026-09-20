import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';
import {
  filterPublicSponsoredContent,
  parseSponsoredContentDate,
} from '@autodealers/core';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isDemoPromoAccount } from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeDoc(doc: QueryDocumentSnapshot) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: parseSponsoredContentDate(data.createdAt)?.toISOString() || data.createdAt,
    startDate: parseSponsoredContentDate(data.startDate)?.toISOString() || data.startDate,
    endDate: parseSponsoredContentDate(data.endDate)?.toISOString() || data.endDate,
    approvedAt: parseSponsoredContentDate(data.approvedAt)?.toISOString() || data.approvedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement');
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const includeApproved = searchParams.get('includeApproved') === 'true';

    const validStatuses = ['active'];
    if (includeApproved) {
      validStatuses.push('approved');
    }

    let content: ReturnType<typeof serializeDoc>[] = [];

    try {
      let query = db.collection('sponsored_content').where('status', 'in', validStatuses);

      if (placement) {
        query = query.where('placement', '==', placement);
      }

      const snapshot = await query.get();
      content = snapshot.docs.map(serializeDoc);
    } catch (queryError: unknown) {
      const err = queryError as { code?: number; message?: string; details?: string };
      const isIndexError =
        err.code === 9 ||
        err.message?.includes('index') ||
        err.details?.includes('index') ||
        err.message?.includes('FAILED_PRECONDITION');

      if (!isIndexError) throw queryError;

      console.warn('⚠️ sponsored_content: consulta sin índice, usando fallback en memoria');

      const snapshot = await db.collection('sponsored_content').where('status', 'in', validStatuses).get();
      content = snapshot.docs.map(serializeDoc);
    }

    if (placement) {
      content = content.filter((item) => (item as { placement?: string }).placement === placement);
    }

    const now = new Date();
    content = filterPublicSponsoredContent(content, now).filter(
      (item) => !isDemoPromoAccount(item as Record<string, unknown>, (item as { id?: string }).id)
    );

    content.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });

    if (limit > 0) {
      content = content.slice(0, limit);
    }

    return NextResponse.json(
      { content },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('Error fetching sponsored content:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
