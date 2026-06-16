"use strict";
// Middleware para validar features antes de ejecutar acciones
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeature = validateFeature;
exports.withFeatureValidation = withFeatureValidation;
const server_1 = require("next/server");
const feature_executor_1 = require("./feature-executor");
/**
 * Middleware para validar features en rutas API
 *
 * @param request - Request de Next.js
 * @param action - Acción a validar
 * @param getAuth - Función que obtiene la autenticación (debe ser proporcionada por la app)
 */
async function validateFeature(request, action, getAuth) {
    try {
        const auth = await getAuth(request);
        if (!auth || !auth.tenantId) {
            return server_1.NextResponse.json({ error: 'Unauthorized', reason: 'No autenticado o sin tenantId' }, { status: 401 });
        }
        const check = await (0, feature_executor_1.canExecuteFeature)(auth.tenantId, action);
        if (!check.allowed) {
            // Registrar intento fallido
            await (0, feature_executor_1.recordFeatureUsage)(auth.tenantId, action, {
                success: false,
                reason: check.reason,
            });
            return server_1.NextResponse.json({
                error: 'Feature no disponible',
                reason: check.reason,
                limit: check.limit,
                current: check.current,
                remaining: check.remaining,
            }, { status: 403 });
        }
        // Registrar uso exitoso
        await (0, feature_executor_1.recordFeatureUsage)(auth.tenantId, action, {
            success: true,
        });
        return null; // Permitir continuar
    }
    catch (error) {
        console.error('Error validating feature:', error);
        return server_1.NextResponse.json({ error: 'Error al validar feature' }, { status: 500 });
    }
}
/**
 * Wrapper para rutas API que requieren validación de features
 *
 * @param handler - Handler de la ruta API
 * @param action - Acción a validar
 * @param getAuth - Función que obtiene la autenticación (debe ser proporcionada por la app)
 */
function withFeatureValidation(handler, action, getAuth) {
    return async (request) => {
        const validation = await validateFeature(request, action, getAuth);
        if (validation) {
            return validation;
        }
        return handler(request);
    };
}
