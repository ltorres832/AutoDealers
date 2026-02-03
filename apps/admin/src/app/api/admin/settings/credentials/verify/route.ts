export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();

    if (!credentialsDoc.exists) {
      return NextResponse.json({
        exists: false,
        message: 'No hay credenciales guardadas',
        credentials: {}
      });
    }

    const data = credentialsDoc.data() || {};
    
    // Verificar qué credenciales están guardadas (sin mostrar valores completos)
    const verification: any = {
      exists: true,
      credentials: {
        meta: {
          appId: !!data.metaAppId,
          appSecret: !!data.metaAppSecret,
          verifyToken: !!data.metaVerifyToken,
          appIdLength: data.metaAppId ? data.metaAppId.length : 0,
          appSecretLength: data.metaAppSecret ? data.metaAppSecret.length : 0,
          verifyTokenLength: data.metaVerifyToken ? data.metaVerifyToken.length : 0,
        },
        whatsapp: {
          accessToken: !!data.whatsappAccessToken,
          phoneNumberId: !!data.whatsappPhoneNumberId,
          webhookVerifyToken: !!data.whatsappWebhookVerifyToken,
        },
        stripe: {
          secretKey: !!data.stripeSecretKey,
          webhookSecret: !!data.stripeWebhookSecret,
        },
        openai: {
          apiKey: !!data.openaiApiKey,
        },
        twilio: {
          accountSid: !!data.twilioAccountSid,
          authToken: !!data.twilioAuthToken,
          phoneNumber: !!data.twilioPhoneNumber,
        },
        email: {
          apiKey: !!data.emailApiKey,
          fromAddress: !!data.emailFromAddress,
        },
      },
      lastUpdated: data.updatedAt?.toDate?.()?.toISOString() || null,
      updatedBy: data.updatedBy || null,
    };

    // Mostrar preview de los últimos 4 caracteres para verificación
    if (data.metaAppId) {
      verification.credentials.meta.appIdPreview = '••••' + data.metaAppId.slice(-4);
    }
    if (data.metaAppSecret) {
      verification.credentials.meta.appSecretPreview = '••••' + data.metaAppSecret.slice(-4);
    }

    return NextResponse.json(verification);
  } catch (error: any) {
    console.error('Error verifying credentials:', error);
    return NextResponse.json(
      { 
        error: 'Error al verificar credenciales',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

