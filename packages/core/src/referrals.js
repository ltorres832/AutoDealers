"use strict";
// Sistema de referidos y recompensas
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
exports.generateReferralCode = generateReferralCode;
exports.getReferralCode = getReferralCode;
exports.getUserByReferralCode = getUserByReferralCode;
exports.createReferral = createReferral;
exports.confirmReferral = confirmReferral;
exports.createRewardCredit = createRewardCredit;
exports.useRewardCredit = useRewardCredit;
exports.getAvailableCredits = getAvailableCredits;
exports.getReferralsByUser = getReferralsByUser;
exports.getRewardConfig = getRewardConfig;
exports.updateRewardConfig = updateRewardConfig;
exports.markReferralAsConfirmed = markReferralAsConfirmed;
exports.cancelReferral = cancelReferral;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
// Configuración por defecto de recompensas
const DEFAULT_REWARD_CONFIG = {
    seller: {
        basic: {
            discountPercent: 50,
            freeMonths: 0,
            promotions: 0,
            banners: 0,
            contentDays: 7, // Días válidos para todos los tipos de contenido después de usar
        },
        professional: {
            discountPercent: 0,
            freeMonths: 1,
            promotions: 0,
            banners: 0,
            contentDays: 7,
        },
        premium: {
            discountPercent: 0,
            freeMonths: 1,
            promotions: 1,
            banners: 1,
            contentDays: 7,
        },
    },
    dealer: {
        basic: {
            discountPercent: 50,
            freeMonths: 0,
            promotions: 0,
            banners: 0,
            contentDays: 7,
        },
        professional: {
            discountPercent: 0,
            freeMonths: 1,
            promotions: 2,
            banners: 0,
            contentDays: 7,
        },
        premium: {
            discountPercent: 0,
            freeMonths: 1,
            promotions: 4,
            banners: 2,
            contentDays: 7,
        },
    },
};
/**
 * Genera un código de referido único para un usuario
 */
async function generateReferralCode(userId) {
    try {
        console.log('🔍 generateReferralCode - Iniciando para userId:', userId);
        // Verificar si ya tiene código
        const userDoc = await getDb().collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.referralCode) {
                console.log('✅ generateReferralCode - Código ya existe:', userData.referralCode);
                return userData.referralCode;
            }
        }
        // Generar nuevo código único
        let code = '';
        let exists = true;
        let attempts = 0;
        while (exists && attempts < 10) {
            // Formato: REF-XXXXXX (6 caracteres alfanuméricos)
            const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
            code = `REF-${randomPart}`;
            // Verificar que no exista
            const existing = await getDb().collection('users')
                .where('referralCode', '==', code)
                .limit(1)
                .get();
            exists = !existing.empty;
            attempts++;
            if (exists) {
                console.log(`⚠️ generateReferralCode - Código ${code} ya existe, intentando otro...`);
            }
        }
        if (exists || !code) {
            // Fallback: usar UUID corto
            code = `REF-${userId.substring(0, 8).toUpperCase()}`;
            console.log('⚠️ generateReferralCode - Usando código fallback:', code);
        }
        console.log('💾 generateReferralCode - Guardando código:', code);
        // Guardar código en el usuario
        await getDb().collection('users').doc(userId).update({
            referralCode: code,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ generateReferralCode - Código guardado exitosamente:', code);
        return code;
    }
    catch (error) {
        console.error('❌ generateReferralCode - Error:', error.message);
        console.error('❌ generateReferralCode - Stack:', error.stack);
        throw error;
    }
}
/**
 * Obtiene el código de referido de un usuario
 */
