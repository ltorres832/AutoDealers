export type LabeledSlug = { slug: string; label: string };

export type PublicBusinessService = {
  id: string;
  name: string;
  description?: string;
  priceCents: number | null;
  durationMinutes?: number | null;
  photoUrls?: string[];
  videoUrls?: string[];
  specialtySlugs?: string[];
  vehicleScopeSlugs?: string[];
  specialtyLabels?: LabeledSlug[];
  vehicleScopeLabels?: LabeledSlug[];
  categorySlug?: string;
};

export type PublicAutomotiveBusiness = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  municipality?: string;
  city?: string;
  address?: string;
  phone?: string;
  hours?: string;
  mobileService?: boolean;
  verified?: boolean;
  categorySlug?: string;
  categoryName?: string;
  logoUrl?: string;
  specialtySlugs?: string[];
  vehicleScopeSlugs?: string[];
  specialtyLabels?: LabeledSlug[];
  vehicleScopeLabels?: LabeledSlug[];
};

export function formatServicePrice(priceCents: number | null | undefined): string {
  if (priceCents == null) return 'Cotizar';
  return `$${(Number(priceCents) / 100).toFixed(2)}`;
}

export function formatServiceDuration(minutes: number | null | undefined): string {
  const n = Number(minutes);
  if (!n) return '';
  if (n < 60) return `${n} min`;
  const hours = Math.floor(n / 60);
  const rest = n % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function serviceChipLabels(service: PublicBusinessService, kind: 'specialty' | 'scope'): LabeledSlug[] {
  if (kind === 'specialty') {
    if (service.specialtyLabels?.length) return service.specialtyLabels;
    return (service.specialtySlugs || []).map((slug) => ({ slug, label: slug.replace(/-/g, ' ') }));
  }
  if (service.vehicleScopeLabels?.length) return service.vehicleScopeLabels;
  return (service.vehicleScopeSlugs || []).map((slug) => ({ slug, label: slug.replace(/-/g, ' ') }));
}
