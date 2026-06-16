export type AdLinkType =
  | 'external'
  | 'landing_page'
  | 'marketplace'
  | 'inventory'
  | 'contact'
  | 'none';

export const AD_LINK_TYPE_OPTIONS: {
  value: AdLinkType;
  label: string;
  description: string;
  requiresUrl: boolean;
  urlOptional?: boolean;
}[] = [
  {
    value: 'external',
    label: 'Enlace externo',
    description: 'Abre tu sitio web u otra URL en una pestaña nueva.',
    requiresUrl: true,
  },
  {
    value: 'landing_page',
    label: 'Mi página / landing',
    description: 'Opcional: URL propia. Si la dejas vacía, usamos el sitio de tu perfil.',
    requiresUrl: false,
    urlOptional: true,
  },
  {
    value: 'marketplace',
    label: 'Inicio del marketplace',
    description: 'Lleva al visitante a la página principal de AutoDealers.',
    requiresUrl: false,
  },
  {
    value: 'inventory',
    label: 'Buscar vehículos',
    description: 'Lleva al buscador / inventario público.',
    requiresUrl: false,
  },
  {
    value: 'contact',
    label: 'Página de contacto',
    description: 'Lleva al formulario de contacto del marketplace.',
    requiresUrl: false,
  },
  {
    value: 'none',
    label: 'Solo visual (sin enlace)',
    description: 'El anuncio se muestra pero no es clicable.',
    requiresUrl: false,
  },
];

export function requiresDestinationUrl(linkType: AdLinkType): boolean {
  return linkType === 'external';
}

export function showsOptionalDestinationUrl(linkType: AdLinkType): boolean {
  return linkType === 'landing_page';
}

export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const DEFAULT_PUBLIC_WEB =
  process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '') ||
  'https://autodealers-7f62e.web.app';

export function resolveAdLinkForSave(params: {
  linkType: AdLinkType;
  linkUrl?: string;
  advertiserWebsite?: string;
  publicWebBase?: string;
}): { linkType: AdLinkType; linkUrl: string } {
  const { linkType, linkUrl = '', advertiserWebsite } = params;
  const base = (params.publicWebBase || DEFAULT_PUBLIC_WEB).replace(/\/$/, '');

  if (linkType === 'none') {
    return { linkType, linkUrl: '' };
  }

  if (linkType === 'external') {
    const normalized = normalizeExternalUrl(linkUrl);
    if (!normalized) {
      throw new Error('Ingresa una URL válida (ej: https://tusitio.com o tusitio.com)');
    }
    return { linkType, linkUrl: normalized };
  }

  if (linkType === 'landing_page') {
    const custom = linkUrl.trim();
    if (custom) {
      const normalized = normalizeExternalUrl(custom);
      if (!normalized) {
        throw new Error('URL de landing no válida');
      }
      return { linkType, linkUrl: normalized };
    }
    const fromProfile = advertiserWebsite?.trim();
    if (fromProfile) {
      const normalized = normalizeExternalUrl(fromProfile);
      if (normalized) return { linkType, linkUrl: normalized };
    }
    return { linkType, linkUrl: `${base}/search` };
  }

  if (linkType === 'marketplace') {
    // `/` en el dominio público reescribe a la web del vendedor por defecto; usar catálogo.
    return { linkType, linkUrl: `${base}/search` };
  }
  if (linkType === 'inventory') {
    return { linkType, linkUrl: `${base}/search` };
  }
  if (linkType === 'contact') {
    return { linkType, linkUrl: `${base}/contacto` };
  }

  return { linkType: 'none', linkUrl: '' };
}

export function parseAdLinkType(raw: unknown): AdLinkType {
  const allowed = AD_LINK_TYPE_OPTIONS.map((o) => o.value);
  if (typeof raw === 'string' && allowed.includes(raw as AdLinkType)) {
    return raw as AdLinkType;
  }
  if (raw === 'landing_page') return 'landing_page';
  return 'external';
}
