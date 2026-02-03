import * as admin from 'firebase-admin';
export interface Referral {
    id: string;
    referrerId: string;
    referredId: string;
    referredEmail: string;
    referralCode: string;
    membershipType: 'basic' | 'professional' | 'premium';
    userType: 'dealer' | 'seller';
    paymentDate: admin.firestore.Timestamp;
    status: 'pending' | 'confirmed' | 'rewarded' | 'cancelled';
    rewardStatus: {
        discountApplied: boolean;
        freeMonthApplied: boolean;
        promotionsAvailable: number;
        bannersAvailable: number;
        promotionsUsed: number;
        bannersUsed: number;
    };
    createdAt: admin.firestore.Timestamp;
    confirmedAt?: admin.firestore.Timestamp;
    rewardsGrantedAt?: admin.firestore.Timestamp;
}
export interface RewardCredit {
    id: string;
    userId: string;
    type: 'promotion' | 'banner';
    source: 'referral' | 'admin_grant' | 'promotion';
    referralId?: string;
    status: 'available' | 'used' | 'expired';
    expiresAt?: admin.firestore.Timestamp;
    usedAt?: admin.firestore.Timestamp;
    usedFor?: string;
    createdAt: admin.firestore.Timestamp;
}
export interface ReferralRewardConfig {
    seller: {
        basic: {
            discountPercent: number;
            freeMonths: number;
            promotions: number;
            banners: number;
            contentDays: number;
        };
        professional: {
            discountPercent: number;
            freeMonths: number;
            promotions: number;
            banners: number;
            contentDays: number;
        };
        premium: {
            discountPercent: number;
            freeMonths: number;
            promotions: number;
            banners: number;
            contentDays: number;
        };
    };
    dealer: {
        basic: {
            discountPercent: number;
            freeMonths: number;
            promotions: number;
            banners: number;
            contentDays: number;
        };
        professional: {
            discountPercent: number;
            freeMonths: number;
            promotions: number;
            banners: number;
            contentDays: number;
        };
        premium: {
            discountPercent: number;
            freeMonths: number;
            promotions: number;
            banners: number;
            contentDays: number;
        };
    };
}
/**
 * Genera un código de referido único para un usuario
 */
export declare function generateReferralCode(userId: string): Promise<string>;
/**
 * Obtiene el código de referido de un usuario
 */
export declare function getReferralCode(userId: string): Promise<string | null>;
/**
 * Busca un usuario por su código de referido
 */
export declare function getUserByReferralCode(code: string): Promise<string | null>;
/**
 * Crea un registro de referido cuando alguien se registra con un código
 */
export declare function createReferral(referrerId: string, referredId: string, referredEmail: string, referralCode: string, userType: 'dealer' | 'seller', membershipType: 'basic' | 'professional' | 'premium'): Promise<Referral>;
/**
 * Confirma un referido después de 14 días sin cancelación
 */
export declare function confirmReferral(referralId: string): Promise<void>;
/**
 * Crea un crédito de recompensa
 */
export declare function createRewardCredit(userId: string, type: 'promotion' | 'banner', source: 'referral' | 'admin_grant' | 'promotion', referralId?: string, expiresAt?: admin.firestore.Timestamp): Promise<RewardCredit>;
/**
 * Usa un crédito de recompensa
 */
export declare function useRewardCredit(creditId: string, usedFor: string): Promise<boolean>;
/**
 * Obtiene créditos disponibles de un usuario
 */
export declare function getAvailableCredits(userId: string, type?: 'promotion' | 'banner'): Promise<RewardCredit[]>;
/**
 * Obtiene todos los referidos de un usuario
 */
export declare function getReferralsByUser(userId: string): Promise<Referral[]>;
/**
 * Obtiene la configuración de recompensas (desde admin o default)
 */
export declare function getRewardConfig(): Promise<ReferralRewardConfig>;
/**
 * Actualiza la configuración de recompensas (solo admin)
 */
export declare function updateRewardConfig(config: ReferralRewardConfig): Promise<void>;
/**
 * Marca un referido como confirmado (después del pago)
 */
export declare function markReferralAsConfirmed(referralId: string): Promise<void>;
/**
 * Cancela un referido (si el usuario cancela antes de 14 días)
 */
export declare function cancelReferral(referralId: string): Promise<void>;
//# sourceMappingURL=referrals.d.ts.map