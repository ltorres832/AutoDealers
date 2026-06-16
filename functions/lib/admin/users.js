"use strict";
/**
 * Cloud Functions para Administración de Usuarios (Admin)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatus = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const auth = admin.auth();
/**
 * Obtener todos los usuarios (Admin only)
 */
exports.getAllUsers = functions.https.onCall(async (data, context) => {
    // Verificar que el usuario es admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = await Promise.all(usersSnapshot.docs.map(async (doc) => {
            const userData = doc.data();
            let authUser = null;
            try {
                authUser = await auth.getUser(doc.id);
            }
            catch (e) {
                // Usuario puede no existir en Auth
            }
            return Object.assign(Object.assign({ id: doc.id }, userData), { email: (authUser === null || authUser === void 0 ? void 0 : authUser.email) || userData.email, disabled: (authUser === null || authUser === void 0 ? void 0 : authUser.disabled) || false });
        }));
        return { users };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al obtener usuarios', error.message);
    }
});
/**
 * Obtener usuario por ID (Admin only)
 */
exports.getUserById = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId es requerido');
    }
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
        }
        let authUser = null;
        try {
            authUser = await auth.getUser(userId);
        }
        catch (e) {
            // Usuario puede no existir en Auth
        }
        return Object.assign(Object.assign({ id: userDoc.id }, userDoc.data()), { email: (authUser === null || authUser === void 0 ? void 0 : authUser.email) || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.email), disabled: (authUser === null || authUser === void 0 ? void 0 : authUser.disabled) || false });
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al obtener usuario', error.message);
    }
});
/**
 * Actualizar usuario (Admin only)
 */
exports.updateUser = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { userId, updates } = data;
    if (!userId || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'userId y updates son requeridos');
    }
    try {
        await db.collection('users').doc(userId).update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        // Si se actualiza el estado disabled, actualizar Auth también
        if (updates.disabled !== undefined) {
            await auth.updateUser(userId, {
                disabled: updates.disabled,
            });
        }
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al actualizar usuario', error.message);
    }
});
/**
 * Cambiar estado de usuario (Admin only)
 */
exports.updateUserStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { userId, status } = data;
    if (!userId || !status) {
        throw new functions.https.HttpsError('invalid-argument', 'userId y status son requeridos');
    }
    try {
        await db.collection('users').doc(userId).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Actualizar Auth si es necesario
        if (status === 'suspended' || status === 'inactive') {
            await auth.updateUser(userId, { disabled: true });
        }
        else if (status === 'active') {
            await auth.updateUser(userId, { disabled: false });
        }
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al actualizar estado de usuario', error.message);
    }
});
//# sourceMappingURL=users.js.map