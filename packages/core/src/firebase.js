"use strict";
// Configuración de Firebase Admin
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = initializeFirebase;
exports.getFirestore = getFirestore;
exports.getAuth = getAuth;
exports.getStorage = getStorage;
exports.getFirestoreStatic = getFirestoreStatic;
exports.getFirestoreFieldValue = getFirestoreFieldValue;
// @ts-ignore
function getAdmin() {
    if (typeof window !== 'undefined')
        return null;
    try {
        return require('firebase-admin');
    }
    catch (e) {
        // Retornar un objeto mock durante el build o si se solicita saltar Firebase
        const isBuildOrSkip = process.env.NEXT_PHASE === 'phase-production-build' ||
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
                runTransaction: async (cb) => await cb({
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
                    increment: (n) => ({ _type: 'increment', n }),
                    arrayUnion: (...args) => ({ _type: 'arrayUnion', args }),
                    arrayRemove: (...args) => ({ _type: 'arrayRemove', args }),
                    delete: () => ({ _type: 'delete' }),
                },
                Timestamp: {
                    now: () => new Date(),
                    fromDate: (d) => d,
                    fromMillis: (m) => new Date(m),
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
            };
        }
        throw e;
    }
}
let firebaseApp = null;
let initializationError = null;
/**
 * Inicializa Firebase Admin con manejo robusto de errores
 */
function initializeFirebase() {
    if (firebaseApp) {
        return firebaseApp;
    }
    const admin = getAdmin();
    // MODO DESARROLLO O BUILD: Permitir trabajar sin Firebase (basado en flag, entorno local o fase de build)
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
    if (process.env.SKIP_FIREBASE === 'true' || isBuild) {
        if (isBuild) {
            console.log('⚠️  BUILD PHASE: Usando Firebase Admin mock para compilación');
        }
        else {
            console.log('⚠️  MODO DESARROLLO: Firebase desactivado (usando datos mock)');
        }
        // Crear una app mock
        if (admin.apps.length === 0) {
            firebaseApp = admin.initializeApp({
                projectId: isBuild ? 'mock-project' : 'autodealers-7f62e-mock',
            }, isBuild ? '[DEFAULT]' : 'mock-app');
        }
        else {
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
            const appOptions = { storageBucket, projectId };
            const isCloudRun = !!(process.env.K_SERVICE || process.env.K_REVISION);
            if (isCloudRun) {
                try {
                    appOptions.credential = admin.credential.applicationDefault();
                    console.log('✅ Firebase Admin: ADC (Cloud Run / App Hosting)');
                }
                catch (e) {
                    console.warn('⚠️ ADC Cloud Run falló:', e?.message);
                }
            }
            if (!appOptions.credential && projectId && clientEmail && privateKey) {
                appOptions.credential = admin.credential.cert({ projectId, clientEmail, privateKey });
                console.log('✅ Firebase Admin: Inicializado con certificado explícito');
            }
            if (!appOptions.credential) {
                const effectiveProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'autodealers-7f62e';
                console.log('ℹ️ Firebase Admin: Usando Application Default Credentials (ADC)');
                appOptions.projectId = effectiveProjectId;
            }
            firebaseApp = admin.initializeApp(appOptions);
            // Configurar Firestore
            try {
                const db = admin.firestore(firebaseApp);
                db.settings({ ignoreUndefinedProperties: true });
            }
            catch (e) { }
        }
        catch (error) {
            if (error.code === 'app/duplicate-app') {
                firebaseApp = admin.app();
            }
            else {
                initializationError = error;
                if (process.env.NEXT_PHASE === 'phase-production-build') {
                    console.warn('⚠️  Build fallback');
                    return admin.apps.length ? admin.app() : admin.initializeApp({ projectId: 'mock' }, '[DEFAULT]');
                }
                throw error;
            }
        }
    }
    else {
        firebaseApp = admin.app();
    }
    return firebaseApp;
}
/**
 * Obtiene la instancia de Firestore
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 * Configura ignoreUndefinedProperties para evitar errores con valores undefined
 */
