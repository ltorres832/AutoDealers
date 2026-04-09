// Configuración de Firebase Admin

// @ts-ignore
function getAdmin(): any {
  if (typeof window !== 'undefined') return null;
  try {
    return require('firebase-admin');
  } catch (e) {
    // Retornar un objeto mock durante el build o si se solicita saltar Firebase
    const isBuildOrSkip =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.SKIP_FIREBASE === 'true' ||
      process.env.NODE_ENV === 'test';

    if (isBuildOrSkip) {
      // Crear una función mock para firestore() que también tenga propiedades adicionales
      const firestoreMock = () => ({
        settings: () => ({}),
        collection: () => ({
          doc: () => ({
            collection: () => ({
              where: () => ({
                limit: () => ({
                  get: () => Promise.resolve({ empty: true, docs: [] })
                })
              })
            }),
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
            set: () => ({}),
            update: () => ({}),
            delete: () => ({}),
          })
        }),
        collectionGroup: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                get: () => Promise.resolve({ empty: true, docs: [] })
              })
            })
          })
        }),
        doc: () => ({ get: () => Promise.resolve({ exists: false, data: () => ({}) }) }),
        runTransaction: async (cb: any) => await cb({
          get: () => Promise.resolve({ exists: false, data: () => ({}) }),
          update: () => ({}),
          set: () => ({}),
          delete: () => ({}),
        }),
        batch: () => ({
          set: () => ({}),
          update: () => ({}),
          delete: () => ({}),
          commit: () => Promise.resolve(),
        }),
      });

      // Adjuntar propiedades FieldValue y Timestamp a la función mock
      Object.assign(firestoreMock, {
        FieldValue: {
          serverTimestamp: () => ({ _type: 'timestamp' }),
          increment: (n: number) => ({ _type: 'increment', n }),
          arrayUnion: (...args: any[]) => ({ _type: 'arrayUnion', args }),
          arrayRemove: (...args: any[]) => ({ _type: 'arrayRemove', args }),
          delete: () => ({ _type: 'delete' }),
        },
        Timestamp: {
          now: () => new Date(),
          fromDate: (d: Date) => d,
          fromMillis: (m: number) => new Date(m),
        }
      });

      // Retornar un objeto mock durante el build
      return {
        apps: [],
        initializeApp: () => ({ options: { projectId: 'mock-project' } }),
        app: () => ({
          options: { projectId: 'mock-project' },
          firestore: firestoreMock,
          auth: () => ({}),
          storage: () => ({ bucket: () => ({ name: 'mock' }) }),
        }),
        credential: { cert: () => ({}) },
        firestore: firestoreMock,
        auth: () => ({}),
        storage: () => ({}),
      } as any;
    }
    throw e;
  }
}

let firebaseApp: any = null;
let initializationError: Error | null = null;

/**
 * Inicializa Firebase Admin con manejo robusto de errores
 */
export function initializeFirebase(): any {
  if (firebaseApp) {
    return firebaseApp;
  }

  const admin = getAdmin();
  // MODO DESARROLLO O BUILD: Permitir trabajar sin Firebase (basado en flag, entorno local o fase de build)
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

  if (process.env.SKIP_FIREBASE === 'true' || isBuild) {
    if (isBuild) {
      console.log('⚠️  BUILD PHASE: Usando Firebase Admin mock para compilación');
    } else {
      console.log('⚠️  MODO DESARROLLO: Firebase desactivado (usando datos mock)');
    }

    // Crear una app mock
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        projectId: isBuild ? 'mock-project' : 'autodealers-7f62e-mock',
      }, isBuild ? '[DEFAULT]' : 'mock-app');
    } else {
      firebaseApp = admin.app(isBuild ? undefined : 'mock-app');
    }
    return firebaseApp;
  }

  if (initializationError) {
    throw initializationError;
  }

  // Solo inicializar si estamos en runtime, no durante el build
  // Verificar que no estamos en el cliente (window solo existe en el navegador)
  // @ts-ignore - window puede no estar definido en Node.js
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin solo puede usarse en el servidor');
  }

  if (!admin.apps.length) {
    try {
      // Intentar cargar variables de entorno desde .env.local si no están en process.env
      let projectId = process.env.FIREBASE_PROJECT_ID;
      let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Procesar privateKey (remover escapes de \n)
      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const isCloudEnv = !!process.env.FIREBASE_CONFIG || !!process.env.K_SERVICE || !!process.env.K_REVISION;

      if (!projectId && !isCloudEnv) {
        const error = new Error('🔥 Firebase Admin: FIREBASE_PROJECT_ID no configurada.');
        initializationError = error;
        throw error;
      }

      const storageBucket = (projectId || 'autodealers-7f62e') === 'autodealers-7f62e'
        ? 'autodealers-7f62e.firebasestorage.app'
        : `${projectId || 'autodealers-7f62e'}.firebasestorage.app`;

      const admin = getAdmin();
      const appOptions: any = { storageBucket, projectId };

      if (projectId && clientEmail && privateKey) {
        appOptions.credential = admin.credential.cert({ projectId, clientEmail, privateKey });
        console.log('✅ Firebase Admin: Inicializado con certificado explícito');
      } else {
        const effectiveProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'autodealers-7f62e';
        console.log('ℹ️ Firebase Admin: Usando Application Default Credentials (ADC)');
        appOptions.projectId = effectiveProjectId;
      }

      firebaseApp = admin.initializeApp(appOptions);

      // Configurar Firestore
      try {
        const db = admin.firestore(firebaseApp);
        db.settings({ ignoreUndefinedProperties: true });
      } catch (e) { }

    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        firebaseApp = admin.app();
      } else {
        initializationError = error as Error;
        if (process.env.NEXT_PHASE === 'phase-production-build') {
          console.warn('⚠️  Build fallback');
          return admin.apps.length ? admin.app() : admin.initializeApp({ projectId: 'mock' }, '[DEFAULT]');
        }
        throw error;
      }
    }
  } else {
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
    const admin = getAdmin();
    try {
      const app = initializeFirebase();
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
    const admin = getAdmin();
    const app = initializeFirebase();
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
    const admin = getAdmin();
    const app = initializeFirebase();
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
    const admin = getAdmin();
    const app = initializeFirebase();
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

export function getFirestoreStatic(): any {
  return getAdmin().firestore;
}

export function getFirestoreFieldValue(): any {
  try {
    const admin = getAdmin();
    // Retornar un objeto que soporte tanto .serverTimestamp() como .FieldValue.serverTimestamp()
    const fieldValue = admin.firestore.FieldValue;
    const timestamp = admin.firestore.Timestamp;

    // Crear un proxy que actúe como FieldValue pero también tenga subpropiedades si es necesario
    return new Proxy(fieldValue, {
      get(target, prop) {
        if (prop === 'FieldValue') return fieldValue;
        if (prop === 'Timestamp') return timestamp;
        return (target as any)[prop];
      }
    });
  } catch (e) {
    // Retornar mock mínimo para evitar crashes en el build
    const mockFieldValue = {
      serverTimestamp: () => ({ _type: 'timestamp' }),
      increment: (n: number) => n,
      arrayUnion: (...args: any[]) => args,
      arrayRemove: (...args: any[]) => args,
      delete: () => ({}),
    };
    return new Proxy(mockFieldValue, {
      get(target, prop) {
        if (prop === 'FieldValue') return mockFieldValue;
        if (prop === 'Timestamp') return {
          now: () => new Date(),
          fromDate: (d: Date) => d,
        };
        return (target as any)[prop];
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
  getFirestoreStatic,
  getFirestoreFieldValue,
};
