"use strict";
// Suspensión automática de emails corporativos cuando expira la membresía
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
exports.suspendTenantCorporateEmails = suspendTenantCorporateEmails;
exports.reactivateTenantCorporateEmails = reactivateTenantCorporateEmails;
exports.checkAndSuspendEmailsOnSubscriptionChange = checkAndSuspendEmailsOnSubscriptionChange;
const core_1 = require("@autodealers/core");
const crm_1 = require("@autodealers/crm");
const db = (0, core_1.getFirestore)();
/**
 * Suspende todos los emails corporativos de un tenant cuando expira su membresía
 */
async function suspendTenantCorporateEmails(tenantId) {
    try {
        const emails = await (0, crm_1.getCorporateEmails)(undefined, tenantId);
        const activeEmails = emails.filter((e) => e.status === 'active');
        for (const email of activeEmails) {
            try {
                await (0, crm_1.suspendCorporateEmail)(email.id, tenantId);
                console.log(`✅ Email corporativo suspendido: ${email.email}`);
            }
            catch (error) {
                console.error(`❌ Error al suspender email ${email.email}:`, error);
                // Continuar con los demás emails aunque falle uno
            }
        }
    }
    catch (error) {
        console.error(`Error suspending corporate emails for tenant ${tenantId}:`, error);
        throw error;
    }
}
/**
 * Reactiva los emails corporativos de un tenant cuando se renueva la membresía
 */
async function reactivateTenantCorporateEmails(tenantId) {
    try {
        const emails = await (0, crm_1.getCorporateEmails)(undefined, tenantId);
        const suspendedEmails = emails.filter((e) => e.status === 'suspended');
        // Importar aquí para evitar dependencia circular
        const { activateCorporateEmail } = await Promise.resolve().then(() => __importStar(require('@autodealers/crm')));
        for (const email of suspendedEmails) {
            try {
                await activateCorporateEmail(email.id, tenantId);
                console.log(`✅ Email corporativo reactivado: ${email.email}`);
            }
            catch (error) {
                console.error(`❌ Error al reactivar email ${email.email}:`, error);
                // Continuar con los demás emails aunque falle uno
            }
        }
    }
    catch (error) {
        console.error(`Error reactivating corporate emails for tenant ${tenantId}:`, error);
        throw error;
    }
}
/**
 * Verifica y suspende emails corporativos cuando expira una suscripción
 * Esta función debe llamarse cuando el estado de la suscripción cambia a 'suspended' o 'expired'
 */
async function checkAndSuspendEmailsOnSubscriptionChange(subscriptionId, newStatus) {
    try {
        const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
        if (!subscriptionDoc.exists) {
            console.warn(`Subscription ${subscriptionId} not found`);
            return;
        }
        const subscription = subscriptionDoc.data();
        const tenantId = subscription?.tenantId;
        if (!tenantId) {
            console.warn(`No tenantId found for subscription ${subscriptionId}`);
            return;
        }
        // Si la suscripción está suspendida, expirada o cancelada, suspender emails
        if (newStatus === 'suspended' || newStatus === 'past_due' || newStatus === 'cancelled') {
            await suspendTenantCorporateEmails(tenantId);
            console.log(`✅ Emails corporativos suspendidos para tenant ${tenantId} (suscripción: ${newStatus})`);
        }
        // Si la suscripción se reactiva, reactivar emails
        else if (newStatus === 'active') {
            await reactivateTenantCorporateEmails(tenantId);
            console.log(`✅ Emails corporativos reactivados para tenant ${tenantId} (suscripción: ${newStatus})`);
        }
    }
    catch (error) {
        console.error(`Error checking email suspension for subscription ${subscriptionId}:`, error);
        // No lanzar error para no interrumpir el flujo principal
    }
}
//# sourceMappingURL=email-suspension.js.map