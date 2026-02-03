export type AdType = 'banner' | 'promotion' | 'sponsor';
export type Placement = 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';

// Precios por tipo + ubicación + duración (días)
export const AD_PRICING: Record<
  AdType,
  Record<Placement, Record<7 | 15 | 30, number>>
> = {
  banner: {
    hero: { 7: 120, 15: 220, 30: 380 },
    sidebar: { 7: 80, 15: 150, 30: 260 },
    sponsors_section: { 7: 70, 15: 130, 30: 220 },
    between_content: { 7: 60, 15: 110, 30: 190 },
  },
  promotion: {
    hero: { 7: 140, 15: 260, 30: 450 },
    sidebar: { 7: 100, 15: 180, 30: 320 },
    sponsors_section: { 7: 90, 15: 160, 30: 280 },
    between_content: { 7: 80, 15: 140, 30: 240 },
  },
  sponsor: {
    hero: { 7: 200, 15: 360, 30: 600 },
    sidebar: { 7: 150, 15: 270, 30: 450 },
    sponsors_section: { 7: 140, 15: 250, 30: 420 },
    between_content: { 7: 120, 15: 220, 30: 360 },
  },
};

export function getAdPrice(
  type: AdType,
  placement: Placement,
  duration: 7 | 15 | 30
): number | null {
  return AD_PRICING[type]?.[placement]?.[duration] ?? null;
}

