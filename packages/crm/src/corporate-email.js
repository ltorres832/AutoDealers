"use strict";
// Gestión de Emails Corporativos
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorporateEmail = createCorporateEmail;
exports.getCorporateEmails = getCorporateEmails;
exports.suspendCorporateEmail = suspendCorporateEmail;
exports.activateCorporateEmail = activateCorporateEmail;
exports.deleteCorporateEmail = deleteCorporateEmail;
exports.updateEmailSignature = updateEmailSignature;
exports.resetEmailPassword = resetEmailPassword;
exports.getCorporateEmailUsage = getCorporateEmailUsage;
const messaging_1 = require("@autodealers/messaging");
const core_1 = require("@autodealers/core");
const billing_1 = require("@autodealers/billing");
const core_2 = require("@autodealers/core");
const core_3 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = __importDefault(require("crypto"));
const db = (0, core_1.getFirestore)();
// Dominio base para emails corporativos
const CORPORATE_EMAIL_DOMAIN = process.env.CORPORATE_EMAIL_DOMAIN || 'autoplataforma.com';
/**
 * Genera una contraseña temporal segura
 */
function generateTemporaryPassword() {
    return crypto_1.default.randomBytes(16).toString('base64').slice(0, 16) + 'A1!';
}
/**
 * Obtiene el dominio de email corporativo para un tenant
 */
async function getTenantEmailDomain(tenantSubdomain) {
    // Obtener dominio desde credenciales de Zoho Mail
    const { getZohoMailCredentials } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
    const credentials = await getZohoMailCredentials();
    const baseDomain = credentials.domain || CORPORATE_EMAIL_DOMAIN;
    if (tenantSubdomain) {
        return `${tenantSubdomain}.${baseDomain}`;
    }
    return baseDomain;
}
/**
 * Obtiene el servicio Zoho Mail configurado
 */
async function getZohoMailService() {
    // Intentar obtener credenciales desde Firestore primero
    const { getZohoMailCredentials } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
    const credentials = await getZohoMailCredentials();
    const clientId = credentials.clientId;
    const clientSecret = credentials.clientSecret;
    const refreshToken = credentials.refreshToken;
    const organizationId = credentials.organizationId;
    const domain = credentials.domain || 'autoplataforma.com';
    if (!clientId || !clientSecret || !refreshToken || !organizationId) {
        console.warn('Zoho Mail credentials not configured');
        return null;
    }
    return new messaging_1.ZohoMailService(clientId, clientSecret, refreshToken, domain, organizationId);
}
/**
 * Verifica si el usuario puede crear un email corporativo según su membresía
 */
async function canCreateCorporateEmail(userId, tenantId) {
    try {
        const user = await (0, core_2.getUserById)(userId);
        if (!user) {
            return { allowed: false, reason: 'Usuario no encontrado' };
        }
        const membership = await (0, billing_1.getMembershipById)(user.membershipId);
        if (!membership) {
            return { allowed: false, reason: 'Membresía no encontrada' };
        }
        // Verificar si el plan incluye email corporativo
        if (!membership.features.corporateEmailEnabled) {
            return { allowed: false, reason: 'Tu plan no incluye email corporativo' };
        }
        // Obtener límite según membresía
        const limit = membership.features.maxCorporateEmails || 0;
        // Si el límite es 0 o undefined, no permite emails
        if (limit === 0) {
            return { allowed: false, reason: 'Tu plan no incluye email corporativo' };
        }
        // Si el límite es null, es ilimitado (solo Enterprise)
        if (limit === null || limit === undefined) {
            return { allowed: true, limit: undefined, used: 0 };
        }
        // Contar emails usados por el usuario
        if (user.role === 'seller') {
            // Para sellers, solo cuentan sus propios emails
            const userEmailsSnapshot = await db
                .collection('tenants')
                .doc(tenantId || user.tenantId || '')
                .collection('corporate_emails')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .get();
            const used = userEmailsSnapshot.size;
            const allowed = used < limit;
            return {
                allowed,
                limit,
                used,
                reason: allowed ? undefined : `Has alcanzado el límite de ${limit} email(s) corporativo(s)`,
            };
        }
        else if (user.role === 'dealer' && tenantId) {
            // Para dealers, cuentan todos los emails del tenant
            const tenantEmailsSnapshot = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('corporate_emails')
                .where('status', '==', 'active')
                .get();
            const used = tenantEmailsSnapshot.size;
            const allowed = used < limit;
            return {
                allowed,
                limit,
                used,
                reason: allowed ? undefined : `Has alcanzado el límite de ${limit} email(s) corporativo(s)`,
            };
        }
        return { allowed: false, reason: 'No se pudo verificar el límite' };
    }
    catch (error) {
        console.error('Error checking email limit:', error);
        return { allowed: false, reason: 'Error al verificar límite de emails' };
    }
}
/**
 * Crea un nuevo email corporativo
 */
