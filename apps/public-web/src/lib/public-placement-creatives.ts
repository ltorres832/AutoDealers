import {
  getAdCreativeImages,
  getAdCreativeVideo,
  hasAdCreativeMedia,
} from '@autodealers/core/ad-creative';

export type PublicPlacementId =
  | 'hero'
  | 'sidebar'
  | 'sponsors_section'
  | 'between_content'
  | 'vehicle_page'
  | 'promotions_section';

export type PublicPlacementCreative = {
  id: string;
  kind: 'sponsored' | 'banner' | 'promo';
  title: string;
  description: string;
  imageUrl: string;
  images: string[];
  videoUrl: string;
  videos?: string[];
  mediaType?: string;
  animation?: string;
  linkType?: string;
  linkUrl?: string;
  placement?: string;
  tenantId?: string;
  discount?: { type: string; value: number };
};

function asRecord(item: unknown): Record<string, unknown> {
  return item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
}

function str(item: Record<string, unknown>, key: string): string {
  const value = item[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function resolvePublicBannerHref(item: Record<string, unknown>): string {
  const linkType = str(item, 'linkType');
  const linkValue = str(item, 'linkValue') || str(item, 'linkUrl');
  const tenantId = str(item, 'tenantId');
  if (linkType === 'url' || linkType === 'external' || linkType === 'landing_page') {
    return linkValue;
  }
  if (linkType === 'vehicle' && linkValue) {
    return tenantId ? `/${tenantId}/vehicle/${linkValue}` : `/vehicle/${linkValue}`;
  }
  if ((linkType === 'dealer' || linkType === 'seller') && linkValue) {
    return `/${linkValue}`;
  }
  if (linkType === 'filter' && linkValue) {
    try {
      const parsed = JSON.parse(linkValue) as Record<string, unknown>;
      const params = new URLSearchParams();
      Object.entries(parsed).forEach(([key, value]) => {
        if (value != null && String(value).trim()) params.set(key, String(value));
      });
      const qs = params.toString();
      return qs ? `/search?${qs}` : '/search';
    } catch {
      return '/search';
    }
  }
  return linkValue;
}

export function normalizePublicCreative(
  item: unknown,
  kind: PublicPlacementCreative['kind'],
  options?: { allowWithoutMedia?: boolean }
): PublicPlacementCreative | null {
  const raw = asRecord(item);
  const id = str(raw, 'id');
  const title = str(raw, 'title') || str(raw, 'name') || 'Promoción';
  const description = str(raw, 'description');
  const hasMedia = hasAdCreativeMedia(raw);
  if (!id) return null;
  if (!hasMedia && !options?.allowWithoutMedia) return null;
  if (!hasMedia && !title && !description) return null;
  const images = getAdCreativeImages(raw);
  const videoUrl = getAdCreativeVideo(raw);
  const linkUrl =
    kind === 'banner'
      ? resolvePublicBannerHref(raw)
      : str(raw, 'linkUrl') ||
        (str(raw, 'vehicleId') && str(raw, 'tenantId')
          ? `/${str(raw, 'tenantId')}/vehicle/${str(raw, 'vehicleId')}`
          : str(raw, 'tenantId')
            ? `/${str(raw, 'tenantId')}`
            : '');
  const discountRaw = raw.discount;
  const discount =
    discountRaw && typeof discountRaw === 'object'
      ? {
          type: String((discountRaw as { type?: unknown }).type || ''),
          value: Number((discountRaw as { value?: unknown }).value || 0),
        }
      : undefined;

  return {
    id,
    kind,
    title: title || 'Promoción',
    description,
    imageUrl: images[0] || str(raw, 'imageUrl'),
    images,
    videoUrl,
    videos: Array.isArray(raw.videos) ? (raw.videos as string[]) : undefined,
    mediaType: str(raw, 'mediaType') || (videoUrl && images.length === 0 ? 'video' : hasMedia ? 'image' : ''),
    animation: str(raw, 'animation') || 'fade',
    linkType: linkUrl ? 'external' : 'none',
    linkUrl,
    placement: str(raw, 'placement'),
    tenantId: str(raw, 'tenantId'),
    discount: discount && discount.value > 0 ? discount : undefined,
  };
}

export function clickEndpointForCreative(item: { id: string; kind: PublicPlacementCreative['kind'] }): string {
  if (item.kind === 'promo') return `/api/public/promotions/${item.id}/click`;
  if (item.kind === 'banner') return `/api/public/banners/${item.id}/click`;
  return `/api/public/sponsored-content/${item.id}/click`;
}

export function mergePublicCreatives(
  groups: Array<{
    items: unknown[];
    kind: PublicPlacementCreative['kind'];
    allowWithoutMedia?: boolean;
  }>,
  limit: number
): PublicPlacementCreative[] {
  const seen = new Set<string>();
  const merged: PublicPlacementCreative[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const normalized = normalizePublicCreative(item, group.kind, {
        allowWithoutMedia: group.allowWithoutMedia,
      });
      if (!normalized || seen.has(normalized.id)) continue;
      seen.add(normalized.id);
      merged.push(normalized);
    }
  }
  return merged.slice(0, Math.max(limit, 0));
}
