import { deepMerge } from '@/lib/deep-merge';

export const DEFAULT_HERO_TITLE = 'Encuentra el vehículo perfecto para ti';
export const DEFAULT_HERO_SUBTITLE = 'Tenemos la mejor selección de vehículos';
export const DEFAULT_HERO_CTA = 'Ver Inventario';
export const DEFAULT_CHAT_WELCOME = 'Hola, ¿tienes el vehículo disponible?';

/** Títulos rotos por guardados antiguos o merges incompletos en Firestore. */
const BROKEN_HERO_TITLES = new Set([
  'Encuentra el vehículo perfecto para',
  'Encuentra el vehículo perfecto para ',
  'Encuentra el vehículo perfecto',
]);

export function repairHeroTitle(title: unknown): string {
  if (typeof title !== 'string') return DEFAULT_HERO_TITLE;
  const t = title.trim();
  if (!t || BROKEN_HERO_TITLES.has(t)) return DEFAULT_HERO_TITLE;
  return t;
}

export function createDefaultWebsiteSettingsRecord(): Record<string, unknown> {
  return {
    hero: {
      title: DEFAULT_HERO_TITLE,
      subtitle: DEFAULT_HERO_SUBTITLE,
      ctaText: DEFAULT_HERO_CTA,
    },
    sections: {
      about: { enabled: true, title: 'Sobre Mí', content: '' },
      services: { enabled: true, title: 'Servicios', items: [] },
      testimonials: { enabled: false, title: 'Testimonios' },
      contact: { enabled: true, title: 'Contáctame', showMap: false },
    },
    layout: {
      headerStyle: 'default',
      footerStyle: 'default',
      colorScheme: 'light',
    },
    seo: { metaTitle: '', metaDescription: '', keywords: '' },
    chat: { enabled: true, welcomeMessage: DEFAULT_CHAT_WELCOME },
  };
}

/** Combina defaults + Firestore y repara textos del hero conocidos como truncados. */
export function normalizeWebsiteSettingsFromFirestore(
  stored: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const merged = deepMerge(
    createDefaultWebsiteSettingsRecord(),
    (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>
  );
  const hero = merged.hero;
  if (isPlainObject(hero)) {
    hero.title = repairHeroTitle(hero.title);
    if (typeof hero.subtitle !== 'string' || !hero.subtitle.trim()) {
      hero.subtitle = DEFAULT_HERO_SUBTITLE;
    }
    if (typeof hero.ctaText !== 'string' || !hero.ctaText.trim()) {
      hero.ctaText = DEFAULT_HERO_CTA;
    }
  }
  const chat = merged.chat;
  if (isPlainObject(chat) && typeof chat.welcomeMessage !== 'string') {
    chat.welcomeMessage = DEFAULT_CHAT_WELCOME;
  }
  return merged;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
