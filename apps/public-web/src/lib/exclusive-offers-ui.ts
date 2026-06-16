/** Solo UI / cliente. La validación y normalización viven en @autodealers/core (servidor). */

export interface ExclusiveOfferCardConfig {
  title: string;
  description: string;
  badge: string;
  icon: string;
  gradientKey: string;
  buttonLabel: string;
  buttonHref: string;
}

export interface ExclusiveOffersSectionConfigClient {
  enabled: boolean;
  badgeLabel: string;
  title: string;
  subtitle: string;
  cards: ExclusiveOfferCardConfig[];
}

export const EXCLUSIVE_OFFER_GRADIENT_CLASSES: Record<string, string> = {
  blue: 'from-primary-600 to-primary-700',
  emerald: 'from-emerald-500 to-teal-700',
  amber: 'from-amber-500 to-orange-600',
  slate: 'from-slate-700 to-slate-900',
  rose: 'from-rose-500 to-brand-red-bright700',
  violet: 'from-primary-600 to-primary-800',
  cyan: 'from-primary-500 to-primary-700',
};

export function gradientClassForKey(key: string): string {
  return EXCLUSIVE_OFFER_GRADIENT_CLASSES[key] || EXCLUSIVE_OFFER_GRADIENT_CLASSES.slate;
}
