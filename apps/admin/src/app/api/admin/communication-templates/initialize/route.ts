export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { initializeDefaultTemplates } from '@autodealers/core';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

/**
 * Inicializa los templates por defecto del sistema
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Iniciando creación de templates por defecto...');
    
    // Obtener templates antes de inicializar
    const { getTemplates } = await import('@autodealers/core');
    const templatesBefore = await getTemplates({ isActive: true });
    console.log(`Templates existentes antes: ${templatesBefore.length}`);

    // Inicializar templates
    await initializeDefaultTemplates();

    // Obtener templates después de inicializar
    const templatesAfter = await getTemplates({ isActive: true });
    console.log(`Templates existentes después: ${templatesAfter.length}`);

    const created = templatesAfter.length - templatesBefore.length;

    return createSuccessResponse({ 
      success: true, 
      message: created > 0 
        ? `Templates por defecto inicializados exitosamente. ${created} nuevos templates creados. Total: ${templatesAfter.length} templates activos.`
        : `Templates verificados. Todos los templates ya existen. Total: ${templatesAfter.length} templates activos.`,
      count: templatesAfter.length,
      created: created,
      before: templatesBefore.length,
      after: templatesAfter.length
    }, 200);
  } catch (error) {
    console.error('Error initializing default templates:', error);
    return createErrorResponse(error, 500);
  }
}

