import type { PostContent } from '@autodealers/messaging';

export function pickSocialPlatforms(platforms: unknown): ('facebook' | 'instagram')[] {
  if (!Array.isArray(platforms)) return [];
  return (platforms as string[]).filter(
    (p): p is 'facebook' | 'instagram' => p === 'facebook' || p === 'instagram'
  );
}

export function campaignContentToPostContent(
  contentObj: unknown,
  fallbackDescription: string,
  fallbackName: string
): PostContent {
  const text =
    typeof contentObj === 'object' &&
    contentObj &&
    'text' in contentObj &&
    (contentObj as { text?: unknown }).text != null
      ? String((contentObj as { text?: unknown }).text)
      : String(fallbackDescription || fallbackName || '');
  const firstImage =
    typeof contentObj === 'object' &&
    contentObj &&
    Array.isArray((contentObj as { images?: string[] }).images) &&
    (contentObj as { images?: string[] }).images!.length > 0
      ? String((contentObj as { images?: string[] }).images![0])
      : undefined;
  return { text, imageUrl: firstImage };
}
