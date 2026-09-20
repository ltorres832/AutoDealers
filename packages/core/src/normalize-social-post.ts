import type { PostContent } from '@autodealers/messaging';
import { requirePostImage, resolveMemberProfileImageUrl } from '@autodealers/core';

/**
 * Normaliza contenido de post exigiendo imagen (usa foto de perfil/branding como fallback).
 * Si el post trae solo video (sin imagen), se respeta y no se agrega imagen.
 */
export async function normalizeSocialPostContent(input: {
  content: PostContent;
  tenantId: string;
  userId: string;
  accountType: 'seller' | 'dealer';
}): Promise<PostContent> {
  let imageUrl = input.content.imageUrl?.trim();
  const videoUrl = input.content.videoUrl?.trim();

  if (!imageUrl && videoUrl) {
    return { ...input.content, imageUrl: undefined, videoUrl };
  }

  if (!imageUrl) {
    imageUrl = await resolveMemberProfileImageUrl({
      tenantId: input.tenantId,
      userId: input.userId,
      accountType: input.accountType,
    });
  }
  return requirePostImage({ ...input.content, imageUrl });
}
