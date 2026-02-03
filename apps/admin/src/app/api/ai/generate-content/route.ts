export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { AIContentGenerator } from '@autodealers/ai';
import { verifyAuth } from '@/lib/auth';

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

    const { getOpenAIApiKey } = await import('@autodealers/core');
    const apiKey = await getOpenAIApiKey() || '';
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key no configurada. Por favor configura la API Key desde Configuración > General.' },
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
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

