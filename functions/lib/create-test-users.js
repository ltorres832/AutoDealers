"use strict";
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
exports.createTestUsers = void 0;
// Cloud Function para crear usuarios de prueba
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.createTestUsers = functions.https.onCall(async (data, context) => {
    var _a;
    // Solo admin puede ejecutar esto
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden crear usuarios de prueba');
    }
    const db = admin.firestore();
    const auth = admin.auth();
    const users = [
        // Admin User
        {
            email: 'admin@autodealers.test',
            password: 'Admin123!',
            role: 'admin',
            name: 'Admin Usuario',
            tenantId: null,
            membershipId: 'admin-membership',
            membershipType: 'dealer',
            status: 'active',
        },
        // Dealer User
        {
            email: 'dealer@autodealers.test',
            password: 'Dealer123!',
            role: 'dealer',
            name: 'Dealer Usuario',
            tenantId: 'test-tenant-1',
            membershipId: 'dealer-membership',
            membershipType: 'dealer',
            status: 'active',
        },
        // Seller User
        {
            email: 'seller@autodealers.test',
            password: 'Seller123!',
            role: 'seller',
            name: 'Seller Usuario',
            tenantId: 'test-tenant-1',
            membershipId: 'seller-membership',
            membershipType: 'seller',
            status: 'active',
        },
        // Advertiser User
        {
            email: 'advertiser@autodealers.test',
            password: 'Advertiser123!',
            role: 'advertiser',
            name: 'Advertiser Usuario',
            tenantId: null,
            membershipId: 'advertiser-membership',
            membershipType: 'dealer',
            status: 'active',
        },
    ];
    const results = [];
    for (const userData of users) {
        try {
            // Verificar si el usuario ya existe
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(userData.email);
            }
            catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // Crear usuario en Firebase Auth
                    userRecord = await auth.createUser({
                        email: userData.email,
                        password: userData.password,
                        displayName: userData.name,
                    });
                }
                else {
                    throw error;
                }
            }
            // Crear o actualizar documento en Firestore
            await db.collection('users').doc(userRecord.uid).set({
                id: userRecord.uid,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                tenantId: userData.tenantId,
                membershipId: userData.membershipId,
                membershipType: userData.membershipType,
                status: userData.status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            results.push({
                email: userData.email,
                role: userData.role,
                status: 'created',
                uid: userRecord.uid,
            });
        }
        catch (error) {
            results.push({
                email: userData.email,
                role: userData.role,
                status: 'error',
                error: error.message,
            });
        }
    }
    return {
        success: true,
        users: results,
        message: 'Usuarios de prueba creados',
    };
});
//# sourceMappingURL=create-test-users.js.map