import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { ZohoMailService } from '@autodealers/messaging';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { config } = await request.json();

    if (!config || !config.clientId || !config.clientSecret || !config.refreshToken || !config.organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Faltan credenciales requeridas (Client ID, Client Secret, Refresh Token, Organization ID)',
      });
    }

    try {
      const zohoService = new ZohoMailService(
        config.clientId,
        config.clientSecret,
        config.refreshToken,
        config.domain || 'autoplataforma.com',
        config.organizationId
      );

      // Intentar obtener un access token (esto prueba la conexión)
      const accessToken = await (zohoService as any).getAccessToken();

      if (accessToken) {
        return NextResponse.json({
          success: true,
          message: '✅ Conexión exitosa con Zoho Mail API',
        });
      } else {
        return NextResponse.json({
          success: false,
          message: '❌ No se pudo obtener access token',
        });
      }
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        message: `❌ Error de conexión: ${error.message || 'Error desconocido'}`,
      });
    }
  } catch (error: any) {
    console.error('Error testing Zoho Mail connection:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Error al probar conexión',
    });
  }
}



