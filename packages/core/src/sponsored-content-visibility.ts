import type * as admin from 'firebase-admin';
import { hasAdCreativeMedia } from './ad-creative';

export const PUBLICLY_VISIBLE_SPONSORED_STATUSES = ['active', 'approved'] as const;

export type PublicSponsoredStatus = (typeof PUBLICLY_VISIBLE_SPONSORED_STATUSES)[number];

export function parseSponsoredContentDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as admin.firestore.Timestamp).toDate === 'function'
  ) {
    return (value as admin.firestore.Timestamp).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

export function isSponsoredContentPubliclyVisible(
  item: {
    status?: string;
    startDate?: unknown;
    endDate?: unknown;
    imageUrl?: string;
    image?: string;
    images?: unknown;
    videoUrl?: string;
    video?: string;
    videos?: unknown;
    mediaType?: string;
  },
  now: Date = new Date()
): boolean {
  const status = String(item.status || '');
  if (!PUBLICLY_VISIBLE_SPONSORED_STATUSES.includes(status as PublicSponsoredStatus)) {
    return false;
  }

  const start = parseSponsoredContentDate(item.startDate);
  const end = parseSponsoredContentDate(item.endDate);
  if (start && start > now) return false;
  if (end && end < now) return false;

  if (!hasAdCreativeMedia(item)) return false;

  return true;
}

export function filterPublicSponsoredContent<T extends {
  status?: string;
  startDate?: unknown;
  endDate?: unknown;
  imageUrl?: string;
  image?: string;
  images?: unknown;
  videoUrl?: string;
  video?: string;
  videos?: unknown;
  mediaType?: string;
}>(items: T[], now: Date = new Date()): T[] {
  return items.filter((item) => isSponsoredContentPubliclyVisible(item, now));
}
