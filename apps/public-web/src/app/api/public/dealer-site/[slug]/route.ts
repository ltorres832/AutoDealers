import { NextRequest, NextResponse } from 'next/server';
import { resolveDealerSiteBySlug } from '@autodealers/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug?.trim()) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });
    }

    const payload = await resolveDealerSiteBySlug(slug.trim());
    if (!payload) {
      return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error('GET /api/public/dealer-site/[slug]', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
