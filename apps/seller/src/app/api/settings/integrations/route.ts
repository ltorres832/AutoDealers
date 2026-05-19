import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, encodeSocialOAuthState } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/settings/integrations - Iniciando verificación de auth...');
    
    let auth;
    try {
      auth = await verifyAuth(request);
      console.log('🔍 verifyAuth retornó:', auth ? 'Usuario encontrado' : 'null');
    } catch (authError: any) {
      console.error('❌ Error en verifyAuth:', authError.message || authError);
      console.error('❌ Stack:', authError.stack);
      return NextResponse.json({ 
        error: 'Error de autenticación',
        message: authError.message || 'Error al verificar autenticación',
        details: authError.stack || 'Sin detalles adicionales'
      }, { status: 401 });
    }
    
    if (!auth) {
      console.log('❌ verifyAuth retornó null - No autenticado');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'No se pudo verificar la autenticación',
        details: 'verifyAuth retornó null. Verifica que el token sea válido y que Firebase Admin esté configurado correctamente.'
      }, { status: 401 });
    }
    
    if (!auth.tenantId) {
      console.log('❌ Usuario no tiene tenantId:', auth);
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Usuario no tiene tenantId asignado',
        details: `Usuario: ${auth.userId}, Role: ${auth.role}, TenantId: ${auth.tenantId || 'undefined'}`
      }, { status: 401 });
    }
    
    console.log('✅ Autenticación exitosa:', { userId: auth.userId, tenantId: auth.tenantId });

    // Obtener integraciones del tenant del seller (puede ser su tenant propio o compartido)
    const integrationsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('integrations')
      .get();

    const integrations = integrationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        status: data.status || 'inactive',
        tenantId: auth.tenantId,
        credentials: data.credentials
          ? {
              appId: data.credentials.appId || undefined,
              hasAppSecret: !!data.credentials.appSecret,
              pageName:
                typeof data.credentials.pageName === 'string'
                  ? data.credentials.pageName
                  : undefined,
            }
          : undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return NextResponse.json({ integrations: integrations || [] });
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, integrations: [] },
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
    const { type, action, credentials } = body;

    if (action === 'save_credentials') {
      // Guardar credenciales de Meta (App ID y App Secret) del tenant
      if ((type === 'facebook' || type === 'instagram') && credentials) {
        const existingSnapshot = await db
          .collection('tenants')
          .doc(auth.tenantId)
          .collection('integrations')
          .where('type', '==', type)
          .get();

        let integrationRef;
        if (!existingSnapshot.empty) {
          integrationRef = existingSnapshot.docs[0].ref;
          await integrationRef.update({
            credentials: {
              ...existingSnapshot.docs[0].data().credentials,
              appId: credentials.appId,
              appSecret: credentials.appSecret,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          integrationRef = db.collection('tenants').doc(auth.tenantId).collection('integrations').doc();
          await integrationRef.set({
            type,
            status: 'pending', // Pendiente hasta completar OAuth
            credentials: {
              appId: credentials.appId,
              appSecret: credentials.appSecret,
            },
            settings: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({ 
          success: true, 
          integrationId: integrationRef.id,
          message: 'Credenciales guardadas exitosamente'
        });
      }

      return NextResponse.json({ error: 'Invalid credentials type' }, { status: 400 });
    }

    if (action === 'connect') {
      // Para integraciones manuales (WhatsApp), guardar las credenciales
      if (type === 'whatsapp' && credentials) {
        const cred = credentials as Record<string, unknown>;
        const phoneNumberId = String(
          cred.phoneNumberId ?? cred.phone_number_id ?? ''
        ).trim();
        const accessToken = String(
          cred.accessToken ?? cred.longLivedUserToken ?? ''
        ).trim();

        const existingSnapshot = await db
          .collection('tenants')
          .doc(auth.tenantId)
          .collection('integrations')
          .where('type', '==', 'whatsapp')
          .get();

        let integrationRef;
        const whatsappFlat: Record<string, unknown> = {
          leadOwnerUserId: auth.userId,
        };
        if (phoneNumberId) whatsappFlat.phoneNumberId = phoneNumberId;
        if (accessToken) whatsappFlat.accessToken = accessToken;

        if (!existingSnapshot.empty) {
          integrationRef = existingSnapshot.docs[0].ref;
          await integrationRef.update({
            status: 'active',
            credentials: credentials,
            ...whatsappFlat,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          integrationRef = db.collection('tenants').doc(auth.tenantId).collection('integrations').doc();
          await integrationRef.set({
            type: 'whatsapp',
            status: 'active',
            credentials: credentials,
            ...whatsappFlat,
            settings: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({ 
          success: true, 
          integrationId: integrationRef.id,
          message: 'WhatsApp conectado exitosamente'
        });
      }

      // Meta (Facebook + Instagram): un solo OAuth; también compat. facebook|instagram por separado
      if (type === 'facebook' || type === 'instagram' || type === 'meta') {
        try {
          // Obtener credenciales globales desde system_settings.credentials (donde el admin las guarda)
          const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
          
          let appId: string | undefined;
          let appSecret: string | undefined;

          if (credentialsDoc.exists) {
            const credentialsData = credentialsDoc.data();
            appId = credentialsData?.metaAppId;
            appSecret = credentialsData?.metaAppSecret;
          }

          // Si no hay credenciales en system_settings, intentar obtener del tenant (compatibilidad hacia atrás)
          if (!appId || !appSecret) {
            const integrationSnapshot = await db
              .collection('tenants')
              .doc(auth.tenantId)
              .collection('integrations')
              .where('type', '==', type)
              .get();

            if (!integrationSnapshot.empty) {
              const integrationData = integrationSnapshot.docs[0].data();
              const tenantCredentials = integrationData.credentials;
              appId = tenantCredentials?.appId || appId;
              appSecret = tenantCredentials?.appSecret || appSecret;
            }
          }

          if (!appId || !appSecret) {
            return NextResponse.json({ 
              error: 'Credenciales no configuradas',
              message: `Las credenciales de Meta no están configuradas. Por favor contacta al administrador del sistema para que configure las credenciales de Meta (App ID y App Secret).`,
              details: 'El administrador debe configurar las credenciales de Meta en el panel de administración (/admin/settings/general) antes de que puedas conectar tu cuenta.'
            }, { status: 400 });
          }

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
          
          if (!baseUrl) {
            return NextResponse.json({ 
              error: 'URL base no configurada',
              message: 'La variable de entorno NEXT_PUBLIC_APP_URL no está configurada.',
              details: 'Por favor configura NEXT_PUBLIC_APP_URL en las variables de entorno del servidor.'
            }, { status: 500 });
          }

          const redirectUri = `${baseUrl}/api/settings/integrations/callback`;
          const metaScopes =
            'pages_show_list,pages_manage_posts,pages_read_engagement,pages_messaging,instagram_basic,instagram_content_publish,instagram_manage_messages,ads_read,ads_management';
          const scope =
            type === 'instagram'
              ? 'instagram_basic,instagram_content_publish,instagram_manage_messages,pages_show_list'
              : type === 'facebook'
                ? metaScopes
                : metaScopes;
          const oauthType = type === 'meta' ? 'meta' : type;

          const statePayload = encodeSocialOAuthState({
            type: oauthType,
            tenantId: auth.tenantId,
            leadOwnerUserId: auth.userId,
          });
          const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${encodeURIComponent(statePayload)}`;
          
          console.log('Generando URL de OAuth:', { type, appId, redirectUri, scope });
          
          return NextResponse.json({ authUrl });
        } catch (dbError: any) {
          console.error('Error obteniendo credenciales:', dbError);
          return NextResponse.json({ 
            error: 'Error al obtener credenciales',
            message: 'Hubo un error al obtener las credenciales del sistema.',
            details: dbError.message || 'Error desconocido al consultar la base de datos.'
          }, { status: 500 });
        }
      }

      return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error connecting integration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