async function getReferralCode(userId) {
    try {
        console.log('🔍 getReferralCode - Buscando código para userId:', userId);
        const userDoc = await getDb().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.error('❌ getReferralCode - Usuario no existe en Firestore:', userId);
            return null;
        }
        const userData = userDoc.data();
        console.log('✅ getReferralCode - Usuario encontrado:', {
            userId,
            role: userData?.role,
            tieneCodigo: !!userData?.referralCode
        });
        if (userData?.referralCode) {
            console.log('✅ getReferralCode - Código existente encontrado:', userData.referralCode);
            return userData.referralCode;
        }
        // Verificar que sea dealer o seller antes de generar
        if (userData?.role !== 'dealer' && userData?.role !== 'seller') {
            console.warn('⚠️ getReferralCode - Usuario no es dealer ni seller:', userData?.role);
            return null;
        }
        // Generar si no existe
        console.log('🔄 getReferralCode - Generando nuevo código...');
        const newCode = await generateReferralCode(userId);
        console.log('✅ getReferralCode - Código generado exitosamente:', newCode);
        return newCode;
    }
    catch (error) {
        console.error('❌ getReferralCode - Error:', error.message);
        console.error('❌ getReferralCode - Stack:', error.stack);
        return null;
    }
}
/**
 * Busca un usuario por su código de referido
 */
async function getUserByReferralCode(code) {
    const snapshot = await getDb().collection('users')
        .where('referralCode', '==', code)
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    return snapshot.docs[0].id;
}
/**
 * Crea un registro de referido cuando alguien se registra con un código
 */
