export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform } = body;

    if (!platform || !['facebook', 'instagram', 'whatsapp'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    // Generar URL de OAuth según plataforma
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/integrations/callback?platform=${platform}`;

    let authUrl = '';

    // Obtener credenciales de Meta desde Firestore
    const { getMetaCredentials } = await import('@autodealers/core');
    const metaCreds = await getMetaCredentials();
    const appId = metaCreds.appId;
    
    if (!appId) {
      return NextResponse.json(
        { error: 'App ID de Meta no configurado. Por favor, configura las credenciales primero.' },
        { status: 400 }
      );
    }

    switch (platform) {
      case 'facebook':
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_messaging,pages_show_list`;
        break;
      case 'instagram':
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish,instagram_manage_comments,pages_show_list,business_management`;
        break;
      case 'whatsapp':
        // WhatsApp Business API requiere configuración diferente
        authUrl = `${baseUrl}/api/integrations/whatsapp/setup`;
        break;
    }

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error connecting platform:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





