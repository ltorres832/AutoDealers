import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySubdomain } from '@autodealers/core';
import { getPublicReviews } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant || (tenant as { status?: string }).status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    const reviews = await getPublicReviews(tenant.id, limit);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        ...r,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : r.createdAt,
        updatedAt:
          r.updatedAt instanceof Date
            ? r.updatedAt.toISOString()
            : r.updatedAt,
        response: r.response
          ? {
              ...r.response,
              respondedAt:
                r.response.respondedAt instanceof Date
                  ? r.response.respondedAt.toISOString()
                  : r.response.respondedAt,
            }
          : undefined,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching public reviews by subdomain:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
