import { getFirestore } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

const DOC_ID = 'inventory_finder_cta';

function sanitizeHref(v: unknown): string {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  if (!t) return '';
  if (t.startsWith('/')) return t.slice(0, 500);
  if (t.startsWith('https://') || t.startsWith('http://')) return t.slice(0, 2000);
  if (t === '#' || t.startsWith('#')) return t.slice(0, 100);
  return '';
}

export interface InventoryFinderCtaConfig {
  enabled: boolean;
  title: string;
  description: string;
  primarySmallLabel: string;
  primaryMainLabel: string;
  /** Texto bajo el título al hacer hover (vacío = no mostrar) */
  primaryHoverHint: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  /** Soporta {{count}} = cantidad de vehículos publicados pasada desde la home */
  footerText: string;
  showFooterPulse: boolean;
}

const DEFAULTS: InventoryFinderCtaConfig = {
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

export function normalizeInventoryFinderCtaConfig(
  raw: Record<string, unknown> | undefined | null
): InventoryFinderCtaConfig {
  if (!raw) {
    return { ...DEFAULTS };
  }
  return {
    enabled: raw.enabled === true,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim().slice(0, 200)
        : DEFAULTS.title,
    description:
      typeof raw.description === 'string' ? raw.description.trim().slice(0, 800) : DEFAULTS.description,
    primarySmallLabel:
      typeof raw.primarySmallLabel === 'string'
        ? raw.primarySmallLabel.trim().slice(0, 80)
        : DEFAULTS.primarySmallLabel,
    primaryMainLabel:
      typeof raw.primaryMainLabel === 'string'
        ? raw.primaryMainLabel.trim().slice(0, 120)
        : DEFAULTS.primaryMainLabel,
    primaryHoverHint:
      typeof raw.primaryHoverHint === 'string'
        ? raw.primaryHoverHint.trim().slice(0, 120)
        : DEFAULTS.primaryHoverHint,
    primaryHref: sanitizeHref(raw.primaryHref),
    secondaryLabel:
      typeof raw.secondaryLabel === 'string'
        ? raw.secondaryLabel.trim().slice(0, 120)
        : DEFAULTS.secondaryLabel,
    secondaryHref: sanitizeHref(raw.secondaryHref),
    footerText:
      typeof raw.footerText === 'string' ? raw.footerText.trim().slice(0, 300) : DEFAULTS.footerText,
    showFooterPulse: raw.showFooterPulse !== false,
  };
}

export async function getInventoryFinderCtaConfig(): Promise<InventoryFinderCtaConfig> {
  const doc = await getDb().collection('system_settings').doc(DOC_ID).get();
  if (!doc.exists) {
    return { ...DEFAULTS };
  }
  return normalizeInventoryFinderCtaConfig(doc.data() as Record<string, unknown>);
}

export { DOC_ID as INVENTORY_FINDER_CTA_DOC_ID };
