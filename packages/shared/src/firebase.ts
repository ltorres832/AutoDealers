// Configuración de Firebase Admin
// Solo se importa firebase-admin en el servidor (Node.js)

// Función helper para obtener firebase-admin solo cuando sea necesario
function getAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin solo puede usarse en el servidor');
  }

  try {
    return require('firebase-admin');
  } catch (e) {
    // Durante el build del cliente, esto puede fallar silenciosamente
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      // Retornar un objeto mock durante el build
      return {
        apps: [],
        initializeApp: () => ({}),
        app: () => ({}),
        credential: { cert: () => ({}) },
        firestore: () => ({}),
        auth: () => ({}),
        storage: () => ({}),
      } as any;
    }
    throw new Error('firebase-admin no está disponible. Asegúrate de que está instalado.');
  }
}

type AdminType = ReturnType<typeof getAdmin>;

let firebaseApp: AdminType['app']['App'] | null = null;
let initializationError: Error | null = null;

/**
 * Inicializa Firebase Admin con manejo robusto de errores
 */
export function initializeFirebase(): AdminType['app']['App'] {
  if (firebaseApp) {
    return firebaseApp;
  }

  // MODO DESARROLLO: Permitir trabajar sin Firebase
  if (process.env.SKIP_FIREBASE === 'true') {
    console.log('⚠️  MODO DESARROLLO: Firebase desactivado (usando datos mock)');
    const admin = getAdmin();
    // Crear una app mock para desarrollo
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        projectId: 'autodealers-7f62e-mock',
      }, 'mock-app');
    } else {
      firebaseApp = admin.app();
    }
    return firebaseApp;
  }

  if (initializationError) {
    throw initializationError;
  }

  const admin = getAdmin();
  if (!admin.apps.length) {
    try {
      // Intentar cargar variables de entorno desde .env.local si no están en process.env
      // Next.js normalmente carga .env.local automáticamente, pero por si acaso:
      let projectId = process.env.FIREBASE_PROJECT_ID;
      let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Si no están cargadas, intentar cargar manualmente (solo en Node.js)
      if (typeof window === 'undefined' && (!projectId || !clientEmail || !privateKey)) {
        try {
          const fs = require('fs');
          const path = require('path');
          const envPath = path.join(process.cwd(), '.env.local');
          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');

            let currentKey: string | null = null;
            let currentValue = '';
            let inMultiline = false;
            let quoteChar: string | null = null;

            for (let i = 0; i < lines.length; i++) {
              let line = lines[i];
              const trimmed = line.trim();

              // Saltar comentarios
              if (trimmed.startsWith('#')) continue;

              // Buscar línea con =
              const equalIndex = trimmed.indexOf('=');
              if (equalIndex > 0 && !inMultiline) {
                // Guardar variable anterior
                if (currentKey && currentValue) {
                  const finalValue = currentValue.trim();
                  if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
                  if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
                  if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
                }

                // Nueva variable
                currentKey = trimmed.substring(0, equalIndex).trim();
                let value = trimmed.substring(equalIndex + 1).trim();

                // Verificar si comienza con comillas (multilínea)
                if ((value.startsWith('"') && !value.endsWith('"')) ||
                  (value.startsWith("'") && !value.endsWith("'"))) {
                  inMultiline = true;
                  quoteChar = value[0];
                  currentValue = value.substring(1); // Remover comilla inicial
                } else {
                  // Valor simple (una línea)
                  if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                  }
                  currentValue = value;
                  // Guardar inmediatamente
                  if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = currentValue;
                  if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = currentValue;
                  if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = currentValue;
                  currentKey = null;
                  currentValue = '';
                }
              } else if (inMultiline) {
                // Continuación de valor multilínea
                if (trimmed.endsWith(quoteChar!) && trimmed.length > 1) {
                  // Fin del valor multilínea
                  currentValue += '\n' + trimmed.slice(0, -1);
                  if (currentKey) {
                    if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = currentValue.trim();
                    if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = currentValue.trim();
                    if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = currentValue.trim();
                  }
                  currentKey = null;
                  currentValue = '';
                  inMultiline = false;
                  quoteChar = null;
                } else {
                  // Continuar acumulando
                  currentValue += '\n' + line;
                }
              }
            }

            // Guardar última variable si queda pendiente
            if (currentKey && currentValue) {
              const finalValue = currentValue.trim();
              if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
              if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
              if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
            }
          }
        } catch (loadError: any) {
          // Ignorar errores al cargar .env.local manualmente
          console.warn('⚠️ No se pudo cargar .env.local manualmente:', loadError.message);
        }
      }

      // Procesar privateKey (remover escapes de \n)
      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Validar que al menos tengamos el Project ID o estemos en un entorno con ADC
      if (!projectId && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
        const error = new Error(
          '🔥 Firebase Admin: Credenciales no configuradas.\n\n' +
          'No se encontró FIREBASE_PROJECT_ID ni credenciales por defecto (ADC).\n' +
          'SOLUCIÓN:\n' +
          '1. Configura FIREBASE_PROJECT_ID en las variables de entorno.\n' +
          '2. O proporciona un archivo de service account.'
        );
        initializationError = error;

        console.error('❌ Firebase Admin - Credenciales no encontradas:', {
          hasProjectId: !!projectId,
          hasADC: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
          isCloudRun: !!process.env.K_SERVICE,
          cwd: process.cwd(),
        });

        // En modo build, no lanzar error
        if (process.env.NEXT_PHASE === 'phase-production-build') {
          console.warn('⚠️  Firebase not initialized during build (expected if credentials are not available)');
          try {
            firebaseApp = admin.initializeApp({
              projectId: projectId || 'autodealers-7f62e',
            }, '[DEFAULT]');
          } catch {
            firebaseApp = admin.apps.length > 0 ? admin.app() : null;
          }
          return firebaseApp!;
        }

        throw error;
      }

      const storageBucket = projectId === 'autodealers-7f62e'
        ? 'autodealers-7f62e.firebasestorage.app'
        : `${projectId || 'autodealers-7f62e'}.firebasestorage.app`;

      try {
        const admin = getAdmin();

        if (projectId && clientEmail && privateKey) {
          firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            } as any),
            storageBucket: storageBucket,
          });
          console.log('✅ Firebase Admin: Initialized with service account certificate');
        } else {
          // Fallback to Application Default Credentials (ADC)
          console.log('ℹ️ Firebase Admin: Using Application Default Credentials (ADC)');
          firebaseApp = admin.initializeApp({
            projectId: projectId || 'autodealers-7f62e',
            storageBucket: storageBucket,
          });
        }

        console.log('✅ Firebase Storage configurado con bucket:', storageBucket);

        // Configurar Firestore para ignorar undefined
        try {
          const db = admin.firestore(firebaseApp);
          db.settings({ ignoreUndefinedProperties: true });
        } catch (settingsError: any) {
          if (!settingsError.message?.includes('already been called')) {
            console.warn('⚠️  Settings error:', settingsError.message);
          }
        }

      } catch (initError: any) {
        if (initError.code === 'app/duplicate-app') {
          firebaseApp = admin.app();
          console.log('✅ Firebase Admin: Re-using existing instance');
        } else {
          console.error('🔥 Firebase Admin Initialization error:', initError);
          throw initError;
        }
      }
    } catch (error) {
      initializationError = error as Error;

      // En modo build, no lanzar error si las credenciales no están disponibles
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️  Firebase not initialized during build (this is expected if credentials are not available)');
        try {
          const admin = getAdmin();
          if (admin.apps.length === 0) {
            firebaseApp = admin.initializeApp({
              projectId: 'mock-project',
            }, '[DEFAULT]');
          } else {
            firebaseApp = admin.app();
          }
        } catch {
          const admin = getAdmin();
          firebaseApp = admin.apps.length > 0 ? admin.app() : null;
        }
        return firebaseApp!;
      }

      throw error;
    }
  } else {
    const admin = getAdmin();
    firebaseApp = admin.app();
  }

  return firebaseApp;
}

