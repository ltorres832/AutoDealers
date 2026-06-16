import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';

// Importación dinámica para evitar problemas de inicialización
let getAuth: any;
let getFirestore: any;

async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string } | { error: 'invalid_credentials' | 'config' }> {
  const apiKeys = [
    getFirebaseWebClientConfig().apiKey,
    AUTODEALERS_FIREBASE_WEB_DEFAULTS.apiKey,
  ].filter((key, index, all) => key && all.indexOf(key) === index);

  if (apiKeys.length === 0) {
    return { error: 'config' };
  }

  for (const apiKey of apiKeys) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = (await res.json()) as {
      localId?: string;
      error?: { message?: string };
    };

    if (res.ok && data.localId) {
      return { uid: data.localId };
    }
  }

  return { error: 'invalid_credentials' };
}

async function initializeCore() {
  if (!getAuth || !getFirestore) {
    try {
      const core = await import('@autodealers/core');
      getAuth = core.getAuth;
      getFirestore = core.getFirestore;
    } catch (error: any) {
      console.error('❌ Error importando @autodealers/core:', error.message);
      // Fallback: usar Firebase Admin directamente
      if (!admin.apps.length) {
        try {
          // Durante el build, evitar cargar el service account
          if (process.env.NEXT_PHASE === 'phase-production-build' || typeof window !== 'undefined') {
            console.warn('⚠️ Build/Cliente: Omitiendo inicialización de Firebase Admin');
            getAuth = () => ({ getUser: async () => null } as any);
            getFirestore = () => ({ collection: () => ({}) } as any);
          } else {
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
            if (serviceAccountPath && serviceAccountPath.trim() !== '') {
              try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const fs = require('fs');
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const path = require('path');
                const resolvedPath = path.resolve(serviceAccountPath);
                if (fs.existsSync(resolvedPath)) {
                  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
                  admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                  });
                } else {
                  console.warn(`⚠️ Service account file not found: ${resolvedPath}`);
                  // Intentar usar Application Default Credentials como fallback
                  try {
                    admin.initializeApp();
                  } catch (adcError) {
                    console.warn('⚠️ No se pudo inicializar con ADC:', adcError);
                  }
                }
              } catch (requireError: any) {
                console.warn('⚠️ No se pudo cargar service account:', requireError?.message);
                // Intentar usar Application Default Credentials como fallback
                try {
                  admin.initializeApp();
                } catch (adcError) {
                  console.warn('⚠️ No se pudo inicializar con ADC:', adcError);
                }
              }
            } else {
              // Intentar usar Application Default Credentials
              try {
                admin.initializeApp();
              } catch (adcError) {
                console.warn('⚠️ No se pudo inicializar con ADC:', adcError);
              }
            }
          }
        } catch (e) {
          console.error('❌ Error inicializando Firebase Admin:', e);
        }
      }
      if (!getAuth) getAuth = () => admin.auth();
      if (!getFirestore) getFirestore = () => admin.firestore();
    }
  }
  return { getAuth, getFirestore };
}

export const dynamic = 'force-dynamic';

/**
 * Login completamente del lado del servidor con sesiones persistentes
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('🔐 Server Login - Verificando credenciales...');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password requeridos' },
        { status: 400 }
      );
    }

    const signIn = await signInWithEmailPassword(email, password);
    if ('error' in signIn) {
      if (signIn.error === 'config') {
        return NextResponse.json(
          { error: 'Error de configuración del servidor' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    console.log('✅ Credenciales Firebase correctas');

    // Inicializar core modules
    await initializeCore();

    // Obtener el usuario de Firebase
    let auth;
    let db;
    try {
      auth = getAuth();
      db = getFirestore();
      console.log('✅ Firebase Admin inicializado correctamente');
    } catch (firebaseError: any) {
      console.error('❌ Error inicializando Firebase Admin:', firebaseError.message);
      return NextResponse.json(
        {
          error: 'Error de configuración del servidor',
          details: 'Firebase Admin no está configurado correctamente. Ejecuta: node apps/admin/create-admin-user.js'
        },
        { status: 500 }
      );
    }

    let user;
    try {
      user = await auth.getUser(signIn.uid);
      console.log(`✅ Usuario encontrado: ${user.uid}`);

      const adminDoc = await db.collection('admin_users').doc(user.uid).get();
      const userDoc = await db.collection('users').doc(user.uid).get();
      const isAdmin =
        (adminDoc.exists && adminDoc.data()?.isActive !== false) ||
        userDoc.data()?.role === 'admin' ||
        user.customClaims?.role === 'admin';

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Esta cuenta no tiene acceso de administrador' },
          { status: 403 }
        );
      }

      // Verificar si el usuario está deshabilitado
      if (user.disabled) {
        console.log('⚠️ Usuario está deshabilitado, habilitándolo...');
        await auth.updateUser(user.uid, { disabled: false });
        console.log('✅ Usuario habilitado');
      }

      // Crear admin_users si falta (usuarios admin legacy en users)
      if (!adminDoc.exists) {
        console.log('📝 Usuario no existe en admin_users, creándolo...');
        await db.collection('admin_users').doc(user.uid).set({
          email: user.email,
          name: user.displayName || 'Administrador',
          role: 'super_admin',
          permissions: ['super_admin'],
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Usuario creado en admin_users');
      }
    } catch (error: any) {
      console.error('❌ Error buscando usuario:', error.message);
      return NextResponse.json(
        {
          error: 'Error al buscar usuario',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Generar un sessionId único y seguro
    const sessionId = randomBytes(32).toString('hex');

    console.log('💾 Creando sesión en Firestore...');

    // Crear sesión en Firestore
    const sessionData = {
      userId: user.uid,
      email: user.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('sessions').doc(sessionId).set(sessionData);

    console.log('✅ Sesión creada exitosamente');

    // Actualizar lastLogin y lastAccess en el documento del usuario
    const now = admin.firestore.Timestamp.now();
    await db.collection('users').doc(user.uid).set({
      lastLogin: now,
      lastAccess: now,
    }, { merge: true });

    // Si el usuario tiene tenantId, también actualizar en la colección de tenants/users
    const adminDoc = await db.collection('admin_users').doc(user.uid).get();
    const adminData = adminDoc.exists ? adminDoc.data() : null;

    if (adminData?.tenantId) {
      const tenantUserRef = db
        .collection('tenants')
        .doc(adminData.tenantId)
        .collection('users')
        .doc(user.uid);

      const tenantUserDoc = await tenantUserRef.get();
      if (tenantUserDoc.exists) {
        await tenantUserRef.update({
          lastLogin: now,
          lastAccess: now,
        });
      }
    }

    console.log('✅ Último acceso actualizado');

    // Retornar el sessionId como token
    return NextResponse.json({
      success: true,
      token: sessionId,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Admin',
        role: 'admin',
      },
      message: 'Autenticación exitosa',
    });

  } catch (error: any) {
    console.error('❌ Error en server login:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
