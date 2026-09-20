/**
 * Cuenta demo de promoción (Pedro Martínez) — separada de /demo-vendedor (marketing estático).
 * Acceso solo por enlace directo; no aparece en catálogo público.
 */
export const PEDRO_MARTINEZ_DEMO_PROMO = {
  slug: 'pedro',
  sellerId: 'hUX9H3j2toXfvIz8tEtFNzSgiUW2',
  tenantId: 'NPtFzTw3FyQkb6NPQkdj',
  name: 'Pedro Martínez',
  businessName: 'Autos de Pedro',
  email: 'demo.vendedor@autodealers-online.com',
  password: 'DemoPedro2026!',
  title: 'Vendedor certificado',
} as const;

const REGISTERED_DEMO_PROMO_SELLER_IDS = new Set<string>([PEDRO_MARTINEZ_DEMO_PROMO.sellerId]);

/** Acceso directo por ID (p. ej. /promo/vendedor/pedro), no listados de búsqueda. */
export function isRegisteredDemoPromoSeller(sellerId: string): boolean {
  return REGISTERED_DEMO_PROMO_SELLER_IDS.has(String(sellerId || '').trim());
}

export function getDemoPromoSellerBySlug(slug: string): typeof PEDRO_MARTINEZ_DEMO_PROMO | null {
  const normalized = String(slug || '').trim().toLowerCase();
  if (normalized === PEDRO_MARTINEZ_DEMO_PROMO.slug) {
    return PEDRO_MARTINEZ_DEMO_PROMO;
  }
  return null;
}
