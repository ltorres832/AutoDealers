"use strict";
// Gestión de membresías
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
exports.createMembership = createMembership;
exports.getMemberships = getMemberships;
exports.getActiveMemberships = getActiveMemberships;
exports.getMembershipById = getMembershipById;
exports.updateMembership = updateMembership;
exports.hasFeature = hasFeature;
exports.checkLimit = checkLimit;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
// NO inicializar db aquí - se inicializa en cada función
let db = null;
function getDb() {
    if (!db) {
        db = (0, core_1.getFirestore)();
    }
    return db;
}
/**
 * Crea una nueva membresía
 */
async function createMembership(membership) {
    const docRef = getDb().collection('memberships').doc();
    await docRef.set({
        ...membership,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...membership,
        createdAt: new Date(),
    };
}
/**
 * Obtiene todas las membresías (para admin)
 */
async function getMemberships(type) {
    console.log(`🔍 getMemberships: Obteniendo membresías${type ? ` (tipo: ${type})` : ' (todas)'}`);
    try {
        // Primero intentar sin orderBy para evitar problemas de índice
        let query = getDb().collection('memberships');
        if (type) {
            query = query.where('type', '==', type);
        }
        console.log(`📡 Ejecutando query de Firestore...`);
        const snapshot = await query.get();
        console.log(`📊 getMemberships: Encontradas ${snapshot.size} membresías en Firestore`);
        if (snapshot.empty) {
            console.warn(`⚠️ getMemberships: No se encontraron membresías${type ? ` de tipo ${type}` : ''}`);
            // Verificar si hay membresías sin filtro
            if (type) {
                const allSnapshot = await getDb().collection('memberships').limit(10).get();
                console.log(`📋 Total de membresías en Firestore (sin filtro): ${allSnapshot.size}`);
                if (allSnapshot.size > 0) {
                    console.log(`📋 Primeras membresías encontradas:`);
                    allSnapshot.docs.forEach((doc, i) => {
                        const data = doc.data();
                        console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}, Precio: ${data.price}, Activa: ${data.isActive}`);
                    });
                }
            }
            return [];
        }
        const memberships = snapshot.docs.map((doc) => {
            const data = doc.data();
            const membership = {
                id: doc.id,
                ...data,
                createdAt: data?.createdAt?.toDate() || new Date(),
            };
            console.log(`  ✓ ${membership.name} (${membership.type}) - $${membership.price} - Activa: ${membership.isActive}`);
            return membership;
        });
        // Ordenar manualmente por precio (más confiable que orderBy en query)
        memberships.sort((a, b) => (a.price || 0) - (b.price || 0));
        console.log(`✅ getMemberships: Retornando ${memberships.length} membresías ordenadas`);
        return memberships;
    }
    catch (error) {
        console.error(`❌ Error in getMemberships:`, error);
        console.error(`Stack:`, error.stack);
        // Último recurso: obtener todas sin filtros
        try {
            console.log(`🔄 Intentando obtener todas las membresías sin filtros...`);
            const allSnapshot = await getDb().collection('memberships').get();
            if (allSnapshot.empty) {
                console.warn(`⚠️ No hay membresías en Firestore`);
                return [];
            }
            const allMemberships = allSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data?.createdAt?.toDate() || new Date(),
                };
            });
            // Filtrar por tipo si se especificó
            const filtered = type
                ? allMemberships.filter(m => m.type === type)
                : allMemberships;
            // Ordenar por precio
            filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
            console.log(`✅ getMemberships (fallback): Retornando ${filtered.length} membresías`);
            return filtered;
        }
        catch (finalError) {
            console.error(`❌ Error en fallback final de getMemberships:`, finalError);
            return [];
        }
    }
}
/**
 * Obtiene todas las membresías activas
 */
async function getActiveMemberships(type) {
    console.log(`🔍 getActiveMemberships: Obteniendo membresías activas${type ? ` (tipo: ${type})` : ' (todas)'}`);
    try {
        // Primero intentar sin orderBy para evitar problemas de índice
        let query = getDb()
            .collection('memberships')
            .where('isActive', '==', true);
        if (type) {
            query = query.where('type', '==', type);
        }
        console.log(`📡 Ejecutando query de Firestore para membresías activas...`);
        const snapshot = await query.get();
        console.log(`📊 getActiveMemberships: Encontradas ${snapshot.size} membresías activas en Firestore`);
        if (snapshot.empty) {
            console.warn(`⚠️ getActiveMemberships: No se encontraron membresías activas${type ? ` de tipo ${type}` : ''}`);
            // Verificar si hay membresías activas sin filtro
            if (type) {
                const allActiveSnapshot = await getDb()
                    .collection('memberships')
                    .where('isActive', '==', true)
                    .limit(10)
                    .get();
                console.log(`📋 Total de membresías activas en Firestore (sin filtro de tipo): ${allActiveSnapshot.size}`);
                if (allActiveSnapshot.size > 0) {
                    console.log(`📋 Primeras membresías activas encontradas:`);
                    allActiveSnapshot.docs.forEach((doc, i) => {
                        const data = doc.data();
                        console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}, Precio: ${data.price}`);
                    });
                }
            }
            return [];
        }
        const memberships = snapshot.docs.map((doc) => {
            const data = doc.data();
            const membership = {
                id: doc.id,
                ...data,
                createdAt: data?.createdAt?.toDate() || new Date(),
            };
            console.log(`  ✓ ${membership.name} (${membership.type}) - $${membership.price}`);
            return membership;
        });
        // Ordenar manualmente por precio (más confiable que orderBy en query)
        memberships.sort((a, b) => (a.price || 0) - (b.price || 0));
        console.log(`✅ getActiveMemberships: Retornando ${memberships.length} membresías activas ordenadas`);
        return memberships;
    }
    catch (error) {
        console.error(`❌ Error in getActiveMemberships:`, error);
        console.error(`Stack:`, error.stack);
        // Fallback: obtener todas y filtrar manualmente
        try {
            console.log(`🔄 Intentando fallback: obtener todas las membresías y filtrar manualmente...`);
            const allSnapshot = await getDb().collection('memberships').get();
            if (allSnapshot.empty) {
                console.warn(`⚠️ No hay membresías en Firestore`);
                return [];
            }
            const allMemberships = allSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data?.createdAt?.toDate() || new Date(),
                };
            });
            // Filtrar por activas y tipo
            let filtered = allMemberships.filter(m => m.isActive === true);
            if (type) {
                filtered = filtered.filter(m => m.type === type);
            }
            // Ordenar por precio
            filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
            console.log(`✅ getActiveMemberships (fallback): Retornando ${filtered.length} membresías activas`);
            return filtered;
        }
        catch (finalError) {
            console.error(`❌ Error en fallback final de getActiveMemberships:`, finalError);
            console.error(`Stack:`, finalError.stack);
            return [];
        }
    }
}
/**
 * Obtiene una membresía por ID
 */
