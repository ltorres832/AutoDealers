import sharp from 'sharp';
import {
  getPlacementPreviewSpec,
  type AdPlacement,
} from '@/lib/ad-placement-preview';

const JPEG_QUALITY = 92;
const WEBP_QUALITY = 90;

export type OptimizeAdImageResult = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
  optimized: boolean;
};

/**
 * Ajusta la imagen al tamaño del placement: escala (también si es pequeña),
 * mantiene la foto completa (sin recortar) y exporta en alta calidad.
 */
export async function optimizeAdImageForPlacement(
  input: Buffer,
  placement: AdPlacement
): Promise<OptimizeAdImageResult> {
  const spec = getPlacementPreviewSpec(placement);
  const targetW = spec.recommendedWidth;
  const targetH = spec.recommendedHeight;

  const meta = await sharp(input).metadata();
  const hasAlpha = meta.hasAlpha === true;

  const pipeline = sharp(input)
    .rotate()
    .resize({
      width: targetW,
      height: targetH,
      fit: 'contain',
      background: hasAlpha
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 15, g: 23, b: 42, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    });

  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  if (hasAlpha && meta.format === 'png') {
    buffer = await pipeline.png({ compressionLevel: 6, effort: 7 }).toBuffer();
    contentType = 'image/png';
    extension = '.png';
  } else if (meta.format === 'webp') {
    buffer = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
    contentType = 'image/webp';
    extension = '.webp';
  } else {
    buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    contentType = 'image/jpeg';
    extension = '.jpg';
  }

  const outMeta = await sharp(buffer).metadata();

  return {
    buffer,
    contentType,
    extension,
    width: outMeta.width ?? targetW,
    height: outMeta.height ?? targetH,
    optimized: true,
  };
}