async function createCorporateEmail(userId, tenantId, emailAlias, // Parte antes del @ (ej: "juan" para "juan@autocity.autoplataforma.com")
createdBy, dealerId) {
    try {
        // Verificar permisos
        const canCreate = await canCreateCorporateEmail(userId, tenantId);
        if (!canCreate.allowed) {
            throw new Error(canCreate.reason || 'No puedes crear este email corporativo');
        }
        // Obtener información del usuario y tenant
        const user = await (0, core_2.getUserById)(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        const tenant = await (0, core_3.getTenantById)(tenantId);
        if (!tenant) {
            throw new Error('Tenant no encontrado');
        }
        // Generar email completo
        const tenantDomain = await getTenantEmailDomain(tenant.subdomain);
        const fullEmail = `${emailAlias}@${tenantDomain}`;
        // Verificar que el email no exista
        const existingEmailSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .where('email', '==', fullEmail)
            .where('status', '!=', 'deleted')
            .get();
        if (!existingEmailSnapshot.empty) {
            throw new Error('Este email ya existe');
        }
        // Generar contraseña temporal
        const tempPassword = generateTemporaryPassword();
        // Crear email en Zoho Mail
        const zohoService = await getZohoMailService();
        let zohoEmailId;
        let zohoSuccess = false;
        if (zohoService) {
            const nameParts = user.name.split(' ');
            const firstName = nameParts[0] || user.name;
            const lastName = nameParts.slice(1).join(' ') || '';
            const zohoAccount = {
                emailId: '',
                email: fullEmail,
                firstName,
                lastName,
                displayName: user.name,
                password: tempPassword,
                role: 'USER',
            };
            const zohoResult = await zohoService.createEmailAccount(zohoAccount);
            if (zohoResult.success && zohoResult.data) {
                zohoEmailId = zohoResult.data.zohoEmailId || zohoResult.data.emailId;
                zohoSuccess = true;
            }
            else {
                console.error('Error creating email in Zoho:', zohoResult.error);
                // Continuar creando el registro aunque falle en Zoho (para que el usuario pueda intentar después)
            }
        }
        // Crear registro en Firestore
        const emailRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc();
        const emailData = {
            userId,
            tenantId,
            dealerId,
            email: fullEmail,
            emailAlias,
            status: zohoSuccess ? 'active' : 'suspended',
            zohoEmailId,
            zohoPassword: tempPassword, // En producción, encriptar esto
            passwordChanged: false,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await emailRef.set({
            ...emailData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Actualizar usuario con email corporativo
        if (user.role === 'seller') {
            await db.collection('users').doc(userId).update({
                corporateEmail: fullEmail,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Actualizar contador de emails usados en tenant (para dealers)
        if (user.role === 'dealer') {
            const tenantEmailsSnapshot = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('corporate_emails')
                .where('status', '==', 'active')
                .get();
            await db.collection('tenants').doc(tenantId).update({
                corporateEmailsUsed: tenantEmailsSnapshot.size + 1,
                corporateEmailDomain: tenantDomain,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return {
            id: emailRef.id,
            ...emailData,
        };
    }
    catch (error) {
        throw new Error(`Error creating corporate email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Obtiene los emails corporativos de un usuario o tenant
 */
async function getCorporateEmails(userId, tenantId) {
    try {
        let query;
        if (tenantId) {
            query = db
                .collection('tenants')
                .doc(tenantId)
                .collection('corporate_emails')
                .where('status', '!=', 'deleted')
                .orderBy('createdAt', 'desc');
        }
        else if (userId) {
            // Buscar en todos los tenants del usuario
            const user = await (0, core_2.getUserById)(userId);
            if (!user || !user.tenantId) {
                return [];
            }
            query = db
                .collection('tenants')
                .doc(user.tenantId)
                .collection('corporate_emails')
                .where('userId', '==', userId)
                .where('status', '!=', 'deleted')
                .orderBy('createdAt', 'desc');
        }
        else {
            return [];
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                suspendedAt: data.suspendedAt?.toDate(),
                reactivatedAt: data.reactivatedAt?.toDate(),
                expiresAt: data.expiresAt?.toDate(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            };
        });
    }
    catch (error) {
        console.error('Error getting corporate emails:', error);
        return [];
    }
}
/**
 * Suspende un email corporativo
 */
async function suspendCorporateEmail(emailId, tenantId) {
    try {
        const emailRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc(emailId);
        const emailDoc = await emailRef.get();
        if (!emailDoc.exists) {
            throw new Error('Email no encontrado');
        }
        const emailData = emailDoc.data();
        if (!emailData.zohoEmailId) {
            throw new Error('Email no tiene ID de Zoho');
        }
        // Suspender en Zoho
        const zohoService = await getZohoMailService();
        if (zohoService) {
            await zohoService.suspendEmailAccount(emailData.zohoEmailId);
        }
        // Actualizar en Firestore
        await emailRef.update({
            status: 'suspended',
            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        throw new Error(`Error suspending corporate email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Reactiva un email corporativo
 */
async function activateCorporateEmail(emailId, tenantId) {
    try {
        const emailRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc(emailId);
        const emailDoc = await emailRef.get();
        if (!emailDoc.exists) {
            throw new Error('Email no encontrado');
        }
        const emailData = emailDoc.data();
        if (!emailData.zohoEmailId) {
            throw new Error('Email no tiene ID de Zoho');
        }
        // Activar en Zoho
        const zohoService = await getZohoMailService();
        if (zohoService) {
            await zohoService.activateEmailAccount(emailData.zohoEmailId);
        }
        // Actualizar en Firestore
        await emailRef.update({
            status: 'active',
            reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            suspendedAt: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        throw new Error(`Error activating corporate email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Elimina un email corporativo
 */
async function deleteCorporateEmail(emailId, tenantId) {
    try {
        const emailRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc(emailId);
        const emailDoc = await emailRef.get();
        if (!emailDoc.exists) {
            throw new Error('Email no encontrado');
        }
        const emailData = emailDoc.data();
        if (emailData.zohoEmailId) {
            // Eliminar en Zoho
            const zohoService = await getZohoMailService();
            if (zohoService) {
                await zohoService.deleteEmailAccount(emailData.zohoEmailId);
            }
        }
        // Marcar como eliminado en Firestore (soft delete)
        await emailRef.update({
            status: 'deleted',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Remover email del usuario si era su email principal
        if (emailData.userId) {
            const userRef = db.collection('users').doc(emailData.userId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData?.corporateEmail === emailData.email) {
                    await userRef.update({
                        corporateEmail: admin.firestore.FieldValue.delete(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
        }
    }
    catch (error) {
        throw new Error(`Error deleting corporate email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Actualiza la firma de email
 */
async function updateEmailSignature(emailId, tenantId, signature, signatureType) {
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc(emailId)
            .update({
            emailSignature: signature,
            emailSignatureType: signatureType,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Actualizar también en el usuario si es su email principal
        const emailDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc(emailId)
            .get();
        if (emailDoc.exists) {
            const emailData = emailDoc.data();
            if (emailData.userId) {
                await db.collection('users').doc(emailData.userId).update({
                    emailSignature: signature,
                    emailSignatureType: signatureType,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    }
    catch (error) {
        throw new Error(`Error updating email signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Cambia la contraseña del email
 */
async function resetEmailPassword(emailId, tenantId, newPassword) {
    try {
        const emailRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .doc(emailId);
        const emailDoc = await emailRef.get();
        if (!emailDoc.exists) {
            throw new Error('Email no encontrado');
        }
        const emailData = emailDoc.data();
        if (!emailData.zohoEmailId) {
            throw new Error('Email no tiene ID de Zoho');
        }
        // Cambiar contraseña en Zoho
        const zohoService = await getZohoMailService();
        if (zohoService) {
            const result = await zohoService.resetPassword(emailData.zohoEmailId, newPassword);
            if (!result.success) {
                throw new Error(result.error?.message || 'Error al cambiar contraseña en Zoho');
            }
        }
        // Actualizar en Firestore
        await emailRef.update({
            zohoPassword: newPassword, // En producción, encriptar esto
            passwordChanged: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        throw new Error(`Error resetting email password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Obtiene el uso de emails corporativos para un tenant
 */
async function getCorporateEmailUsage(tenantId) {
    try {
        const tenant = await (0, core_3.getTenantById)(tenantId);
        if (!tenant) {
            throw new Error('Tenant no encontrado');
        }
        // Obtener membresía del tenant
        let limit = 0;
        if (tenant.membershipId) {
            const membership = await (0, billing_1.getMembershipById)(tenant.membershipId);
            if (membership) {
                limit = membership.features.maxCorporateEmails ?? null;
            }
        }
        // Contar emails activos
        const activeEmailsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('corporate_emails')
            .where('status', '==', 'active')
            .get();
        const used = activeEmailsSnapshot.size;
        return {
            tenantId,
            emailsUsed: used,
            emailsLimit: limit ?? 0,
        };
    }
    catch (error) {
        console.error('Error getting email usage:', error);
        return {
            tenantId,
            emailsUsed: 0,
            emailsLimit: 0,
        };
    }
}
//# sourceMappingURL=corporate-email.js.map