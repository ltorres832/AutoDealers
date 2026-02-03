import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { SocialPublisherService, PostContent } from '@autodealers/messaging';
import { validateMembershipFeature } from '@/lib/membership-middleware';

const publisher = new SocialPublisherService();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ VALIDACIÓN AUTOMÁTICA DE MEMBRESÍA
    const featureValidation = await validateMembershipFeature(request, 'useSocialMedia');
    if (featureValidation !== null) {
      return featureValidation; // Retornar error con info de upgrade
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

    // Verificar si todas las publicaciones fueron exitosas
    const allSuccess = results.every((r) => r.success);
    const hasErrors = results.some((r) => !r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? 'Publicado exitosamente en todas las plataformas'
        : hasErrors
        ? 'Algunas publicaciones fallaron'
        : 'Publicación completada',
    });
  } catch (error: any) {
    console.error('Error publishing social media post:', error);
    return NextResponse.json(
      { error: 'Error al publicar', details: error.message },
      { status: 500 }
    );
  }
}

