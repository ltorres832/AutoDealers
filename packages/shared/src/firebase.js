"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = initializeFirebase;
exports.getFirestore = getFirestore;
exports.getAuth = getAuth;
exports.getStorage = getStorage;
exports.getFirestoreFieldValue = getFirestoreFieldValue;
/**
 * Obtiene la instancia de Firebase Admin de forma segura para el bundle del cliente
 */
function getAdmin() {
    if (typeof window !== 'undefined') {
        return null; // El frontend no debe usar firebase-admin
    }
    // En el build o tests, retornamos un mock
    const isBuildOrSkip = process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.SKIP_FIREBASE === 'true' ||
        process.env.NODE_ENV === 'test';
    if (isBuildOrSkip) {
        // Mock Firestore: debe soportar collection().doc().get() y collection().where().limit().get()
        const emptySnap = { empty: true, docs: [] };
        const docSnapshot = { exists: false, data: () => null };
        const firestoreMock = () => ({
            settings: () => ({}),
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve(docSnapshot),
                    collection: () => ({
                        where: () => ({
                            limit: () => ({ get: () => Promise.resolve(emptySnap) }),
                        }),
                    }),
                }),
                where: () => ({
                    limit: () => ({ get: () => Promise.resolve(emptySnap) }),
                }),
                orderBy: () => ({
                    limit: () => ({ get: () => Promise.resolve(emptySnap) }),
                }),
                get: () => Promise.resolve(emptySnap),
            }),
            collectionGroup: () => ({
                where: () => ({
                    orderBy: () => ({
                        limit: () => ({
                            get: () => Promise.resolve(emptySnap),
                        }),
                    }),
                }),
            }),
            doc: () => ({ get: () => Promise.resolve({ exists: false, data: () => ({}) }) }),
            runTransaction: async (cb) => await cb({
                get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                update: () => ({}),
                set: () => ({}),
                delete: () => ({}),
            }),
        });
        // Añadir propiedades estáticas al mock de firestore
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
        return {
            apps: [],
            initializeApp: (opts) => ({
                options: { projectId: opts?.projectId || 'mock-project' },
            }),
            app: () => ({
                options: { projectId: 'mock-project' },
                firestore: firestoreMock,
                auth: () => ({}),
                storage: () => ({}),
            }),
            credential: { cert: () => ({}) },
            firestore: firestoreMock,
            auth: () => ({}),
            storage: () => ({}),
        };
    }
    // EN SERVIDOR: Cargar firebase-admin dinámicamente para no romper el empaquetado del cliente.
    // IMPORTANTE: Un require literal ayuda a que el tracer de Next.js (NFT) incluya la dependencia en el build standalone.
    try {
        // Solo requerir si no está ya en el scope global o similar (evitar re-requires costosos)
        return require('firebase-admin');
    }
    catch (e) {
        console.error('❌ Error cargando firebase-admin en el servidor:', e.message);
        // Proporcionar un error más descriptivo que ayude a diagnosticar en producción
        const error = new Error(`firebase-admin no está disponible en este entorno: ${e.message}`);
        error.code = 'MODULE_NOT_FOUND';
        throw error;
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
    // MODO DESARROLLO O BUILD: Permitir trabajar sin Firebase (basado en flag, entorno local o fase de build)
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.SKIP_FIREBASE === 'true';
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
    if ((isDevelopment && process.env.SKIP_FIREBASE === 'true') || isBuild) {
        if (isBuild) {
            console.log('⚠️  BUILD PHASE: Usando Firebase Admin mock para compilación');
        }
        else {
            console.log('⚠️  MODO DESARROLLO: Firebase desactivado (usando datos mock)');
        }
        const admin = getAdmin();
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
    const admin = getAdmin();
    if (!admin.apps.length) {
        try {
            let projectId = process.env.FIREBASE_PROJECT_ID;
            let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            if (privateKey) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }
            console.log('🔍 Firebase Environment:', {
                hasProjectId: !!projectId,
                projectId: projectId || '(missing)',
                hasClientEmail: !!clientEmail,
                hasPrivateKey: !!privateKey,
                nodeEnv: process.env.NODE_ENV,
                phase: process.env.NEXT_PHASE
            });
            const isCloudEnv = !!process.env.FIREBASE_CONFIG || !!process.env.K_SERVICE || !!process.env.K_REVISION;
            if (!projectId && !isCloudEnv) {
                const error = new Error('🔥 Firebase Admin: FIREBASE_PROJECT_ID no configurada.');
                initializationError = error;
                throw error;
            }
            const storageBucket = (projectId || 'autodealers-7f62e') === 'autodealers-7f62e'
                ? 'autodealers-7f62e.firebasestorage.app'
                : `${projectId || 'autodealers-7f62e'}.firebasestorage.app`;
            const appOptions = { storageBucket, projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT || 'autodealers-7f62e' };
            const isCloudRun = !!(process.env.K_SERVICE || process.env.K_REVISION);
            const isAppHosting = !!(isCloudRun || process.env.FIREBASE_CONFIG || process.env.GCLOUD_PROJECT);
            const hasValidCert = projectId && clientEmail && privateKey && (privateKey.includes('BEGIN') || privateKey.length > 100);
            let credentialSet = false;
            // Cloud Run / App Hosting: usar SIEMPRE ADC primero. La cuenta de servicio del runtime
            // tiene acceso a Firestore en el proyecto. Claves FIREBASE_* en secretos a menudo están
            // rotadas o mal formateadas → UNAUTHENTICATED en Firestore si se prioriza el cert.
            if (isCloudRun) {
                try {
                    appOptions.credential = admin.credential.applicationDefault();
                    console.log('✅ Firebase Admin Shared: ADC (Cloud Run / App Hosting)');
                    credentialSet = true;
                }
                catch (adcError) {
                    console.warn('⚠️ ADC en Cloud Run falló:', adcError.message);
                }
            }
            if (!credentialSet && hasValidCert) {
                try {
                    const normalizedKey = privateKey.replace(/\\n/g, '\n').trim();
                    appOptions.credential = admin.credential.cert({
                        projectId: projectId,
                        clientEmail: clientEmail,
                        privateKey: normalizedKey,
                    });
                    console.log('✅ Firebase Admin Shared: Certificado explícito');
                    credentialSet = true;
                }
                catch (certError) {
                    console.warn('⚠️ Certificado explícito falló:', certError.message);
                }
            }
            if (!credentialSet && isAppHosting) {
                try {
                    appOptions.credential = admin.credential.applicationDefault();
                    console.log('ℹ️ Firebase Admin Shared: Usando Application Default Credentials');
                    credentialSet = true;
                }
                catch (adcError) {
                    console.warn('⚠️ ADC falló:', adcError.message);
                }
            }
            if (!credentialSet) {
                console.log('ℹ️ Firebase Admin Shared: Inicializando sin credential explícito (SDK usará ADC si está disponible)');
            }
            firebaseApp = admin.initializeApp(appOptions);
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
                    console.warn('⚠️ Build fallback en shared');
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
        try {
            const app = initializeFirebase();
            const admin = getAdmin();
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
        const app = initializeFirebase();
        const admin = getAdmin();
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
        const app = initializeFirebase();
        const admin = getAdmin();
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
        const app = initializeFirebase();
        const admin = getAdmin();
        const storage = admin.storage(app);
        // En builds empaquetados (p. ej. Next/webpack) la API puede no exponer bucket(); no fallar el build.
        if (!storage || typeof storage.bucket !== 'function') {
            console.warn('⚠️ Firebase Storage: bucket() no disponible; omitiendo verificación');
            return storage;
        }
        // Verificar que el bucket esté configurado
        try {
            const projectId = app?.options?.projectId || process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
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
            const projectId = app?.options?.projectId || process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
            const bucketName = projectId === 'autodealers-7f62e'
                ? 'autodealers-7f62e.firebasestorage.app'
                : `${projectId}.firebasestorage.app`;
            console.log('🔄 Intentando usar bucket:', bucketName);
            return storage.bucket(bucketName);
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
/**
 * Obtiene el objeto FieldValue de Firestore para su uso en actualizaciones
 */
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
    getFirestoreFieldValue,
};
