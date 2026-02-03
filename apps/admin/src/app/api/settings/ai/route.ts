import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAIConfig, updateAIConfig } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getAIConfig(auth.tenantId);
    
    // No retornar la API key por seguridad
    const { apiKey, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error: any) {
    console.error('Error obteniendo configuración de IA:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates = body.config || {};

    // Validar que el usuario tenga permisos
    if (auth.role !== 'admin' && auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await updateAIConfig(auth.tenantId, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando configuración de IA:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: error.message },
      { status: 500 }
    );
  }
}
