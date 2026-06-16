import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  encodeSocialOAuthState,
  isPlatformWhatsAppConfigured,
  provisionTenantWhatsAppFromPlatform,
} from '@autodealers/core';
import { buildMetaOAuthDialogUrl } from '@autodealers/core/meta-oauth-scopes';
import {
  auditMetaUserAccess,
  type MetaTokenHealth,
} from '@autodealers/core/meta-token-health';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

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

    const whatsappPlatformConfigured = await isPlatformWhatsAppConfigured();
    let integrations = integrationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const creds = data.credentials as Record<string, unknown> | undefined;
      const rawHealth = creds?.metaTokenHealth as MetaTokenHealth | undefined;
      const metaTokenHealth = rawHealth
        ? {
            readyForOrganic: !!rawHealth.readyForOrganic,
            readyForPaidAds: !!rawHealth.readyForPaidAds,
            readyForInstagram: !!rawHealth.readyForInstagram,
            missingScopes: rawHealth.missingScopes ?? [],
            warnings: rawHealth.warnings ?? [],
            adAccountId: rawHealth.adAccountId,
            checkedAt: rawHealth.checkedAt,
          }
        : undefined;
      return {
        id: doc.id,
        type: data.type,
        status: data.status || 'inactive',
        tenantId: auth.tenantId,
        platformManaged: data.platformManaged === true,
        metaTokenHealth: data.type === 'facebook' ? metaTokenHealth : undefined,
        credentials: creds
          ? {
              appId: creds.appId || undefined,
              hasAppSecret: !!creds.appSecret,
              pageName: typeof creds.pageName === 'string' ? creds.pageName : undefined,
            }
          : undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    const hasActiveWhatsApp = integrations.some(
      (i) => i.type === 'whatsapp' && i.status === 'active'
    );
    if (whatsappPlatformConfigured && !hasActiveWhatsApp) {
      integrations = [
        ...integrations,
        {
          id: 'platform-whatsapp',
          type: 'whatsapp',
          status: 'active',
          tenantId: auth.tenantId,
          platformManaged: true,
        },
      ];
    }

    return NextResponse.json({ integrations, whatsappPlatformConfigured });
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
    const { type, action, credentials, reauthorize } = body;

    if (action === 'verify_meta') {
      const fbSnap = await db
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('integrations')
        .where('type', '==', 'facebook')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (fbSnap.empty) {
        return NextResponse.json(
          { error: 'Facebook no está conectado' },
          { status: 400 }
        );
      }
      const fbDoc = fbSnap.docs[0];
      const creds = (fbDoc.data().credentials || {}) as Record<string, unknown>;
      const userToken = creds.accessToken != null ? String(creds.accessToken) : '';
      if (!userToken) {
        return NextResponse.json(
          { error: 'Sin token de usuario. Reconecta Meta.' },
          { status: 400 }
        );
      }
      const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
      const appId = credentialsDoc.data()?.metaAppId as string | undefined;
      const appSecret = credentialsDoc.data()?.metaAppSecret as string | undefined;
      if (!appId || !appSecret) {
        return NextResponse.json(
          { error: 'Credenciales de la app Meta no configuradas en admin' },
          { status: 400 }
        );
      }
      const tokenHealth = await auditMetaUserAccess({
        appId,
        appSecret,
        userAccessToken: userToken,
        pageAccessToken:
          creds.pageAccessToken != null ? String(creds.pageAccessToken) : undefined,
        pageId: creds.pageId != null ? String(creds.pageId) : undefined,
        adAccountId: creds.adAccountId != null ? String(creds.adAccountId) : undefined,
      });
      await fbDoc.ref.update({
        credentials: {
          ...creds,
          metaTokenHealth: tokenHealth,
          scopesGranted: tokenHealth.grantedScopes,
          ...(tokenHealth.adAccountId ? { adAccountId: tokenHealth.adAccountId } : {}),
        },
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      });
      return NextResponse.json({ success: true, metaTokenHealth: tokenHealth });
    }

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
            updatedAt: getFirestoreFieldValue().serverTimestamp(),
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
            createdAt: getFirestoreFieldValue().serverTimestamp(),
            updatedAt: getFirestoreFieldValue().serverTimestamp(),
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
      if (type === 'whatsapp') {
        if (!credentials) {
          const platformResult = await provisionTenantWhatsAppFromPlatform(
            auth.tenantId,
            auth.userId
          );
          if (platformResult.ok) {
            return NextResponse.json({
              success: true,
              platformManaged: true,
              integrationId: platformResult.integrationId,
              message: 'WhatsApp conectado con la configuración de la plataforma.',
            });
          }
          return NextResponse.json(
            {
              error: 'manual_credentials_required',
              message:
                'WhatsApp no está configurado en el panel de administración. Contacta al admin o ingresa credenciales propias.',
            },
            { status: 400 }
          );
        }

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
            updatedAt: getFirestoreFieldValue().serverTimestamp(),
          });
        } else {
          integrationRef = db.collection('tenants').doc(auth.tenantId).collection('integrations').doc();
          await integrationRef.set({
            type: 'whatsapp',
            status: 'active',
            credentials: credentials,
            ...whatsappFlat,
            settings: {},
            createdAt: getFirestoreFieldValue().serverTimestamp(),
            updatedAt: getFirestoreFieldValue().serverTimestamp(),
          });
        }

        return NextResponse.json({
          success: true,
          integrationId: integrationRef.id,
          message: 'WhatsApp conectado exitosamente',
        });
      }

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

          const { getIntegrationsOAuthCallbackUrl } = await import('@/lib/app-origin');
          const redirectUri = getIntegrationsOAuthCallbackUrl(request);
          const oauthType = type === 'meta' ? 'meta' : type === 'facebook' ? 'facebook' : 'instagram';

          const statePayload = encodeSocialOAuthState({
            type: oauthType === 'facebook' ? 'meta' : oauthType,
            tenantId: auth.tenantId,
            leadOwnerUserId: auth.userId,
          });
          const authUrl = buildMetaOAuthDialogUrl({
            appId,
            redirectUri,
            state: statePayload,
            type: oauthType,
            reauthorize: reauthorize === true,
          });

          console.log('Generando URL de OAuth:', { type, appId, redirectUri, reauthorize: !!reauthorize });
          
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