async function getMembershipById(membershipId) {
    if (!membershipId || membershipId.trim() === '') {
        console.error('❌ getMembershipById: membershipId vacío o inválido');
        return null;
    }
    try {
        console.log(`🔍 getMembershipById: Buscando membresía con ID: ${membershipId}`);
        const membershipDoc = await getDb()
            .collection('memberships')
            .doc(membershipId)
            .get();
        if (!membershipDoc.exists) {
            console.warn(`⚠️ getMembershipById: Membership ${membershipId} not found in Firestore`);
            // Verificar si hay membresías en la colección
            const allMemberships = await getDb().collection('memberships').limit(5).get();
            console.log(`📊 Total de membresías en Firestore: ${allMemberships.size}`);
            if (allMemberships.size > 0) {
                console.log(`📋 Primeras membresías encontradas:`);
                allMemberships.docs.forEach((doc, i) => {
                    const data = doc.data();
                    console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}`);
                });
            }
            return null;
        }
        const data = membershipDoc.data();
        if (!data) {
            console.warn(`⚠️ getMembershipById: Membership ${membershipId} exists but has no data`);
            return null;
        }
        const membership = {
            id: membershipDoc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
        };
        console.log(`✅ getMembershipById: Encontrada membresía ${membership.name} (${membership.type}) - Activa: ${membership.isActive}`);
        return membership;
    }
    catch (error) {
        console.error(`❌ getMembershipById: Error fetching membership ${membershipId}:`, error);
        console.error(`Stack:`, error.stack);
        return null;
    }
}
/**
 * Actualiza una membresía
 * Limpia todos los valores undefined antes de actualizar
 */
async function updateMembership(membershipId, updates) {
    // Función recursiva para limpiar undefined
    function removeUndefined(obj) {
        if (obj === undefined || obj === null) {
            return null; // Firestore acepta null, no undefined
        }
        if (Array.isArray(obj)) {
            return obj.map(removeUndefined);
        }
        if (typeof obj === 'object' && obj !== null) {
            const cleaned = {};
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    cleaned[key] = removeUndefined(obj[key]);
                }
            }
            return cleaned;
        }
        return obj;
    }
    const cleanedUpdates = removeUndefined(updates);
    // Asegurar que updatedAt y syncVersion estén presentes
    const finalUpdates = {
        ...cleanedUpdates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncVersion: admin.firestore.FieldValue.increment(1),
    };
    console.log('💾 updateMembership - Final updates (no undefined):', JSON.stringify(finalUpdates, null, 2));
    await getDb().collection('memberships').doc(membershipId).update(finalUpdates);
}
/**
 * Verifica si una membresía tiene una feature específica
 */
function hasFeature(membership, feature) {
    return membership.features[feature] === true;
}
/**
 * Verifica límites de membresía
 */
function checkLimit(membership, limit, currentCount) {
    const maxLimit = membership.features[limit];
    if (maxLimit === undefined) {
        return true; // Sin límite
    }
    return currentCount < maxLimit;
}
//# sourceMappingURL=memberships.js.map