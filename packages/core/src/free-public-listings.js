"use strict";
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
exports.getFreePublicListingsSettings = getFreePublicListingsSettings;
exports.freeListingExpiresAtMs = freeListingExpiresAtMs;
exports.isFreeListingSlotActive = isFreeListingSlotActive;
exports.countActiveFreeListingsForSeller = countActiveFreeListingsForSeller;
exports.tenantUsesFreePublicListingsPolicy = tenantUsesFreePublicListingsPolicy;
exports.resolveSellerVehicleCreatePolicy = resolveSellerVehicleCreatePolicy;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const tenants_1 = require("./tenants");
function getDb() {
    return (0, shared_1.getFirestore)();
}
const DEFAULTS = {
    enabled: true,
    maxActiveFreeVehiclesPerSeller: 2,
    durationDays: 14,
    ctaTitle: '¿Quieres vender?',
    ctaSubtitle: 'Publica tu auto hoy mismo y llega a millones',
    ctaButtonLabel: 'Publicar Gratis',
    quickListingPath: '/publicar-gratis',
    registerPath: '/register?type=seller',
    registerCtaLabel: 'Crear cuenta de vendedor (más beneficios)',
    successHeadline: '¡Tu anuncio está publicado!',
    successSubtitle: 'Regístrate gratis como vendedor y consigue muchos más clientes: panel de control, cotizaciones, financiamiento, mensajería y mucho más.',
};
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
async function getFreePublicListingsSettings() {
    const doc = await getDb().collection('system_settings').doc('free_public_listings').get();
    if (!doc.exists) {
        return { ...DEFAULTS };
    }
    const d = doc.data() || {};
    return {
        enabled: d.enabled !== false,
        maxActiveFreeVehiclesPerSeller: clamp(Number(d.maxActiveFreeVehiclesPerSeller) || DEFAULTS.maxActiveFreeVehiclesPerSeller, 0, 100),
        durationDays: clamp(Number(d.durationDays) || DEFAULTS.durationDays, 1, 365),
        ctaTitle: typeof d.ctaTitle === 'string' && d.ctaTitle.trim() ? d.ctaTitle : DEFAULTS.ctaTitle,
        ctaSubtitle: typeof d.ctaSubtitle === 'string' && d.ctaSubtitle.trim() ? d.ctaSubtitle : DEFAULTS.ctaSubtitle,
        ctaButtonLabel: typeof d.ctaButtonLabel === 'string' && d.ctaButtonLabel.trim()
            ? d.ctaButtonLabel
            : DEFAULTS.ctaButtonLabel,
        quickListingPath: typeof d.quickListingPath === 'string' && d.quickListingPath.startsWith('/')
            ? d.quickListingPath
            : DEFAULTS.quickListingPath,
        registerPath: typeof d.registerPath === 'string' && d.registerPath.startsWith('/')
            ? d.registerPath
            : DEFAULTS.registerPath,
        registerCtaLabel: typeof d.registerCtaLabel === 'string' && d.registerCtaLabel.trim()
            ? d.registerCtaLabel
            : DEFAULTS.registerCtaLabel,
        successHeadline: typeof d.successHeadline === 'string' && d.successHeadline.trim()
            ? d.successHeadline
            : DEFAULTS.successHeadline,
        successSubtitle: typeof d.successSubtitle === 'string' && d.successSubtitle.trim()
            ? d.successSubtitle
            : DEFAULTS.successSubtitle,
    };
}
function freeListingExpiresAtMs(v) {
    if (v == null)
        return null;
    if (typeof v === 'object' && v !== null && '_seconds' in v) {
        const sec = v._seconds;
        if (typeof sec === 'number')
            return sec * 1000;
    }
    if (typeof v === 'object' && v !== null && typeof v.toDate === 'function') {
        try {
            return v.toDate().getTime();
        }
        catch {
            return null;
        }
    }
    if (v instanceof Date)
        return v.getTime();
    if (typeof v === 'string') {
        const t = Date.parse(v);
        return Number.isNaN(t) ? null : t;
    }
    return null;
}
/** Anuncio gratuito que sigue contando para el cupo (no vendido, no borrado, no vencido). */
function isFreeListingSlotActive(v) {
    if (v.deleted === true)
        return false;
    if (!v.isFreePublicListing)
        return false;
    const st = String(v.status ?? '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');
    if (['sold', 'deleted', 'inactive'].includes(st))
        return false;
    const exp = freeListingExpiresAtMs(v.freeListingExpiresAt);
    if (exp != null && exp < Date.now())
        return false;
    return true;
}
async function countActiveFreeListingsForSeller(tenantId, sellerId) {
    const { getVehicles } = await Promise.resolve().then(() => __importStar(require('@autodealers/inventory')));
    const vehicles = await getVehicles(tenantId);
    return vehicles.filter((veh) => {
        const sid = veh.sellerId || veh.assignedTo;
        if (sid !== sellerId)
            return false;
        return isFreeListingSlotActive(veh);
    }).length;
}
/** Sin membresía (plan de pago) asignada al tenant → política de anuncios gratis. */
async function tenantUsesFreePublicListingsPolicy(tenantId) {
    const tenant = await (0, tenants_1.getTenantById)(tenantId);
    if (!tenant)
        return false;
    const mid = tenant.membershipId;
    return mid == null || String(mid).trim() === '';
}
async function resolveSellerVehicleCreatePolicy(tenantId, sellerId) {
    const settings = await getFreePublicListingsSettings();
    const useFree = await tenantUsesFreePublicListingsPolicy(tenantId);
    if (!useFree) {
        const { canPerformAction } = await Promise.resolve().then(() => __importStar(require('./membership-validation')));
        const r = await canPerformAction(tenantId, 'addVehicle');
        if (!r.allowed) {
            return {
                mode: 'blocked',
                status: 403,
                message: r.reason || 'No puedes agregar más vehículos con tu plan actual.',
            };
        }
        return { mode: 'paid' };
    }
    if (!settings.enabled) {
        return {
            mode: 'blocked',
            status: 403,
            message: 'Las publicaciones gratuitas están desactivadas. Contrata un plan o contacta soporte para publicar vehículos.',
        };
    }
    if (settings.maxActiveFreeVehiclesPerSeller <= 0) {
        return {
            mode: 'blocked',
            status: 403,
            message: 'En este momento no se permiten anuncios gratuitos. Contrata un plan para publicar.',
        };
    }
    const count = await countActiveFreeListingsForSeller(tenantId, sellerId);
    if (count >= settings.maxActiveFreeVehiclesPerSeller) {
        return {
            mode: 'blocked',
            status: 403,
            message: `Ya tienes ${settings.maxActiveFreeVehiclesPerSeller} anuncio(s) gratuito(s) activo(s). Cuando vendas o elimines uno, o venza el plazo, podrás publicar otro. También puedes contratar un plan para más inventario.`,
        };
    }
    const expires = new Date();
    expires.setUTCDate(expires.getUTCDate() + settings.durationDays);
    const expiresAt = admin.firestore.Timestamp.fromDate(expires);
    return { mode: 'free', expiresAt };
}
