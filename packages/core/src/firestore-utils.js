"use strict";
/**
 * Utilidades para Firestore - Limpieza de valores undefined
 * Firestore NO acepta valores undefined, solo null
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanFirestoreData = cleanFirestoreData;
exports.getFirestoreSettings = getFirestoreSettings;
/**
 * Limpia recursivamente todos los valores undefined de un objeto
 * Los convierte a null o los elimina según el caso
 */
function cleanFirestoreData(data) {
    if (data === undefined) {
        return null;
    }
    if (data === null) {
        return null;
    }
    if (Array.isArray(data)) {
        return data.map(item => cleanFirestoreData(item));
    }
    if (typeof data === 'object' && data !== null) {
        const cleaned = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                if (value !== undefined) {
                    cleaned[key] = cleanFirestoreData(value);
                }
                // Si es undefined, simplemente no lo agregamos al objeto
            }
        }
        return cleaned;
    }
    return data;
}
/**
 * Opción alternativa: usar ignoreUndefinedProperties
 * Pero es mejor limpiar los datos antes de guardarlos
 */
function getFirestoreSettings() {
    return {
        ignoreUndefinedProperties: true,
    };
}
