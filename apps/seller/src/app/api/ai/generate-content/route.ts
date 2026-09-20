import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { AIContentGenerator } from '@autodealers/ai';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, context } = body;

    if (!type || !context) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { getOpenAIApiKey, isAIEnabled, tenantCanGenerateContent, getFirestore } =
      await import('@autodealers/core');

    // 1) Interruptor maestro de IA del tenant
    if (!(await isAIEnabled(auth.tenantId))) {
      return NextResponse.json(
        { error: 'La IA no está habilitada. Actívala en Configuración → IA.' },
        { status: 403 }
      );
    }

    // 2) La membresía debe permitir Generación de Contenido con IA
    if (!(await tenantCanGenerateContent(auth.tenantId))) {
      return NextResponse.json(
        {
          error:
            'Tu plan de membresía no incluye Generación de Contenido con IA. Actualiza tu plan para usarla.',
        },
        { status: 403 }
      );
    }

    // 3) El toggle específico debe estar encendido (socialContent / emailGeneration)
    const isSocial = type === 'post' || type === 'social';
    try {
      const cfgDoc = await getFirestore()
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('settings')
        .doc('ai_config')
        .get();
      const cfg = cfgDoc.data() as Record<string, unknown> | undefined;
      const socialContent = cfg?.socialContent as { enabled?: boolean } | undefined;
      const emailGeneration = cfg?.emailGeneration as { enabled?: boolean } | undefined;
      const toggleOn = isSocial
        ? socialContent?.enabled === true
        : emailGeneration?.enabled === true;
      if (!toggleOn) {
        return NextResponse.json(
          {
            error: isSocial
              ? 'La Generación de Contenido para redes está desactivada. Actívala en Configuración → IA.'
              : 'La Generación de emails con IA está desactivada. Actívala en Configuración → IA.',
          },
          { status: 403 }
        );
      }
    } catch (e) {
      console.warn('[generate-content] no se pudo leer ai_config:', e);
    }

    // Verificar que OpenAI API Key esté configurada
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key no configurada. Por favor configura la API Key desde el panel de administración.' },
        { status: 500 }
      );
    }

    const generator = new AIContentGenerator(apiKey);

    // Si el tipo es para redes sociales, usar generatePostContent
    // Si es para email, usar generateEmail
    let content: string;
    
    if (type === 'post' || type === 'social') {
      const result = await generator.generatePostContent(
        {
          make: context.make || 'N/A',
          model: context.model || 'N/A',
          year: context.year || new Date().getFullYear(),
          price: context.price || 0,
          keyFeatures: context.keyFeatures || [],
        },
        context.platform || 'facebook'
      );
      content = result.content;
    } else {
      content = await generator.generateEmail(
        {
          type: type || 'email',
          context: context.description || context,
          tone: context.tone || 'professional',
          length: context.length || 'medium',
        },
        context
      );
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

