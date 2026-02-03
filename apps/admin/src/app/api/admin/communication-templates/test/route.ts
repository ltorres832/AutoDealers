export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-error-handler';

/**
 * Endpoint de prueba para verificar que todo funciona
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    // Test 1: Verificar Firebase
    let firebaseStatus = 'unknown';
    try {
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      firebaseStatus = 'initialized';
      
      // Test 2: Intentar leer la colección
      const testSnapshot = await db.collection('communication_templates').limit(1).get();
      firebaseStatus = `initialized - ${testSnapshot.size} templates found`;
    } catch (error: any) {
      firebaseStatus = `error: ${error.message}`;
    }

    // Test 3: Verificar funciones
    let functionsStatus = 'unknown';
    try {
      const { createTemplate, getTemplates } = await import('@autodealers/core');
      functionsStatus = 'functions imported successfully';
      
      // Test 4: Intentar obtener templates
      const templates = await getTemplates({ isActive: true });
      functionsStatus = `functions work - ${templates.length} templates found`;
    } catch (error: any) {
      functionsStatus = `error: ${error.message}`;
    }

    return createSuccessResponse({
      success: true,
      message: 'Test completado',
      tests: {
        firebase: firebaseStatus,
        functions: functionsStatus,
        auth: {
          userId: auth.userId,
          role: auth.role,
        },
      },
    }, 200);
  } catch (error: any) {
    console.error('Error en test:', error);
    return createErrorResponse(error, 500);
  }
}


