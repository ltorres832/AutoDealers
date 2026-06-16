"use strict";
// Sistema de permisos
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
const roles_1 = require("./roles");
/**
 * Verifica si un rol tiene un permiso específico
 */
function hasPermission(role, permission) {
    return roles_1.PERMISSIONS[role][permission] ?? false;
}
