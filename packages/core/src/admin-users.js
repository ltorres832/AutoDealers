"use strict";
// Gestión de usuarios administradores del sistema
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
exports.createAdminUser = createAdminUser;
exports.getAdminUsers = getAdminUsers;
exports.getAdminUserById = getAdminUserById;
exports.updateAdminUser = updateAdminUser;
exports.updateAdminUserPermissions = updateAdminUserPermissions;
exports.updateAdminUserStatus = updateAdminUserStatus;
exports.deleteAdminUser = deleteAdminUser;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
const auth = (0, shared_1.getAuth)();
const DEFAULT_ADMIN_PERMISSIONS = {
    canManageUsers: true,
    canManageTenants: true,
    canManageMemberships: true,
    canManageSettings: true,
    canManageIntegrations: true,
    canViewReports: true,
    canManageLogs: true,
    canManageBranding: true,
};
/**
 * Crea un nuevo usuario administrador del sistema
 */
async function createAdminUser(email, password, name, permissions, createdBy) {
    // Verificar que el email no esté en uso
    try {
        await auth.getUserByEmail(email);
        throw new Error('El email ya está en uso');
    }
    catch (error) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }
    }
    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
    });
    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
        role: 'admin',
        isAdminUser: true,
        createdBy,
    });
    // Crear documento en Firestore
    const adminUser = {
        email,
        name,
        role: 'admin',
        permissions: [],
        createdBy,
        isActive: true,
        createdAt: new Date(),
    };
    await db.collection('admin_users').doc(userRecord.uid).set({
        ...adminUser,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // También crear en la colección de usuarios para compatibilidad
    await db.collection('users').doc(userRecord.uid).set({
        email,
        name,
        role: 'admin',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: userRecord.uid,
        ...adminUser,
    };
}
/**
 * Obtiene todos los usuarios administradores
 */
async function getAdminUsers() {
    const snapshot = await db.collection('admin_users').get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
            lastLogin: data?.lastLogin?.toDate(),
        };
    });
}
/**
 * Obtiene un usuario administrador por ID
 */
async function getAdminUserById(userId) {
    const doc = await db.collection('admin_users').doc(userId).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
        lastLogin: data?.lastLogin?.toDate(),
    };
}
/**
 * Actualiza un usuario administrador
 */
async function updateAdminUser(userId, updates) {
    await db.collection('admin_users').doc(userId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Actualiza los permisos de un usuario administrador
 */
async function updateAdminUserPermissions(userId, permissions) {
    const user = await getAdminUserById(userId);
    if (!user) {
        throw new Error('Usuario administrador no encontrado');
    }
    await db.collection('admin_users').doc(userId).update({
        permissions: {
            ...user.permissions,
            ...permissions,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Cambia el estado de un usuario administrador
 */
async function updateAdminUserStatus(userId, status) {
    await db.collection('admin_users').doc(userId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // También actualizar en Firebase Auth si está suspendido
    if (status === 'suspended') {
        await auth.updateUser(userId, { disabled: true });
    }
    else if (status === 'active') {
        await auth.updateUser(userId, { disabled: false });
    }
}
/**
 * Elimina un usuario administrador
 */
async function deleteAdminUser(userId) {
    // Marcar como cancelado en lugar de eliminar
    await db.collection('admin_users').doc(userId).update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Deshabilitar en Firebase Auth
    await auth.updateUser(userId, { disabled: true });
}