function getFirestore() {
    // En modo desarrollo con SKIP_FIREBASE, retornar un mock
    if (process.env.SKIP_FIREBASE === 'true') {
        const admin = getAdmin();
        try {
            const app = initializeFirebase();
            const db = admin.firestore(app);
            // Configurar para ignorar undefined
            db.settings({ ignoreUndefinedProperties: true });
            return db;
        }
        catch (error) {
            console.error('❌ Firebase no inicializado:', error);
            // Lanzar error inmediatamente en lugar de retornar Proxy
            const errorMessage = error instanceof Error
                ? error.message
                : 'Firebase Admin no está configurado';
            throw new Error(`🔥 ${errorMessage}\n` +
                'Ejecuta: node apps/admin/configure-firebase.js\n' +
                'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*');
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
        }
        catch (settingsError) {
            // Si settings ya fue llamado, ignorar el error (puede pasar en algunas versiones)
            // Solo mostrar warning si no es el error esperado de "already initialized"
            if (!settingsError.message?.includes('already been initialized')) {
                console.warn('⚠️  No se pudo configurar ignoreUndefinedProperties:', settingsError.message);
            }
        }
        return db;
    }
    catch (error) {
        console.error('❌ Firebase no inicializado:', error);
        // En lugar de retornar un Proxy, lanzar el error inmediatamente
        // Esto evita que se intente usar un objeto inválido
        const errorMessage = error instanceof Error
            ? error.message
            : 'Firebase Admin no está configurado';
        throw new Error(`🔥 ${errorMessage}\n` +
            'Ejecuta: node apps/admin/configure-firebase.js\n' +
            'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*');
    }
}
/**
 * Obtiene la instancia de Auth
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
function getAuth() {
    try {
        const admin = getAdmin();
        const app = initializeFirebase();
        return admin.auth(app);
    }
    catch (error) {
        console.error('❌ Firebase Auth no inicializado:', error);
        return new Proxy({}, {
            get(target, prop) {
                throw new Error('🔥 Firebase Admin no está configurado.\n' +
                    'Ejecuta: node apps/admin/configure-firebase.js\n' +
                    'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*');
            }
        });
    }
}
/**
 * Obtiene la instancia de Storage
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
function getStorage() {
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
        }
        catch (bucketError) {
            console.error('❌ Error verificando storage bucket:', bucketError.message);
            // Intentar especificar el bucket explícitamente
            const projectId = app.options.projectId || process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
            const bucketName = projectId === 'autodealers-7f62e'
                ? 'autodealers-7f62e.firebasestorage.app'
                : `${projectId}.firebasestorage.app`;
            console.log('🔄 Intentando usar bucket:', bucketName);
            const admin = getAdmin();
            return admin.storage(app).bucket(bucketName);
        }
        return storage;
    }
    catch (error) {
        console.error('❌ Firebase Storage no inicializado:', error);
        return new Proxy({}, {
            get(target, prop) {
                throw new Error('🔥 Firebase Admin no está configurado.\n' +
                    'Ejecuta: node apps/admin/configure-firebase.js\n' +
                    'O verifica que .env.local existe en apps/admin/ con las variables FIREBASE_*');
            }
        });
    }
}
function getFirestoreStatic() {
    return getAdmin().firestore;
}
function getFirestoreFieldValue() {
    try {
        const admin = getAdmin();
        // Retornar un objeto que soporte tanto .serverTimestamp() como .FieldValue.serverTimestamp()
        const fieldValue = admin.firestore.FieldValue;
        const timestamp = admin.firestore.Timestamp;
        // Crear un proxy que actúe como FieldValue pero también tenga subpropiedades si es necesario
        return new Proxy(fieldValue, {
            get(target, prop) {
                if (prop === 'FieldValue')
                    return fieldValue;
                if (prop === 'Timestamp')
                    return timestamp;
                return target[prop];
            }
        });
    }
    catch (e) {
        // Retornar mock mínimo para evitar crashes en el build
        const mockFieldValue = {
            serverTimestamp: () => ({ _type: 'timestamp' }),
            increment: (n) => n,
            arrayUnion: (...args) => args,
            arrayRemove: (...args) => args,
            delete: () => ({}),
        };
        return new Proxy(mockFieldValue, {
            get(target, prop) {
                if (prop === 'FieldValue')
                    return mockFieldValue;
                if (prop === 'Timestamp')
                    return {
                        now: () => new Date(),
                        fromDate: (d) => d,
                    };
                return target[prop];
            }
        });
    }
}
// Exportar también como default para compatibilidad
exports.default = {
    initializeFirebase,
    getFirestore,
    getAuth,
    getStorage,
    getFirestoreStatic,
    getFirestoreFieldValue,
};
