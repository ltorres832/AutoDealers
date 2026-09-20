/** Especificaciones de medios del portal de negocios. El archivo se guarda tal cual (sin recorte ni re-encode). */

export const BUSINESS_PROFILE_PHOTO = {
  recommendedWidth: 400,
  recommendedHeight: 400,
  aspectLabel: '1:1',
  formatsLabel: 'PNG o JPG',
  suggestedMaxMb: 2,
  maxBytes: 8 * 1024 * 1024,
  maxMb: 8,
  accept: 'image/png,image/jpeg,image/jpg,image/webp,image/*',
} as const;

export const BUSINESS_SERVICE_PHOTO = {
  recommended43: '1600×1200 px (4:3)',
  recommended169: '1920×1080 px (16:9)',
  formatsLabel: 'JPG, PNG o WebP',
  suggestedMaxMb: 5,
  maxBytes: 8 * 1024 * 1024,
  maxMb: 8,
  accept: 'image/jpeg,image/jpg,image/png,image/webp,image/*',
} as const;

export const BUSINESS_SERVICE_VIDEO = {
  recommendedWidth: 1920,
  recommendedHeight: 1080,
  aspectLabel: '16:9',
  formatsLabel: 'MP4 o WebM',
  maxBytes: 40 * 1024 * 1024,
  maxMb: 40,
  accept: 'video/mp4,video/webm,video/*',
} as const;

export const BUSINESS_PROFILE_PHOTO_HINT =
  `Tamaño recomendado: ${BUSINESS_PROFILE_PHOTO.recommendedWidth}×${BUSINESS_PROFILE_PHOTO.recommendedHeight} px (cuadrado). ${BUSINESS_PROFILE_PHOTO.formatsLabel}; fondo transparente preferible para logo. Peso sugerido hasta ${BUSINESS_PROFILE_PHOTO.suggestedMaxMb} MB. Máximo ${BUSINESS_PROFILE_PHOTO.maxMb} MB. Se muestra completa, sin recortar; el archivo se guarda a resolución original.`;

export const BUSINESS_SERVICE_PHOTO_HINT =
  `Tamaño recomendado: ${BUSINESS_SERVICE_PHOTO.recommended43} o ${BUSINESS_SERVICE_PHOTO.recommended169}. ${BUSINESS_SERVICE_PHOTO.formatsLabel}. Peso sugerido hasta ${BUSINESS_SERVICE_PHOTO.suggestedMaxMb} MB. Máximo ${BUSINESS_SERVICE_PHOTO.maxMb} MB. Se encaja en el recuadro sin recortar ni perder calidad.`;

export const BUSINESS_SERVICE_VIDEO_HINT =
  `Resolución recomendada: ${BUSINESS_SERVICE_VIDEO.recommendedWidth}×${BUSINESS_SERVICE_VIDEO.recommendedHeight} px (${BUSINESS_SERVICE_VIDEO.aspectLabel}). ${BUSINESS_SERVICE_VIDEO.formatsLabel}. Máximo ${BUSINESS_SERVICE_VIDEO.maxMb} MB. El reproductor muestra el video completo (letterbox), sin recortar.`;

export function businessMediaTooLargeMessage(file: File, maxBytes: number, maxMb: number): string | null {
  if (file.size <= maxBytes) return null;
  return `El archivo no puede superar ${maxMb} MB`;
}
