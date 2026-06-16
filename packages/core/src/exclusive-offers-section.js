"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCLUSIVE_OFFERS_SECTION_DOC_ID = exports.EXCLUSIVE_OFFER_GRADIENT_CLASSES = exports.EXCLUSIVE_OFFER_GRADIENT_KEYS = void 0;
exports.normalizeExclusiveOffersSectionConfig = normalizeExclusiveOffersSectionConfig;
exports.getExclusiveOffersSectionConfig = getExclusiveOffersSectionConfig;
const shared_1 = require("@autodealers/shared");
function getDb() {
    return (0, shared_1.getFirestore)();
}
exports.EXCLUSIVE_OFFER_GRADIENT_KEYS = [
    'blue',
    'emerald',
    'amber',
    'slate',
    'rose',
    'violet',
    'cyan',
];
/** Clases Tailwind permitidas (no se guardan strings arbitrarios desde admin). */
exports.EXCLUSIVE_OFFER_GRADIENT_CLASSES = {
    blue: 'from-primary-600 to-primary-800',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-600',
    slate: 'from-slate-700 to-slate-900',
    rose: 'from-rose-500 to-pink-700',
    violet: 'from-primary-600 to-brand-black-deep',
    cyan: 'from-primary-500 to-primary-800',
};
const DOC_ID = 'exclusive_offers_section';
exports.EXCLUSIVE_OFFERS_SECTION_DOC_ID = DOC_ID;
const DEFAULTS = {
    enabled: false,
    badgeLabel: 'Promociones especiales',
    title: 'Ofertas exclusivas',
    subtitle: '',
    cards: [],
};
function normalizeGradientKey(v) {
    const s = String(v || '').toLowerCase();
    return exports.EXCLUSIVE_OFFER_GRADIENT_KEYS.includes(s)
        ? s
        : 'slate';
}
function sanitizeHref(v) {
    if (typeof v !== 'string')
        return '';
    const t = v.trim();
    if (!t)
        return '';
    if (t.startsWith('/'))
        return t.slice(0, 500);
    if (t.startsWith('https://') || t.startsWith('http://'))
        return t.slice(0, 2000);
    return '';
}
function sanitizeCard(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw;
    const title = typeof o.title === 'string' ? o.title.trim().slice(0, 120) : '';
    const description = typeof o.description === 'string' ? o.description.trim().slice(0, 500) : '';
    if (!title || !description)
        return null;
    return {
        title,
        description,
        badge: typeof o.badge === 'string' ? o.badge.trim().slice(0, 40) : 'Oferta',
        icon: typeof o.icon === 'string' ? o.icon.trim().slice(0, 8) : '✨',
        gradientKey: normalizeGradientKey(o.gradientKey),
        buttonLabel: typeof o.buttonLabel === 'string' && o.buttonLabel.trim()
            ? o.buttonLabel.trim().slice(0, 40)
            : 'Más información',
        buttonHref: sanitizeHref(o.buttonHref),
    };
}
function normalizeExclusiveOffersSectionConfig(raw) {
    if (!raw) {
        return { ...DEFAULTS };
    }
    const cardsIn = Array.isArray(raw.cards) ? raw.cards : [];
    const cards = cardsIn.map(sanitizeCard).filter(Boolean);
    return {
        enabled: raw.enabled === true,
        badgeLabel: typeof raw.badgeLabel === 'string' && raw.badgeLabel.trim()
            ? raw.badgeLabel.trim().slice(0, 80)
            : DEFAULTS.badgeLabel,
        title: typeof raw.title === 'string' && raw.title.trim()
            ? raw.title.trim().slice(0, 120)
            : DEFAULTS.title,
        subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim().slice(0, 400) : DEFAULTS.subtitle,
        cards: cards.slice(0, 8),
    };
}
async function getExclusiveOffersSectionConfig() {
    const doc = await getDb().collection('system_settings').doc(DOC_ID).get();
    if (!doc.exists) {
        return { ...DEFAULTS };
    }
    return normalizeExclusiveOffersSectionConfig(doc.data());
}
