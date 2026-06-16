"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHY_CHOOSE_US_SECTION_DOC_ID = exports.WHY_CHOOSE_COLOR_KEYS = exports.WHY_CHOOSE_ICON_KEYS = void 0;
exports.normalizeWhyChooseUsSectionConfig = normalizeWhyChooseUsSectionConfig;
exports.getWhyChooseUsSectionConfig = getWhyChooseUsSectionConfig;
const shared_1 = require("@autodealers/shared");
function getDb() {
    return (0, shared_1.getFirestore)();
}
const DOC_ID = 'why_choose_us_section';
exports.WHY_CHOOSE_US_SECTION_DOC_ID = DOC_ID;
exports.WHY_CHOOSE_ICON_KEYS = [
    'search',
    'chat',
    'chart',
    'support',
    'shield',
    'star',
    'truck',
    'phone',
];
exports.WHY_CHOOSE_COLOR_KEYS = [
    'blue',
    'green',
    'purple',
    'amber',
    'rose',
    'slate',
    'indigo',
    'teal',
];
const DEFAULTS = {
    enabled: false,
    badgeLabel: '',
    titleStart: '',
    titleHighlight: '',
    titleEnd: '',
    subtitle: '',
    cards: [],
};
function normalizeIconKey(v) {
    const s = String(v || '').toLowerCase();
    return exports.WHY_CHOOSE_ICON_KEYS.includes(s) ? s : 'search';
}
function normalizeColorKey(v) {
    const s = String(v || '').toLowerCase();
    return exports.WHY_CHOOSE_COLOR_KEYS.includes(s) ? s : 'blue';
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
        footerLabel: typeof o.footerLabel === 'string' ? o.footerLabel.trim().slice(0, 80) : '✓',
        iconKey: normalizeIconKey(o.iconKey),
        colorKey: normalizeColorKey(o.colorKey),
    };
}
function normalizeWhyChooseUsSectionConfig(raw) {
    if (!raw) {
        return { ...DEFAULTS };
    }
    const cardsIn = Array.isArray(raw.cards) ? raw.cards : [];
    const cards = cardsIn.map(sanitizeCard).filter(Boolean);
    return {
        enabled: raw.enabled === true,
        badgeLabel: typeof raw.badgeLabel === 'string' ? raw.badgeLabel.trim().slice(0, 80) : DEFAULTS.badgeLabel,
        titleStart: typeof raw.titleStart === 'string' ? raw.titleStart.trim().slice(0, 120) : DEFAULTS.titleStart,
        titleHighlight: typeof raw.titleHighlight === 'string'
            ? raw.titleHighlight.trim().slice(0, 80)
            : DEFAULTS.titleHighlight,
        titleEnd: typeof raw.titleEnd === 'string' ? raw.titleEnd.trim().slice(0, 120) : DEFAULTS.titleEnd,
        subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim().slice(0, 500) : DEFAULTS.subtitle,
        cards: cards.slice(0, 8),
    };
}
async function getWhyChooseUsSectionConfig() {
    const doc = await getDb().collection('system_settings').doc(DOC_ID).get();
    if (!doc.exists) {
        return { ...DEFAULTS };
    }
    return normalizeWhyChooseUsSectionConfig(doc.data());
}
