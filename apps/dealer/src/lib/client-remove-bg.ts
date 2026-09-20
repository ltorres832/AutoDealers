/**
 * Quitar fondo en el navegador (fallback cuando el servidor no tiene REMOVE_BG_API_KEY).
 * Usa @imgly/background-removal vía import dinámico.
 */

import { DYNAMIC_SCENE_PRESETS } from '@autodealers/inventory/client';

function sceneCss(sceneId?: string | null): string {
  const found = DYNAMIC_SCENE_PRESETS.find((s) => s.id === sceneId);
  return found?.css || '#f5f5f5';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para quitar fondo'));
    img.src = url;
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el resultado'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Devuelve un Blob JPEG con el vehículo sobre la escena elegida.
 */
export async function removeBackgroundClient(
  sourceUrl: string,
  sceneId?: string | null
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  const cutoutBlob = await removeBackground(sourceUrl, {
    output: { format: 'image/png', quality: 0.92 },
  });

  const cutoutUrl = await blobToDataUrl(cutoutBlob);
  const cutoutImg = await loadImage(cutoutUrl);
  const width = cutoutImg.naturalWidth || 1600;
  const height = cutoutImg.naturalHeight || 1200;
  const { r, g, b } = hexToRgb(sceneCss(sceneId));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(cutoutImg, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('No se pudo generar la imagen'));
        else resolve(blob);
      },
      'image/jpeg',
      0.95
    );
  });
}
