/**
 * Quitar fondo (remove.bg o Photoroom) + aplicar escena de color.
 * Conserva el original; solo genera editedUrl.
 * Nota: sharp se carga con import dinámico para no romper builds de apps
 * que no usan este módulo (p. ej. public-web).
 */

import { uploadVehicleImage } from './storage';
import { DYNAMIC_SCENE_PRESETS, type VehiclePhotoSlot } from './inventory-compete-constants';
import { getVehiclePhotoSet, setVehiclePhotoEdited } from './inventory-compete';

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

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function removeBackgroundBuffer(input: Buffer): Promise<Buffer> {
  const removeBgKey = process.env.REMOVE_BG_API_KEY || process.env.REMOVEBG_API_KEY || '';
  const photoroomKey = process.env.PHOTOROOM_API_KEY || '';

  if (removeBgKey) {
    const form = new FormData();
    form.append('size', 'auto');
    form.append('format', 'png');
    form.append('image_file', new Blob([new Uint8Array(input)]), 'photo.jpg');
    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': removeBgKey },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`remove.bg falló (${res.status}): ${text.slice(0, 200)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  if (photoroomKey) {
    const form = new FormData();
    form.append('image_file', new Blob([new Uint8Array(input)]), 'photo.jpg');
    const res = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: { 'x-api-key': photoroomKey },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Photoroom falló (${res.status}): ${text.slice(0, 200)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error(
    'Falta API de quitar fondo. Configura REMOVE_BG_API_KEY o PHOTOROOM_API_KEY en el servidor.'
  );
}

async function compositeOnScene(cutoutPng: Buffer, sceneId?: string | null): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const meta = await sharp(cutoutPng).metadata();
  const width = meta.width || 1600;
  const height = meta.height || 1200;
  const { r, g, b } = hexToRgb(sceneCss(sceneId));
  const background = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r, g, b },
    },
  })
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: cutoutPng, gravity: 'centre' }])
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();
}

export async function removeBackgroundAndApplyScene(input: {
  tenantId: string;
  vehicleId: string;
  angleId: string;
  sceneId?: string | null;
  /** Si se pasa, usa esta URL; si no, usa originalUrl del slot */
  sourceUrl?: string;
}): Promise<{ slots: VehiclePhotoSlot[]; editedUrl: string }> {
  const set = await getVehiclePhotoSet(input.tenantId, input.vehicleId);
  const slot = set.slots.find((s) => s.angleId === input.angleId);
  const sourceUrl = (input.sourceUrl || slot?.originalUrl || '').trim();
  if (!sourceUrl) throw new Error('Primero sube la foto original de ese ángulo');

  const originalBuf = await fetchImageBuffer(sourceUrl);
  const cutout = await removeBackgroundBuffer(originalBuf);
  const composited = await compositeOnScene(cutout, input.sceneId);
  const editedUrl = await uploadVehicleImage(
    input.tenantId,
    input.vehicleId,
    composited,
    `edited-${input.angleId}-${Date.now()}.jpg`,
    'image/jpeg'
  );

  const result = await setVehiclePhotoEdited({
    tenantId: input.tenantId,
    vehicleId: input.vehicleId,
    angleId: input.angleId,
    editedUrl,
    sceneId: input.sceneId || null,
  });

  return { slots: result.slots, editedUrl };
}

export function hasBackgroundRemovalApiConfigured(): boolean {
  return Boolean(
    process.env.REMOVE_BG_API_KEY ||
      process.env.REMOVEBG_API_KEY ||
      process.env.PHOTOROOM_API_KEY
  );
}
