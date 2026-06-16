export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, isValidStripeWebhookSecret } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { StripeService } from '@autodealers/billing';

const db = getFirestore();

interface CredentialsConfig {
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  /** Opcional: signing secret del endpoint de Stripe que apunta a la app Advertiser */
  stripeAdvertiserWebhookSecret?: string;
  stripePublishableKey?: string;
  openaiApiKey?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  metaVerifyToken?: string;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappWebhookVerifyToken?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  emailApiKey?: string;
  emailFromAddress?: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      console.error('❌ GET /api/admin/settings/credentials - No auth found');
      return NextResponse.json({ error: 'Unauthorized', message: 'No se pudo verificar la autenticación' }, { status: 401 });
    }
    if (auth.role !== 'admin') {
      console.error('❌ GET /api/admin/settings/credentials - Role incorrecto:', auth.role);
      return NextResponse.json({ error: 'Forbidden', message: 'Solo administradores pueden acceder' }, { status: 403 });
    }

    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();

    if (!credentialsDoc.exists) {
      return NextResponse.json({ credentials: {} });
    }

    const data = credentialsDoc.data() || {};
    
    // Enmascarar las credenciales para mostrar solo los últimos 4 caracteres
    const maskedCredentials: any = {};
    Object.keys(data).forEach((key) => {
      // No incluir campos de sistema como updatedAt, updatedBy
      if (key === 'updatedAt' || key === 'updatedBy') {
        return;
      }
      
      if (data[key] && typeof data[key] === 'string' && data[key].length > 4) {
        // Enmascarar solo si tiene más de 4 caracteres
        maskedCredentials[key] = '••••••••' + data[key].slice(-4);
      } else if (data[key]) {
        // Mantener valores cortos o no-string tal cual
        maskedCredentials[key] = data[key];
      } else {
        // Si está vacío, no incluirlo (o incluir como cadena vacía)
        maskedCredentials[key] = '';
      }
    });

    return NextResponse.json({ credentials: maskedCredentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 PUT /api/admin/settings/credentials - Iniciando...');
    
    const auth = await verifyAuth(request);
    if (!auth) {
      console.error('❌ PUT /api/admin/settings/credentials - No auth found');
      return NextResponse.json({ error: 'Unauthorized', message: 'No se pudo verificar la autenticación' }, { status: 401 });
    }
    if (auth.role !== 'admin') {
      console.error('❌ PUT /api/admin/settings/credentials - Role incorrecto:', auth.role);
      return NextResponse.json({ error: 'Forbidden', message: 'Solo administradores pueden guardar credenciales' }, { status: 403 });
    }

    console.log('✅ Autenticación verificada, userId:', auth.userId);

    let body: CredentialsConfig;
    try {
      body = await request.json();
      console.log('✅ Body parseado correctamente, keys:', Object.keys(body));
    } catch (parseError: any) {
      console.error('❌ Error al parsear body:', parseError);
      return NextResponse.json(
        { error: 'Error al procesar los datos', message: parseError.message },
        { status: 400 }
      );
    }
    
    // Obtener credenciales actuales
    let currentCredentials: any = {};
    try {
      const currentDoc = await db.collection('system_settings').doc('credentials').get();
      currentCredentials = currentDoc.exists ? (currentDoc.data() || {}) : {};
      console.log('✅ Credenciales actuales obtenidas, keys:', Object.keys(currentCredentials));
    } catch (readError: any) {
      console.error('❌ Error al leer credenciales actuales:', readError);
      // Continuar con objeto vacío si falla la lectura
    }

    // Solo actualizar los campos que se enviaron (no enmascarados)
    const updates: any = {};
    try {
      Object.keys(body).forEach((key) => {
        const value = body[key as keyof CredentialsConfig];
        
        // Si el valor es undefined o null, saltarlo
        if (value === undefined || value === null) {
          return;
        }
        
        if (typeof value === 'string') {
          // Si está enmascarado (empieza con ••••), mantener el valor actual si existe
          if (value.startsWith('••••')) {
            if (currentCredentials[key]) {
              // Mantener el valor actual (no actualizar)
              console.log(`🔒 Manteniendo valor enmascarado para ${key}`);
              return;
            } else {
              // Si no hay valor actual, no hacer nada (no actualizar con el enmascarado)
              console.log(`⚠️ Valor enmascarado para ${key} pero no hay valor actual, saltando`);
              return;
            }
          }
          
          // Si es una cadena vacía, mantener el valor actual si existe, o no hacer nada
          if (value === '') {
            if (currentCredentials[key]) {
              // Mantener el valor actual (no borrar)
              console.log(`🔒 Manteniendo valor existente para ${key} (campo vacío en request)`);
              return;
            } else {
              // No hay valor actual, no hacer nada
              return;
            }
          }
          
          // Si es un valor completo (no enmascarado y no vacío), actualizarlo
          if (value.length > 0) {
            if (
              (key === 'stripeWebhookSecret' || key === 'stripeAdvertiserWebhookSecret') &&
              !isValidStripeWebhookSecret(value)
            ) {
              throw new Error(
                `${key} debe ser el Signing secret de Stripe (whsec_...), no la URL del webhook.`
              );
            }
            updates[key] = value;
            console.log(`✅ Actualizando ${key}`);
          }
        } else {
          // Manejar valores no-string
          updates[key] = value;
        }
      });
      console.log('✅ Updates preparados, keys:', Object.keys(updates));
      
      // Si no hay updates, retornar éxito sin hacer nada (las credenciales se mantienen)
      if (Object.keys(updates).length === 0) {
        console.log('⚠️ No hay campos para actualizar (todos están enmascarados o vacíos)');
        return NextResponse.json({ 
          success: true, 
          message: 'No hay cambios para guardar. Las credenciales existentes se mantienen sin cambios.' 
        });
      }
    } catch (processError: any) {
      console.error('❌ Error al procesar updates:', processError);
      return NextResponse.json(
        { error: 'Error al procesar las credenciales', message: processError.message },
        { status: 400 }
      );
    }

    // Guardar en Firestore
    try {
      await db.collection('system_settings').doc('credentials').set({
        ...currentCredentials,
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.userId,
      }, { merge: true });
      console.log('✅ Credenciales guardadas en Firestore');
    } catch (firestoreError: any) {
      console.error('❌ Error al guardar en Firestore:', firestoreError);
      return NextResponse.json(
        { 
          error: 'Error al guardar en la base de datos',
          message: firestoreError.message || 'Error de Firestore',
          code: firestoreError.code
        },
        { status: 500 }
      );
    }

    // Sincronizar con variables de entorno (simulado - en producción usar secret manager)
    try {
      await syncCredentialsToEnvironment(updates);
      console.log('✅ Credenciales sincronizadas');
    } catch (syncError: any) {
      console.warn('⚠️ Error al sincronizar (no crítico):', syncError);
      // No fallar si la sincronización falla
    }

    // Registrar en logs (no crítico si falla)
    try {
      await db.collection('logs').add({
        action: 'update_credentials',
        resource: 'system_settings',
        userId: auth.userId,
        details: {
          updatedKeys: Object.keys(updates),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Log registrado');
    } catch (logError: any) {
      console.warn('⚠️ Error al registrar log (no crítico):', logError);
      // No fallar si el log falla
    }

    console.log('✅ PUT /api/admin/settings/credentials - Completado exitosamente');
    return NextResponse.json({ success: true, message: 'Credenciales guardadas y sincronizadas' });
  } catch (error: any) {
    console.error('❌ Error updating credentials:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Error al guardar credenciales',
        message: error.message || 'Error interno del servidor',
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Sincroniza las credenciales a variables de entorno
 * En producción, esto podría actualizar un secret manager o configurar variables de entorno
 */
async function syncCredentialsToEnvironment(credentials: Record<string, any>) {
  // En desarrollo, esto es solo simulado
  // En producción, aquí se podría:
  // 1. Actualizar variables de entorno del servidor
  // 2. Actualizar un secret manager (AWS Secrets Manager, Google Secret Manager, etc.)
  // 3. Invalidar caché de credenciales
  // 4. Notificar a otros servicios para recargar credenciales

  console.log('Sincronizando credenciales:', Object.keys(credentials));
  
  // Las credenciales se leerán de Firestore en tiempo real cuando se necesiten
  // No es necesario actualizar process.env en runtime
}





