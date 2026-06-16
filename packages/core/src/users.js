"use strict";
// Gestión de usuarios
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
exports.createUser = createUser;
exports.getUserById = getUserById;
exports.getUsersByTenant = getUsersByTenant;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const referrals_1 = require("./referrals");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
function getAuthInstance() {
    return (0, shared_1.getAuth)();
}
/**
 * Crea un nuevo usuario
 */
async function createUser(email, password, name, role, tenantId, dealerId, membershipId) {
    // Crear usuario en Firebase Auth
    const userRecord = await getAuthInstance().createUser({
        email,
        password,
        displayName: name,
    });
    // Establecer custom claims después de crear el usuario
    await getAuthInstance().setCustomUserClaims(userRecord.uid, {
        role,
        tenantId,
        dealerId,
    });
    // Crear documento en Firestore - Limpiar undefined
    const userData = {
        email,
        name,
        role,
        membershipId: membershipId || '',
        membershipType: role === 'dealer' ? 'dealer' : 'seller',
        status: 'active',
        settings: {},
    };
    // Solo agregar campos opcionales si tienen valor
    if (tenantId) {
        userData.tenantId = tenantId;
    }
    if (dealerId) {
        userData.dealerId = dealerId;
    }
    // Generar código de referido único automáticamente (solo para dealers y sellers)
    let referralCode = null;
    if (role === 'dealer' || role === 'seller') {
        try {
            referralCode = await (0, referrals_1.generateReferralCode)(userRecord.uid);
            userData.referralCode = referralCode;
        }
        catch (error) {
            console.error('Error generando código de referido:', error);
            // Continuar sin código de referido si hay error
        }
    }
    const db = getDb();
    await getDb().collection('users').doc(userRecord.uid).set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: userRecord.uid,
        ...userData,
        referralCode: referralCode || undefined,
    };
}
/**
 * Obtiene un usuario por ID
 */
async function getUserById(userId) {
    const db = getDb();
    const userDoc = await getDb().collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    const data = userDoc.data();
    return {
        id: userDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
        lastLogin: data?.lastLogin?.toDate(),
    };
}
/**
 * Obtiene usuarios por tenant
 */
async function getUsersByTenant(tenantId) {
    const db = getDb();
    const snapshot = await getDb().collection('users')
        .where('tenantId', '==', tenantId)
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate(),
    }));
}
/**
 * Actualiza un usuario
 */
async function updateUser(userId, updates) {
    const db = getDb();
    await getDb().collection('users').doc(userId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Elimina un usuario (soft delete)
 */
async function deleteUser(userId) {
    await updateUser(userId, { status: 'cancelled' });
    const auth = getAuthInstance();
    await auth.updateUser(userId, { disabled: true });
}
