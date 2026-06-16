import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { SocialPublisherService, PostContent } from '@autodealers/messaging';

const publisher = new SocialPublisherService();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, platforms }: { content: PostContent; platforms: ('facebook' | 'instagram')[] } = body;

    if (!content || !content.text) {
      return NextResponse.json({ error: 'El contenido del post es requerido' }, { status: 400 });
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos una plataforma' }, { status: 400 });
    }

    // Publicar en las plataformas seleccionadas
    const results = await publisher.publishToMultiple(auth.tenantId, content, platforms);

    const allSuccess = results.every((r) => r.success);
    const failures = results.filter((r) => !r.success);
    const failureDetail = failures
      .map((r) => `${r.platform}: ${r.error || 'error desconocido'}`)
      .join(' · ');

    if (!allSuccess && failures.length === results.length) {
      return NextResponse.json(
        {
          success: false,
          results,
          error: failureDetail || 'No se pudo publicar en ninguna red',
          message: failureDetail,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? 'Publicado exitosamente en todas las plataformas'
        : failures.length > 0
          ? `Publicado parcialmente. ${failureDetail}`
          : 'Publicación completada',
      ...(failures.length > 0 ? { error: failureDetail } : {}),
    });
  } catch (error: any) {
    console.error('Error publishing social media post:', error);
    return NextResponse.json(
      { error: 'Error al publicar', details: error.message },
      { status: 500 }
    );
  }
}


