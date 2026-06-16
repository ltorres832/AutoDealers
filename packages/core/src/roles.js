"use strict";
// Definición de roles y permisos
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.ROLES = void 0;
exports.ROLES = {
    admin: 'Administrador',
    master_dealer: 'Master Dealer',
    dealer: 'Dealer',
    seller: 'Vendedor',
    advertiser: 'Advertiser',
    manager: 'Gerente',
    dealer_admin: 'Administrador del Dealer',
};
exports.PERMISSIONS = {
    admin: {
        canManageUsers: true,
        canManageInventory: true,
        canManageLeads: true,
        canManageSellers: true,
        canAccessAdmin: true,
        canManageIntegrations: true,
        canManageMemberships: true,
        canManageDealers: true,
        canApproveDealers: true,
    },
    master_dealer: {
        canManageUsers: false,
        canManageInventory: true,
        canManageLeads: true,
        canManageSellers: true,
        canAccessAdmin: false,
        canManageIntegrations: true,
        canManageMemberships: false,
        canManageDealers: true, // Puede gestionar múltiples dealers
        canApproveDealers: false,
    },
    dealer: {
        canManageUsers: false,
        canManageInventory: true,
        canManageLeads: true,
        canManageSellers: true,
        canAccessAdmin: false,
        canManageIntegrations: true,
        canManageMemberships: false,
    },
    seller: {
        canManageUsers: false,
        canManageInventory: false,
        canManageLeads: true,
        canManageSellers: false,
        canAccessAdmin: false,
        canManageIntegrations: false,
        canManageMemberships: false,
    },
    advertiser: {
        canManageUsers: false,
        canManageInventory: false,
        canManageLeads: false,
        canManageSellers: false,
        canAccessAdmin: false,
        canManageIntegrations: false,
        canManageMemberships: false,
    },
    manager: {
        canManageUsers: false,
        canManageInventory: true,
        canManageLeads: true,
        canManageSellers: true,
        canAccessAdmin: false,
        canManageIntegrations: true,
        canManageMemberships: false,
    },
    dealer_admin: {
        canManageUsers: true,
        canManageInventory: true,
        canManageLeads: true,
        canManageSellers: true,
        canAccessAdmin: false,
        canManageIntegrations: true,
        canManageMemberships: false,
    },
};