/**
 * Obtiene la instancia de Firestore
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 * Configura ignoreUndefinedProperties para evitar errores con valores undefined
 */
export function getFirestore(): any {
  // En modo desarrollo con SKIP_FIREBASE, retornar un mock
  if (process.env.SKIP_FIREBASE === 'true') {
    try {
      const app = initializeFirebase();
      const admin = getAdmin();
      const db = admin.firestore(app);
      // Configurar para ignorar undefined
      db.settings({ ignoreUndefinedProperties: true });
      return db;
    } catch (error) {
      console.error('❌ Firebase no inicializado:', error);
      // Lanzar error inmediatamente en lugar de retornar Proxy
      const errorMessage = error instanceof Error
        ? error.message
        : 'Firebase Admin no está configurado';

      throw new Error(
        `🔥 ${errorMessage}\n` +
        'Ejecuta: node apps/admin/configure-firebase.js\n' +
        'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*'
      );
    }
  }

  try {
    const app = initializeFirebase();
    const admin = getAdmin();
    const db = admin.firestore(app);
    // SOLUCIÓN DEFINITIVA: Configurar Firestore para ignorar undefined
    // Esto previene todos los errores de "Cannot use undefined as a Firestore value"
    // Solo intentar configurar si no se ha hecho antes
    try {
      // Verificar si ya se inicializó antes de configurar
      db.settings({ ignoreUndefinedProperties: true });
    } catch (settingsError: any) {
      // Si settings ya fue llamado, ignorar el error (puede pasar en algunas versiones)
      // Solo mostrar warning si no es el error esperado de "already initialized"
      if (!settingsError.message?.includes('already been initialized')) {
        console.warn('⚠️  No se pudo configurar ignoreUndefinedProperties:', settingsError.message);
      }
    }
    return db;
  } catch (error) {
    console.error('❌ Firebase no inicializado:', error);
    // En lugar de retornar un Proxy, lanzar el error inmediatamente
    // Esto evita que se intente usar un objeto inválido
    const errorMessage = error instanceof Error
      ? error.message
      : 'Firebase Admin no está configurado';

    throw new Error(
      `🔥 ${errorMessage}\n` +
      'Ejecuta: node apps/admin/configure-firebase.js\n' +
      'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*'
    );
  }
}

