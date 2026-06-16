"use strict";
/**
 * Gestión de Usuarios Admin
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
exports.createAdminUser = createAdminUser;
exports.getAdminUser = getAdminUser;
exports.getAllAdminUsers = getAllAdminUsers;
exports.updateAdminUser = updateAdminUser;
exports.deleteAdminUser = deleteAdminUser;
exports.updateLastLogin = updateLastLogin;
const shared_1 = require("@autodealers/shared");
const admin_permissions_1 = require("./admin-permissions");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea un nuevo usuario admin
 */
async function createAdminUser(data, createdBy) {
    const auth = (0, shared_1.getAuth)();
    const db = (0, shared_1.getFirestore)();
    try {
        // 1. Crear usuario en Firebase Auth
        const userRecord = await auth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        });
        // 2. Obtener permisos del rol + permisos custom
        const rolePermissions = admin_permissions_1.ADMIN_ROLES[data.role].permissions;
        const permissions = data.customPermissions
            ? [...new Set([...rolePermissions, ...data.customPermissions])]
            : rolePermissions;
        // 3. Crear documento en Firestore
        const adminUserData = {
            email: data.email,
            name: data.name,
            role: data.role,
            permissions,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy,
        };
        await getDb().collection('admin_users').doc(userRecord.uid).set(adminUserData);
        // 4. Agregar claims personalizados
        await auth.setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            adminRole: data.role,
            permissions,
        });
        return {
            id: userRecord.uid,
            ...data,
            permissions,
            isActive: true,
            createdAt: new Date(),
            createdBy,
        };
    }
    catch (error) {
        console.error('Error creating admin user:', error);
        throw new Error(`Error al crear usuario admin: ${error.message}`);
    }
}
/**
 * Obtiene un usuario admin por ID
 */
async function getAdminUser(userId) {
    const db = (0, shared_1.getFirestore)();
    try {
        const doc = await getDb().collection('admin_users').doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        return {
            id: doc.id,
            email: data?.email || '',
            name: data?.name || '',
            role: data?.role || 'viewer',
            permissions: data?.permissions || [],
            isActive: data?.isActive !== false,
            createdAt: data?.createdAt?.toDate() || new Date(),
            createdBy: data?.createdBy || '',
            lastLogin: data?.lastLogin?.toDate(),
        };
    }
    catch (error) {
        console.error('Error getting admin user:', error);
        return null;
    }
}
/**
 * Obtiene todos los usuarios admin
 */
async function getAllAdminUsers() {
    const db = (0, shared_1.getFirestore)();
    try {
        const snapshot = await getDb().collection('admin_users')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email || '',
                name: data.name || '',
                role: data.role || 'viewer',
                permissions: data.permissions || [],
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate() || new Date(),
                createdBy: data.createdBy || '',
                lastLogin: data.lastLogin?.toDate(),
            };
        });
    }
    catch (error) {
        console.error('Error getting admin users:', error);
        return [];
    }
}
/**
 * Actualiza un usuario admin
 */
async function updateAdminUser(userId, updates) {
    const auth = (0, shared_1.getAuth)();
    const db = (0, shared_1.getFirestore)();
    try {
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (updates.name) {
            updateData.name = updates.name;
            await auth.updateUser(userId, { displayName: updates.name });
        }
        if (updates.role) {
            updateData.role = updates.role;
            // Actualizar permisos basados en el rol
            const rolePermissions = admin_permissions_1.ADMIN_ROLES[updates.role].permissions;
            const permissions = updates.customPermissions
                ? [...new Set([...rolePermissions, ...updates.customPermissions])]
                : rolePermissions;
            updateData.permissions = permissions;
            // Actualizar claims
            await auth.setCustomUserClaims(userId, {
                role: 'admin',
                adminRole: updates.role,
                permissions,
            });
        }
        else if (updates.customPermissions) {
            // Solo actualizar permisos custom
            const currentUser = await getAdminUser(userId);
            if (currentUser) {
                const rolePermissions = admin_permissions_1.ADMIN_ROLES[currentUser.role].permissions;
                const permissions = [...new Set([...rolePermissions, ...updates.customPermissions])];
                updateData.permissions = permissions;
                await auth.setCustomUserClaims(userId, {
                    role: 'admin',
                    adminRole: currentUser.role,
                    permissions,
                });
            }
        }
        if (updates.isActive !== undefined) {
            updateData.isActive = updates.isActive;
            // Deshabilitar/habilitar usuario en Auth
            await auth.updateUser(userId, { disabled: !updates.isActive });
        }
        await getDb().collection('admin_users').doc(userId).update(updateData);
    }
    catch (error) {
        console.error('Error updating admin user:', error);
        throw new Error(`Error al actualizar usuario admin: ${error.message}`);
    }
}
/**
 * Elimina un usuario admin
 */
async function deleteAdminUser(userId) {
    const auth = (0, shared_1.getAuth)();
    const db = (0, shared_1.getFirestore)();
    try {
        // 1. Eliminar de Firebase Auth
        await auth.deleteUser(userId);
        // 2. Eliminar de Firestore
        await getDb().collection('admin_users').doc(userId).delete();
    }
    catch (error) {
        console.error('Error deleting admin user:', error);
        throw new Error(`Error al eliminar usuario admin: ${error.message}`);
    }
}
/**
 * Actualiza la última fecha de login
 */
async function updateLastLogin(userId) {
    const db = (0, shared_1.getFirestore)();
    try {
        await getDb().collection('admin_users').doc(userId).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        console.error('Error updating last login:', error);
    }
}
