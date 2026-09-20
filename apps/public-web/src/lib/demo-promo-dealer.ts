/**
 * Cuenta demo de promoción (concesionario) — separada de /demo-dealer (marketing estático).
 * Acceso solo por enlace directo; no aparece en catálogo público (isDemoAccount).
 */
export const CARIBE_MOTORS_DEMO_PROMO = {
  slug: 'caribe',
  dealerId: 'UA0vfLzy8vUTwBXJCn3lnmsOY712',
  tenantId: '5aqHmomoUxKwsVxGJjnV',
  name: 'Ricardo Colón',
  businessName: 'Caribe Motors PR',
  email: 'demo.dealer@autodealers-online.com',
  password: 'DemoDealer2026!',
  title: 'Concesionario verificado',
} as const;

const REGISTERED_DEMO_PROMO_DEALER_IDS = new Set<string>(
  CARIBE_MOTORS_DEMO_PROMO.dealerId.startsWith('PLACEHOLDER')
    ? []
    : [CARIBE_MOTORS_DEMO_PROMO.dealerId]
);

export function isRegisteredDemoPromoDealer(dealerId: string): boolean {
  return REGISTERED_DEMO_PROMO_DEALER_IDS.has(String(dealerId || '').trim());
}

export function getDemoPromoDealerBySlug(
  slug: string
): typeof CARIBE_MOTORS_DEMO_PROMO | null {
  const normalized = String(slug || '').trim().toLowerCase();
  if (normalized === CARIBE_MOTORS_DEMO_PROMO.slug) {
    return CARIBE_MOTORS_DEMO_PROMO;
  }
  return null;
}
