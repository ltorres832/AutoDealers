import { getFirestore } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

const DOC_ID = 'why_choose_us_section';

export const WHY_CHOOSE_ICON_KEYS = [
  'search',
  'chat',
  'chart',
  'support',
  'shield',
  'star',
  'truck',
  'phone',
] as const;

export const WHY_CHOOSE_COLOR_KEYS = [
  'blue',
  'green',
  'purple',
  'amber',
  'rose',
  'slate',
  'indigo',
  'teal',
] as const;

export type WhyChooseIconKey = (typeof WHY_CHOOSE_ICON_KEYS)[number];
export type WhyChooseColorKey = (typeof WHY_CHOOSE_COLOR_KEYS)[number];

export interface WhyChooseUsCard {
  title: string;
  description: string;
  footerLabel: string;
  iconKey: WhyChooseIconKey;
  colorKey: WhyChooseColorKey;
}

export interface WhyChooseUsSectionConfig {
  enabled: boolean;
  badgeLabel: string;
  /** Primera parte del título (antes del texto resaltado) */
  titleStart: string;
  /** Texto resaltado en azul (opcional) */
  titleHighlight: string;
  /** Resto del título después del resaltado */
  titleEnd: string;
  subtitle: string;
  cards: WhyChooseUsCard[];
}

const DEFAULTS: WhyChooseUsSectionConfig = {
  enabled: false,
  badgeLabel: '',
  titleStart: '',
  titleHighlight: '',
  titleEnd: '',
  subtitle: '',
  cards: [],
};

function normalizeIconKey(v: unknown): WhyChooseIconKey {
  const s = String(v || '').toLowerCase();
  return WHY_CHOOSE_ICON_KEYS.includes(s as WhyChooseIconKey) ? (s as WhyChooseIconKey) : 'search';
}

function normalizeColorKey(v: unknown): WhyChooseColorKey {
  const s = String(v || '').toLowerCase();
  return WHY_CHOOSE_COLOR_KEYS.includes(s as WhyChooseColorKey) ? (s as WhyChooseColorKey) : 'blue';
}

function sanitizeCard(raw: unknown): WhyChooseUsCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 120) : '';
  const description = typeof o.description === 'string' ? o.description.trim().slice(0, 500) : '';
  if (!title || !description) return null;
  return {
    title,
    description,
    footerLabel:
      typeof o.footerLabel === 'string' ? o.footerLabel.trim().slice(0, 80) : '✓',
    iconKey: normalizeIconKey(o.iconKey),
    colorKey: normalizeColorKey(o.colorKey),
  };
}

export function normalizeWhyChooseUsSectionConfig(
  raw: Record<string, unknown> | undefined | null
): WhyChooseUsSectionConfig {
  if (!raw) {
    return { ...DEFAULTS };
  }
  const cardsIn = Array.isArray(raw.cards) ? raw.cards : [];
  const cards = cardsIn.map(sanitizeCard).filter(Boolean) as WhyChooseUsCard[];

  return {
    enabled: raw.enabled === true,
    badgeLabel:
      typeof raw.badgeLabel === 'string' ? raw.badgeLabel.trim().slice(0, 80) : DEFAULTS.badgeLabel,
    titleStart:
      typeof raw.titleStart === 'string' ? raw.titleStart.trim().slice(0, 120) : DEFAULTS.titleStart,
    titleHighlight:
      typeof raw.titleHighlight === 'string'
        ? raw.titleHighlight.trim().slice(0, 80)
        : DEFAULTS.titleHighlight,
    titleEnd: typeof raw.titleEnd === 'string' ? raw.titleEnd.trim().slice(0, 120) : DEFAULTS.titleEnd,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim().slice(0, 500) : DEFAULTS.subtitle,
    cards: cards.slice(0, 8),
  };
}

export async function getWhyChooseUsSectionConfig(): Promise<WhyChooseUsSectionConfig> {
  const doc = await getDb().collection('system_settings').doc(DOC_ID).get();
  if (!doc.exists) {
    return { ...DEFAULTS };
  }
  return normalizeWhyChooseUsSectionConfig(doc.data() as Record<string, unknown>);
}

export { DOC_ID as WHY_CHOOSE_US_SECTION_DOC_ID };