/**
 * Obtiene la instancia de Auth
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
export function getAuth(): any {
  try {
    const app = initializeFirebase();
    const admin = getAdmin();
    return admin.auth(app);
  } catch (error) {
    console.error('❌ Firebase Auth no inicializado:', error);
    return new Proxy({} as any, {
      get(target, prop) {
        throw new Error(
          '🔥 Firebase Admin no está configurado.\n' +
          'Ejecuta: node apps/admin/configure-firebase.js\n' +
          'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*'
        );
      }
    });
  }
}

/**
 * Obtiene la instancia de Storage
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
export function getStorage(): any {
  try {
    const app = initializeFirebase();
    const admin = getAdmin();
    const storage = admin.storage(app);

    // Verificar que el bucket esté configurado
    try {
      const projectId = app.options.projectId || process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
      const bucketName = projectId === 'autodealers-7f62e'
        ? 'autodealers-7f62e.firebasestorage.app'
        : `${projectId}.firebasestorage.app`;

      const bucket = storage.bucket(bucketName);
      if (!bucket.name) {
        throw new Error('Storage bucket no configurado');
      }
      console.log('✅ Firebase Storage bucket verificado:', bucket.name);
    } catch (bucketError: any) {
      console.error('❌ Error verificando storage bucket:', bucketError.message);
      // Intentar especificar el bucket explícitamente
      const projectId = app.options.projectId || process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
      const bucketName = projectId === 'autodealers-7f62e'
        ? 'autodealers-7f62e.firebasestorage.app'
        : `${projectId}.firebasestorage.app`;
      console.log('🔄 Intentando usar bucket:', bucketName);
      const admin = getAdmin();
      return admin.storage(app).bucket(bucketName) as any;
    }

    return storage;
  } catch (error) {
    console.error('❌ Firebase Storage no inicializado:', error);
    return new Proxy({} as any, {
      get(target, prop) {
        throw new Error(
          '🔥 Firebase Admin no está configurado.\n' +
          'Ejecuta: node apps/admin/configure-firebase.js\n' +
          'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*'
        );
      }
    });
  }
}

// Exportar también como default para compatibilidad
export default {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
};
