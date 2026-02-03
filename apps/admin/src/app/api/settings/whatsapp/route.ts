import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getWhatsAppConfig, saveWhatsAppConfig } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getWhatsAppConfig(auth.tenantId);
    
    if (!config) {
      return NextResponse.json({ config: null });
    }

    // No retornar el access token por seguridad
    const { accessToken, ...safeConfig } = config;
    
    return NextResponse.json({ config: safeConfig });
  } catch (error: any) {
    console.error('Error obteniendo configuración de WhatsApp:', error);
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
    const config = body.config || {};

    // Validar que el usuario tenga permisos
    if (auth.role !== 'admin' && auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validar campos requeridos
    if (config.enabled && (!config.phoneNumberId || !config.accessToken)) {
      return NextResponse.json(
        { error: 'phoneNumberId y accessToken son requeridos' },
        { status: 400 }
      );
    }

    await saveWhatsAppConfig(auth.tenantId, config);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error guardando configuración de WhatsApp:', error);
    return NextResponse.json(
      { error: 'Error al guardar configuración', details: error.message },
      { status: 500 }
    );
  }
}


