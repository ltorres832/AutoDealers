/**
 * TikTok / YouTube organic publish (OAuth + video).
 * Mantener en false hasta que las apps estén auditadas/configuradas al 100%.
 * Cuando esté listo: poner true y redesplegar dealer + admin.
 */
export const ENABLE_TIKTOK_YOUTUBE_PUBLISH = false;

export type VideoSocialPlatform = 'tiktok' | 'youtube';

export function isTikTokYouTubePublishEnabled(): boolean {
  return ENABLE_TIKTOK_YOUTUBE_PUBLISH === true;
}
