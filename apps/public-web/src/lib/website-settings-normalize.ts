/** Misma normalización que el panel vendedor (settings/website). */

export const DEFAULT_HERO_TITLE = 'Encuentra el vehículo perfecto para ti';
export const DEFAULT_HERO_SUBTITLE = 'Tenemos la mejor selección de vehículos';
export const DEFAULT_HERO_CTA = 'Ver Inventario';
export const DEFAULT_CHAT_WELCOME = 'Hola, ¿tienes el vehículo disponible?';

const BROKEN_HERO_TITLES = new Set([
  'Encuentra el vehículo perfecto para',
  'Encuentra el vehículo perfecto para ',
  'Encuentra el vehículo perfecto',
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (isPlainObject(tv) && isPlainObject(sv)) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

export function repairHeroTitle(title: unknown): string {
  if (typeof title !== 'string') return DEFAULT_HERO_TITLE;
  const t = title.trim();
  if (!t || BROKEN_HERO_TITLES.has(t)) return DEFAULT_HERO_TITLE;
  return t;
}

/** Sustituye subtítulos autogenerados con conteo de inventario por el texto de marketing. */
export function repairHeroSubtitle(subtitle: unknown): string {
  if (typeof subtitle !== 'string' || !subtitle.trim()) return DEFAULT_HERO_SUBTITLE;
  const t = subtitle.trim();
  if (/^Tenemos\s+\d+\s+veh[ií]culos/i.test(t)) return DEFAULT_HERO_SUBTITLE;
  if (/^tenemos\s+\d+\s+disponibles/i.test(t)) return DEFAULT_HERO_SUBTITLE;
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
    hero.subtitle = repairHeroSubtitle(hero.subtitle);
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

export type WebsiteSettingsView = {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    backgroundImage?: string;
  };
  sections: {
    about: { enabled: boolean; title: string; content: string };
    contact: { enabled: boolean; title: string; showMap?: boolean };
  };
  chat: { enabled: boolean; welcomeMessage: string };
};

export function toWebsiteSettingsView(raw: Record<string, unknown>): WebsiteSettingsView {
  const hero = isPlainObject(raw.hero) ? raw.hero : {};
  const sections = isPlainObject(raw.sections) ? raw.sections : {};
  const about = isPlainObject(sections.about) ? sections.about : {};
  const contact = isPlainObject(sections.contact) ? sections.contact : {};
  const chat = isPlainObject(raw.chat) ? raw.chat : {};

  return {
    hero: {
      title: repairHeroTitle(hero.title),
      subtitle: repairHeroSubtitle(hero.subtitle),
      ctaText:
        typeof hero.ctaText === 'string' && hero.ctaText.trim()
          ? hero.ctaText.trim()
          : DEFAULT_HERO_CTA,
      backgroundImage:
        typeof hero.backgroundImage === 'string' ? hero.backgroundImage : undefined,
    },
    sections: {
      about: {
        enabled: about.enabled !== false,
        title: typeof about.title === 'string' ? about.title : 'Sobre Mí',
        content: typeof about.content === 'string' ? about.content : '',
      },
      contact: {
        enabled: contact.enabled !== false,
        title: typeof contact.title === 'string' ? contact.title : 'Contáctame',
        showMap: contact.showMap === true,
      },
    },
    chat: {
      enabled: chat.enabled !== false,
      welcomeMessage:
        typeof chat.welcomeMessage === 'string' && chat.welcomeMessage.trim()
          ? chat.welcomeMessage.trim()
          : DEFAULT_CHAT_WELCOME,
    },
  };
}