async function createReferral(referrerId, referredId, referredEmail, referralCode, userType, membershipType) {
    const referralData = {
        referrerId,
        referredId,
        referredEmail,
        referralCode,
        membershipType,
        userType,
        paymentDate: admin.firestore.Timestamp.now(),
        status: 'pending',
        rewardStatus: {
            discountApplied: false,
            freeMonthApplied: false,
            promotionsAvailable: 0,
            bannersAvailable: 0,
            promotionsUsed: 0,
            bannersUsed: 0,
        },
        createdAt: admin.firestore.Timestamp.now(),
    };
    const docRef = getDb().collection('referrals').doc();
    await docRef.set({
        ...referralData,
        paymentDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Actualizar estadísticas del referidor
    await updateReferrerStats(referrerId);
    return {
        id: docRef.id,
        ...referralData,
    };
}
/**
 * Confirma un referido después de 14 días sin cancelación
 */
async function confirmReferral(referralId) {
    const referralDoc = await getDb().collection('referrals').doc(referralId).get();
    if (!referralDoc.exists) {
        throw new Error('Referido no encontrado');
    }
    const referral = referralDoc.data();
    if (referral.status !== 'confirmed') {
        throw new Error('El referido no está en estado confirmado');
    }
    // Obtener configuración de recompensas
    const config = await getRewardConfig();
    const rewardConfig = config[referral.userType][referral.membershipType];
    // Aplicar recompensas
    await applyReferralRewards(referralId, referral.referrerId, rewardConfig, referral.userType);
    // Actualizar estado
    await referralDoc.ref.update({
        status: 'rewarded',
        rewardsGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        rewardStatus: {
            discountApplied: rewardConfig.discountPercent > 0,
            freeMonthApplied: rewardConfig.freeMonths > 0,
            promotionsAvailable: rewardConfig.promotions,
            bannersAvailable: rewardConfig.banners,
            promotionsUsed: 0,
            bannersUsed: 0,
        },
    });
    // Actualizar estadísticas del referidor
    await updateReferrerStats(referral.referrerId);
}
/**
 * Aplica las recompensas al referidor
 */
async function applyReferralRewards(referralId, referrerId, rewardConfig, userType) {
    const userDoc = await getDb().collection('users').doc(referrerId).get();
    if (!userDoc.exists) {
        throw new Error('Usuario referidor no encontrado');
    }
    const userData = userDoc.data() || {};
    const currentRewards = userData.activeRewards || {
        nextMonthDiscount: 0,
        freeMonthsRemaining: 0,
        promotionCredits: 0,
        bannerCredits: 0,
    };
    const updates = {
        activeRewards: {
            nextMonthDiscount: Math.max(currentRewards.nextMonthDiscount || 0, rewardConfig.discountPercent),
            freeMonthsRemaining: (currentRewards.freeMonthsRemaining || 0) + rewardConfig.freeMonths,
            promotionCredits: (currentRewards.promotionCredits || 0) + rewardConfig.promotions,
            bannerCredits: (currentRewards.bannerCredits || 0) + rewardConfig.banners,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userDoc.ref.update(updates);
    // Crear créditos de promociones y banners si aplica
    if (rewardConfig.promotions > 0) {
        for (let i = 0; i < rewardConfig.promotions; i++) {
            await createRewardCredit(referrerId, 'promotion', 'referral', referralId);
        }
    }
    if (rewardConfig.banners > 0) {
        for (let i = 0; i < rewardConfig.banners; i++) {
            // Los créditos de banners NO tienen fecha de expiración inicialmente
            // La expiración se establece cuando se usan (7 días desde el uso)
            await createRewardCredit(referrerId, 'banner', 'referral', referralId, undefined // Sin expiración hasta que se use
            );
        }
    }
}
/**
 * Crea un crédito de recompensa
 */
async function createRewardCredit(userId, type, source, referralId, expiresAt) {
    const creditData = {
        userId,
        type,
        source,
        referralId,
        status: 'available',
        expiresAt,
        createdAt: admin.firestore.Timestamp.now(),
    };
    const docRef = getDb().collection('reward_credits').doc();
    const setData = {
        ...creditData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Solo establecer expiresAt si se proporciona (no para banners sin usar)
    if (expiresAt) {
        setData.expiresAt = expiresAt;
    }
    await docRef.set(setData);
    return {
        id: docRef.id,
        ...creditData,
    };
}
/**
 * Usa un crédito de recompensa
 */
async function useRewardCredit(creditId, usedFor) {
    const creditDoc = await getDb().collection('reward_credits').doc(creditId).get();
    if (!creditDoc.exists) {
        return false;
    }
    const credit = creditDoc.data();
    if (credit.status !== 'available') {
        return false;
    }
    // Para TODOS los tipos de contenido (promociones, banners, anuncios, etc.):
    // establecer expiración según configuración desde el uso
    // Obtener configuración para saber cuántos días son válidos después del uso
    const config = await getRewardConfig();
    let contentDays = 7; // Default
    if (credit.referralId) {
        const referralDoc = await getDb().collection('referrals').doc(credit.referralId).get();
        if (referralDoc.exists) {
            const referral = referralDoc.data();
            const rewardConfig = config[referral.userType][referral.membershipType];
            contentDays = rewardConfig.contentDays || 7;
        }
    }
    else {
        // Si no hay referralId, usar configuración por defecto del primer plan que tenga contenido
        // O usar 7 días como fallback
        contentDays = config.dealer.premium.contentDays || config.seller.premium.contentDays || 7;
    }
    // Establecer expiración según configuración para TODOS los tipos de contenido
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + contentDays);
    const expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);
    // Marcar como usado y establecer expiración para todos los tipos de contenido
    const updateData = {
        status: 'used',
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedFor,
        expiresAt, // Aplicar expiración a todos los tipos de contenido
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await creditDoc.ref.update(updateData);
    // Actualizar contadores en el usuario
    const userDoc = await getDb().collection('users').doc(credit.userId).get();
    if (userDoc.exists) {
        const userData = userDoc.data() || {};
        const currentRewards = userData.activeRewards || {};
        if (credit.type === 'promotion') {
            const current = currentRewards.promotionCredits || 0;
            await userDoc.ref.update({
                activeRewards: {
                    ...currentRewards,
                    promotionCredits: Math.max(0, current - 1),
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else if (credit.type === 'banner') {
            const current = currentRewards.bannerCredits || 0;
            await userDoc.ref.update({
                activeRewards: {
                    ...currentRewards,
                    bannerCredits: Math.max(0, current - 1),
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    return true;
}
/**
 * Obtiene créditos disponibles de un usuario
 */
async function getAvailableCredits(userId, type) {
    let query = getDb().collection('reward_credits')
        .where('userId', '==', userId)
        .where('status', '==', 'available');
    if (type) {
        query = query.where('type', '==', type);
    }
    const snapshot = await query.get();
    const credits = [];
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Verificar expiración solo si existe
        // Los créditos de banners sin usar NO tienen fecha de expiración
        if (data.expiresAt && data.status === 'used') {
            // Solo verificar expiración si el crédito ya fue usado
            const expiresAt = data.expiresAt.toDate();
            if (expiresAt < new Date()) {
                // Marcar como expirado
                doc.ref.update({
                    status: 'expired',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }
        }
        credits.push({
            id: doc.id,
            ...data,
        });
    });
    return credits;
}
/**
 * Obtiene todos los referidos de un usuario
 */
async function getReferralsByUser(userId) {
    const snapshot = await getDb().collection('referrals')
        .where('referrerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
/**
 * Actualiza las estadísticas del referidor
 */
async function updateReferrerStats(userId) {
    const referralsSnapshot = await getDb().collection('referrals')
        .where('referrerId', '==', userId)
        .get();
    const totalReferred = referralsSnapshot.size;
    const totalRewarded = referralsSnapshot.docs.filter((doc) => doc.data().status === 'rewarded').length;
    const pendingRewards = referralsSnapshot.docs.filter((doc) => doc.data().status === 'confirmed').length;
    await getDb().collection('users').doc(userId).update({
        referralStats: {
            totalReferred,
            totalRewarded,
            pendingRewards,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene la configuración de recompensas (desde admin o default)
 */
async function getRewardConfig() {
    try {
        const configDoc = await getDb().collection('system_config').doc('referral_rewards').get();
        if (configDoc.exists) {
            const config = configDoc.data();
            // Validar que tenga la estructura correcta
            if (config && config.seller && config.dealer) {
                // Migrar bannerDays a contentDays si existe configuración antigua
                const migratedConfig = { seller: {}, dealer: {} };
                let needsMigration = false;
                for (const userType of ['seller', 'dealer']) {
                    migratedConfig[userType] = {};
                    for (const membershipType of ['basic', 'professional', 'premium']) {
                        const oldConfig = config[userType]?.[membershipType];
                        if (oldConfig) {
                            // Si tiene bannerDays pero no contentDays, migrar
                            if (oldConfig.bannerDays !== undefined && oldConfig.contentDays === undefined) {
                                migratedConfig[userType][membershipType] = {
                                    ...oldConfig,
                                    contentDays: oldConfig.bannerDays,
                                };
                                delete migratedConfig[userType][membershipType].bannerDays;
                                needsMigration = true;
                            }
                            else if (!oldConfig.contentDays) {
                                // Si no tiene contentDays, usar valor por defecto
                                migratedConfig[userType][membershipType] = {
                                    ...oldConfig,
                                    contentDays: DEFAULT_REWARD_CONFIG[userType][membershipType].contentDays,
                                };
                                needsMigration = true;
                            }
                            else {
                                migratedConfig[userType][membershipType] = oldConfig;
                            }
                        }
                        else {
                            // Usar valores por defecto si no existe
                            migratedConfig[userType][membershipType] = DEFAULT_REWARD_CONFIG[userType][membershipType];
                            needsMigration = true;
                        }
                    }
                }
                // Guardar configuración migrada si fue necesario
                if (needsMigration) {
                    await getDb().collection('system_config').doc('referral_rewards').update({
                        ...migratedConfig,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                return migratedConfig;
            }
        }
        // Guardar configuración por defecto si no existe o está corrupta
        await getDb().collection('system_config').doc('referral_rewards').set({
            ...DEFAULT_REWARD_CONFIG,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return DEFAULT_REWARD_CONFIG;
    }
    catch (error) {
        console.error('Error getting reward config:', error);
        // En caso de error, retornar configuración por defecto
        return DEFAULT_REWARD_CONFIG;
    }
}
/**
 * Actualiza la configuración de recompensas (solo admin)
 */
async function updateRewardConfig(config) {
    await getDb().collection('system_config').doc('referral_rewards').set({
        ...config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Marca un referido como confirmado (después del pago)
 */
async function markReferralAsConfirmed(referralId) {
    const referralDoc = await getDb().collection('referrals').doc(referralId).get();
    if (!referralDoc.exists) {
        throw new Error('Referido no encontrado');
    }
    await referralDoc.ref.update({
        status: 'confirmed',
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Cancela un referido (si el usuario cancela antes de 14 días)
 */
async function cancelReferral(referralId) {
    const referralDoc = await getDb().collection('referrals').doc(referralId).get();
    if (!referralDoc.exists) {
        throw new Error('Referido no encontrado');
    }
    const referral = referralDoc.data();
    if (referral.status === 'rewarded') {
        throw new Error('No se puede cancelar un referido que ya recibió recompensas');
    }
    await referralDoc.ref.update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Actualizar estadísticas
    await updateReferrerStats(referral.referrerId);
}
