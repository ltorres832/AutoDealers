/** Máximo de videos promocionales en catálogo público (vendedor o dealer). */
export const MAX_PUBLIC_PROMO_VIDEOS = 12;

/**
 * Normaliza URLs de video desde array, string único o campo legacy.
 */
export function normalizePromoVideoUrls(
  urls: unknown,
  legacySingle?: unknown
): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (!out.includes(t)) out.push(t);
  };

  if (Array.isArray(urls)) {
    for (const u of urls) {
      if (typeof u === 'string') push(u);
    }
  } else if (typeof urls === 'string') {
    push(urls);
  }

  if (typeof legacySingle === 'string') {
    push(legacySingle);
  }

  return out.slice(0, MAX_PUBLIC_PROMO_VIDEOS);
}

export function resolvePromoVideoUrlsFromBody(body: Record<string, unknown>): string[] {
  if (body.publicPromoVideoUrls !== undefined || body.promoVideoUrls !== undefined) {
    const list = body.publicPromoVideoUrls ?? body.promoVideoUrls;
    return normalizePromoVideoUrls(list, body.publicPromoVideoUrl ?? body.promoVideoUrl);
  }
  if (body.publicPromoVideoUrl !== undefined || body.promoVideoUrl !== undefined) {
    return normalizePromoVideoUrls(body.publicPromoVideoUrl ?? body.promoVideoUrl);
  }
  return [];
}

/** Campos Firestore para vendedor (users). */
export function sellerPromoVideoFields(urls: string[]): {
  publicPromoVideoUrls: string[];
  publicPromoVideoUrl: string;
} {
  return {
    publicPromoVideoUrls: urls,
    publicPromoVideoUrl: urls[0] || '',
  };
}

/** Campos hero en websiteSettings del dealer. */
export function heroPromoVideoFields(urls: string[]): {
  promoVideoUrls: string[];
  promoVideoUrl: string;
} {
  return {
    promoVideoUrls: urls,
    promoVideoUrl: urls[0] || '',
  };
}
