"use strict";
/**
 * Funciones para verificar y gestionar acceso Multi Dealer
 * El acceso es válido por 48 horas después de la aprobación
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
exports.checkMultiDealerAccess = checkMultiDealerAccess;
exports.canViewMultiDealerMembership = canViewMultiDealerMembership;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Verifica si un usuario tiene acceso activo a membresías Multi Dealer
 * El acceso es válido por 48 horas después de la aprobación
 */
async function checkMultiDealerAccess(userId) {
    try {
        // Buscar solicitud Multi Dealer aprobada
        const requestDoc = await getDb().collection('multi_dealer_requests').doc(userId).get();
        if (!requestDoc.exists) {
            return {
                hasAccess: false,
                isExpired: false,
            };
        }
        const request = requestDoc.data();
        // Verificar que esté aprobada
        if (request?.status !== 'approved') {
            return {
                hasAccess: false,
                isExpired: false,
            };
        }
        // Verificar fecha de expiración
        const approvedUntil = request?.approvedUntil?.toDate?.();
        if (!approvedUntil) {
            return {
                hasAccess: false,
                isExpired: true,
            };
        }
        const now = new Date();
        const hoursSinceApproval = (now.getTime() - approvedUntil.getTime()) / (1000 * 60 * 60);
        // Si ha pasado más de 48 horas, el acceso expiró
        if (hoursSinceApproval > 48) {
            // Actualizar estado a expirado
            await getDb().collection('multi_dealer_requests').doc(userId).update({
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Deshabilitar usuario
            const { getAuth } = await Promise.resolve().then(() => __importStar(require('@autodealers/shared')));
            const auth = getAuth();
            try {
                await auth.updateUser(userId, {
                    disabled: true,
                });
            }
            catch (error) {
                console.error('Error disabling user:', error);
            }
            // Actualizar usuario en Firestore
            await getDb().collection('users').doc(userId).update({
                multiDealerAccess: false,
                multiDealerAccessUntil: null,
                status: 'suspended',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return {
                hasAccess: false,
                approvedUntil,
                hoursRemaining: 0,
                isExpired: true,
            };
        }
        const hoursRemaining = 48 - hoursSinceApproval;
        return {
            hasAccess: true,
            approvedUntil,
            hoursRemaining: Math.max(0, hoursRemaining),
            isExpired: false,
        };
    }
    catch (error) {
        console.error('Error checking multi dealer access:', error);
        return {
            hasAccess: false,
            isExpired: false,
        };
    }
}
/**
 * Verifica si un usuario puede ver una membresía Multi Dealer específica
 */
async function canViewMultiDealerMembership(userId, membershipId) {
    const access = await checkMultiDealerAccess(userId);
    if (!access.hasAccess) {
        return false;
    }
    // Verificar que la membresía solicitada coincida con la aprobada
    const requestDoc = await getDb().collection('multi_dealer_requests').doc(userId).get();
    if (!requestDoc.exists) {
        return false;
    }
    const request = requestDoc.data();
    return request?.membershipId === membershipId;
}
