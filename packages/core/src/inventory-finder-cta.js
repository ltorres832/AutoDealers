"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVENTORY_FINDER_CTA_DOC_ID = void 0;
exports.normalizeInventoryFinderCtaConfig = normalizeInventoryFinderCtaConfig;
exports.getInventoryFinderCtaConfig = getInventoryFinderCtaConfig;
const shared_1 = require("@autodealers/shared");
function getDb() {
    return (0, shared_1.getFirestore)();
}
const DOC_ID = 'inventory_finder_cta';
exports.INVENTORY_FINDER_CTA_DOC_ID = DOC_ID;
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
    if (t === '#' || t.startsWith('#'))
        return t.slice(0, 100);
    return '';
}
const DEFAULTS = {
    enabled: false,
    title: '¿No encuentras lo que buscas?',
    description: '',
    primarySmallLabel: '',
    primaryMainLabel: '',
    primaryHoverHint: '',
    primaryHref: '',
    secondaryLabel: '',
    secondaryHref: '',
    footerText: '',
    showFooterPulse: true,
};
function normalizeInventoryFinderCtaConfig(raw) {
    if (!raw) {
        return { ...DEFAULTS };
    }
    return {
        enabled: raw.enabled === true,
        title: typeof raw.title === 'string' && raw.title.trim()
            ? raw.title.trim().slice(0, 200)
            : DEFAULTS.title,
        description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 800) : DEFAULTS.description,
        primarySmallLabel: typeof raw.primarySmallLabel === 'string'
            ? raw.primarySmallLabel.trim().slice(0, 80)
            : DEFAULTS.primarySmallLabel,
        primaryMainLabel: typeof raw.primaryMainLabel === 'string'
            ? raw.primaryMainLabel.trim().slice(0, 120)
            : DEFAULTS.primaryMainLabel,
        primaryHoverHint: typeof raw.primaryHoverHint === 'string'
            ? raw.primaryHoverHint.trim().slice(0, 120)
            : DEFAULTS.primaryHoverHint,
        primaryHref: sanitizeHref(raw.primaryHref),
        secondaryLabel: typeof raw.secondaryLabel === 'string'
            ? raw.secondaryLabel.trim().slice(0, 120)
            : DEFAULTS.secondaryLabel,
        secondaryHref: sanitizeHref(raw.secondaryHref),
        footerText: typeof raw.footerText === 'string' ? raw.footerText.trim().slice(0, 300) : DEFAULTS.footerText,
        showFooterPulse: raw.showFooterPulse !== false,
    };
}
async function getInventoryFinderCtaConfig() {
    const doc = await getDb().collection('system_settings').doc(DOC_ID).get();
    if (!doc.exists) {
        return { ...DEFAULTS };
    }
    return normalizeInventoryFinderCtaConfig(doc.data());
}
