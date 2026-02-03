export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createTemplate, getTemplates } from '@autodealers/core';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    // MODO DESARROLLO: Retornar datos mock si Firebase está desactivado
    if (process.env.SKIP_FIREBASE === 'true' || process.env.USE_MOCK_DATA === 'true') {
      console.log('⚠️  Usando datos mock (Firebase desactivado)');
      return createSuccessResponse({ 
        templates: [],
        _mock: true,
        _message: 'Modo desarrollo: Firebase desactivado. Configura las credenciales en .env.local para usar datos reales.'
      });
    }

    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const event = searchParams.get('event') as any;
    const isActive = searchParams.get('isActive') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100'); // Límite por defecto

    const templates = await getTemplates({
      type,
      event,
      isActive: searchParams.has('isActive') ? isActive : undefined,
    });

    const limitedTemplates = Array.isArray(templates) ? templates.slice(0, limit) : [];

    return createSuccessResponse({ templates: limitedTemplates });
  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/communication-templates:', error);
    
    // Siempre retornar JSON válido, nunca crashear
    return createSuccessResponse({ 
      templates: [],
      _error: true,
      _message: 'Error al cargar templates. Firebase puede no estar configurado correctamente.'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { name, type, event, subject, content, variables, isActive } = body;

    if (!name || !type || !event || !content) {
      return createErrorResponse('Faltan campos requeridos', 400);
    }

    const template = await createTemplate(
      {
        name,
        type,
        event,
        subject,
        content,
        variables: variables || [],
        isActive: isActive !== undefined ? isActive : true,
        isDefault: false,
      },
      auth.userId || 'admin'
    );

    return createSuccessResponse({ template }, 201);
  } catch (error: any) {
    console.error('❌ Error en POST /api/admin/communication-templates:', error);
    
    // Si es error de Firebase, retornar mensaje claro
    if (error.message?.includes('Firebase') || error.message?.includes('credentials')) {
      return createErrorResponse(
        'Firebase no está configurado correctamente',
        503,
        false
      );
    }
    
    return createErrorResponse(
      error.message || 'Error al crear template',
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}




