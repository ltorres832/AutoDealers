"use strict";
// Validación automática de membresías y features
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
exports.getTenantMembership = getTenantMembership;
exports.tenantHasFeature = tenantHasFeature;
exports.canPerformAction = canPerformAction;
exports.getTenantFeatures = getTenantFeatures;
const tenants_1 = require("./tenants");
const sub_users_1 = require("./sub-users");
/**
 * Obtiene la membresía activa de un tenant
 */
async function getTenantMembership(tenantId) {
    const tenant = await (0, tenants_1.getTenantById)(tenantId);
    if (!tenant || !tenant.membershipId) {
        return null;
    }
    // Import dinámico para evitar dependencia circular
    const { getMembershipById } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
    return await getMembershipById(tenant.membershipId);
}
/**
 * Verifica si un tenant tiene una feature específica
 */
async function tenantHasFeature(tenantId, feature) {
    const membership = await getTenantMembership(tenantId);
    if (!membership) {
        return false;
    }
    // Import dinámico para evitar dependencia circular
    const billingModule = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
    return billingModule.hasFeature(membership, feature);
}
/**
 * Verifica si un tenant puede realizar una acción según su membresía
 */
async function canPerformAction(tenantId, action) {
    const membership = await getTenantMembership(tenantId);
    if (action === 'addLead') {
        if (!membership) {
            return { allowed: true };
        }
        const billingModule = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
        const maxLeads = membership.features?.maxLeadsPerMonth;
        if (maxLeads == null) {
            return { allowed: true };
        }
        const { getLeads } = await Promise.resolve().then(() => __importStar(require('@autodealers/crm')));
        const leads = await getLeads(tenantId, { limit: 5000 });
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const countThisMonth = leads.filter((l) => l.createdAt >= start).length;
        const ok = billingModule.checkLimit(membership, 'maxLeadsPerMonth', countThisMonth);
        if (!ok) {
            return {
                allowed: false,
                reason: `Has alcanzado el máximo de leads nuevos este mes para tu plan (${maxLeads}).`,
            };
        }
        return { allowed: true };
    }
    if (!membership) {
        return { allowed: false, reason: 'No tiene membresía activa' };
    }
    // Import dinámico una sola vez al inicio para evitar dependencia circular
    const billingModule = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
    switch (action) {
        case 'createSeller':
            const sellers = await (0, sub_users_1.getSubUsers)(tenantId);
            const canCreate = billingModule.checkLimit(membership, 'maxSellers', sellers.length);
            if (!canCreate) {
                return {
                    allowed: false,
                    reason: `Límite de vendedores alcanzado (${membership.features.maxSellers})`,
                };
            }
            return { allowed: true };
        case 'addVehicle':
            // Importar dinámicamente para evitar dependencias circulares
            const { getVehicles } = await Promise.resolve().then(() => __importStar(require('@autodealers/inventory')));
            const vehicles = await getVehicles(tenantId);
            const canAdd = billingModule.checkLimit(membership, 'maxInventory', vehicles.length);
            if (!canAdd) {
                return {
                    allowed: false,
                    reason: `Límite de inventario alcanzado (${membership.features.maxInventory})`,
                };
            }
            return { allowed: true };
        case 'useSubdomain':
            if (!billingModule.hasFeature(membership, 'customSubdomain')) {
                return {
                    allowed: false,
                    reason: 'Su membresía no incluye subdominio personalizado',
                };
            }
            return { allowed: true };
        case 'useAI':
            if (!billingModule.hasFeature(membership, 'aiEnabled')) {
                return {
                    allowed: false,
                    reason: 'Su membresía no incluye funciones de IA',
                };
            }
            return { allowed: true };
        case 'useSocialMedia':
            if (!billingModule.hasFeature(membership, 'socialMediaEnabled')) {
                return {
                    allowed: false,
                    reason: 'Su membresía no incluye integración con redes sociales',
                };
            }
            return { allowed: true };
        case 'useMarketplace':
            if (!billingModule.hasFeature(membership, 'marketplaceEnabled')) {
                return {
                    allowed: false,
                    reason: 'Su membresía no incluye acceso al marketplace',
                };
            }
            return { allowed: true };
        case 'viewAdvancedReports':
            if (!billingModule.hasFeature(membership, 'advancedReports')) {
                return {
                    allowed: false,
                    reason: 'Su membresía no incluye reportes avanzados',
                };
            }
            return { allowed: true };
        default:
            return { allowed: false, reason: 'Acción no reconocida' };
    }
}
/**
 * Obtiene todas las features disponibles de un tenant
 */
async function getTenantFeatures(tenantId) {
    const membership = await getTenantMembership(tenantId);
    if (!membership) {
        return {
            customSubdomain: false,
            aiEnabled: false,
            socialMediaEnabled: false,
            marketplaceEnabled: false,
            advancedReports: false,
            maxSellers: 0,
            maxInventory: 0,
        };
    }
    // Import dinámico para evitar dependencia circular
    const billingModule = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
    return {
        customSubdomain: billingModule.hasFeature(membership, 'customSubdomain'),
        aiEnabled: billingModule.hasFeature(membership, 'aiEnabled'),
        socialMediaEnabled: billingModule.hasFeature(membership, 'socialMediaEnabled'),
        marketplaceEnabled: billingModule.hasFeature(membership, 'marketplaceEnabled'),
        advancedReports: billingModule.hasFeature(membership, 'advancedReports'),
        maxSellers: membership.features.maxSellers,
        maxInventory: membership.features.maxInventory,
    };
}
