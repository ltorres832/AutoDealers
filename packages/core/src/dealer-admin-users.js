"use strict";
// Gestión de usuarios administradores de dealers
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
exports.createDealerAdminUser = createDealerAdminUser;
exports.getDealerAdminUsers = getDealerAdminUsers;
exports.getDealerAdminUserById = getDealerAdminUserById;
exports.updateDealerAdminTenants = updateDealerAdminTenants;
exports.updateDealerAdminPermissions = updateDealerAdminPermissions;
exports.updateDealerAdminStatus = updateDealerAdminStatus;
exports.deleteDealerAdminUser = deleteDealerAdminUser;
exports.createMultiIdentityUser = createMultiIdentityUser;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
const auth = (0, shared_1.getAuth)();
const DEFAULT_DEALER_ADMIN_PERMISSIONS = {
    canManageInventory: true,
    canManageLeads: true,
    canManageSellers: true,
    canManageCampaigns: true,
    canManagePromotions: true,
    canManageSettings: true,
    canManageIntegrations: true,
    canViewReports: true,
    canManageUsers: false, // Por defecto no puede crear otros admin users
};
/**
 * Crea un nuevo usuario administrador de dealer(s)
 */
async function createDealerAdminUser(email, password, name, tenantIds, // Array de tenant IDs que puede administrar
dealerId, // ID del dealer que lo crea
permissions, createdBy) {
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
    // Establecer custom claims - puede tener acceso a múltiples tenants
    await auth.setCustomUserClaims(userRecord.uid, {
        role: 'dealer_admin',
        isDealerAdmin: true,
        tenantIds, // Array de tenant IDs
        dealerId,
        createdBy,
    });
    // Crear documento en Firestore
    const dealerAdminUser = {
        email,
        name,
        role: 'dealer_admin',
        tenantIds,
        dealerId,
        permissions: {
            ...DEFAULT_DEALER_ADMIN_PERMISSIONS,
            ...permissions,
        },
        createdBy,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await getDb().collection('dealer_admin_users').doc(userRecord.uid).set({
        ...dealerAdminUser,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // También crear en la colección de usuarios para compatibilidad
    await getDb().collection('users').doc(userRecord.uid).set({
        email,
        name,
        role: 'dealer',
        tenantId: tenantIds[0], // Primer tenant como principal
        dealerId,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: userRecord.uid,
        ...dealerAdminUser,
    };
}
/**
 * Obtiene todos los usuarios administradores de un dealer
 */
async function getDealerAdminUsers(dealerId) {
    let query = getDb().collection('dealer_admin_users');
    if (dealerId) {
        query = query.where('dealerId', '==', dealerId);
    }
    const snapshot = await query.get();
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
 * Obtiene un usuario administrador de dealer por ID
 */
async function getDealerAdminUserById(userId) {
    const doc = await getDb().collection('dealer_admin_users').doc(userId).get();
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
 * Actualiza los tenants que puede administrar un usuario
 */
async function updateDealerAdminTenants(userId, tenantIds) {
    await getDb().collection('dealer_admin_users').doc(userId).update({
        tenantIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Actualizar custom claims en Firebase Auth
    const user = await getDealerAdminUserById(userId);
    if (user) {
        await auth.setCustomUserClaims(userId, {
            role: 'dealer_admin',
            isDealerAdmin: true,
            tenantIds,
            dealerId: user.dealerId,
            createdBy: user.createdBy,
        });
    }
}
/**
 * Actualiza los permisos de un usuario administrador de dealer
 */
async function updateDealerAdminPermissions(userId, permissions) {
    const user = await getDealerAdminUserById(userId);
    if (!user) {
        throw new Error('Usuario administrador de dealer no encontrado');
    }
    await getDb().collection('dealer_admin_users').doc(userId).update({
        permissions: {
            ...user.permissions,
            ...permissions,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Cambia el estado de un usuario administrador de dealer
 */
async function updateDealerAdminStatus(userId, status) {
    await getDb().collection('dealer_admin_users').doc(userId).update({
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
 * Elimina un usuario administrador de dealer
 */
async function deleteDealerAdminUser(userId) {
    // Marcar como cancelado en lugar de eliminar
    await getDb().collection('dealer_admin_users').doc(userId).update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Deshabilitar en Firebase Auth
    await auth.updateUser(userId, { disabled: true });
}
/**
 * Crea un usuario que tiene identidades múltiples (vendedor + admin)
 * Si un vendedor también será admin del dealer, se crean credenciales separadas
 */
async function createMultiIdentityUser(email, passwordSeller, // Password para identidad de vendedor
passwordAdmin, // Password para identidad de admin (puede ser diferente)
name, sellerData, adminData, createdBy) {
    // Crear usuario como vendedor (primera identidad)
    const sellerUserRecord = await auth.createUser({
        email: `${email}+seller`, // Email modificado para vendedor
        password: passwordSeller,
        displayName: `${name} (Vendedor)`,
    });
    await auth.setCustomUserClaims(sellerUserRecord.uid, {
        role: 'seller',
        tenantId: sellerData.tenantId,
        dealerId: sellerData.dealerId,
        identityType: 'seller',
    });
    // Crear usuario como admin (segunda identidad)
    const adminUserRecord = await auth.createUser({
        email: `${email}+admin`, // Email modificado para admin
        password: passwordAdmin,
        displayName: `${name} (Admin)`,
    });
    await auth.setCustomUserClaims(adminUserRecord.uid, {
        role: 'dealer_admin',
        isDealerAdmin: true,
        tenantIds: adminData.tenantIds,
        dealerId: adminData.dealerId,
        identityType: 'admin',
    });
    // Guardar relación entre identidades
    await getDb().collection('multi_identity_users').add({
        primaryEmail: email,
        sellerUserId: sellerUserRecord.uid,
        adminUserId: adminUserRecord.uid,
        name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Crear documentos para cada identidad
    await getDb().collection('users').doc(sellerUserRecord.uid).set({
        email: `${email}+seller`,
        name: `${name} (Vendedor)`,
        role: 'seller',
        tenantId: sellerData.tenantId,
        dealerId: sellerData.dealerId,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await getDb().collection('dealer_admin_users').doc(adminUserRecord.uid).set({
        email: `${email}+admin`,
        name: `${name} (Admin)`,
        role: 'dealer_admin',
        tenantIds: adminData.tenantIds,
        dealerId: adminData.dealerId,
        permissions: {
            ...DEFAULT_DEALER_ADMIN_PERMISSIONS,
            ...adminData.permissions,
        },
        createdBy,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        sellerUserId: sellerUserRecord.uid,
        adminUserId: adminUserRecord.uid,
    };
}
