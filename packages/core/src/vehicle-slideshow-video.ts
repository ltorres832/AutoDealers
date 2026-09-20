// Genera un video promocional (slideshow con efecto Ken Burns) a partir de las fotos del vehículo.

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';
import { uploadFile } from './storage';

const CLIP_SECONDS = 3;
const FADE_SECONDS = 0.5;
const FPS = 30;
const OUT_WIDTH = 1280;
const OUT_HEIGHT = 720;
const FFMPEG_TIMEOUT_MS = 180_000;

export interface GenerateVehicleVideoResult {
  videoUrl: string;
  photosUsed: number;
  durationSeconds: number;
}

/**
 * Resuelve el binario de ffmpeg del paquete `ffmpeg-static`.
 * Se resuelve con nombre dinámico para que Next no lo trace en apps que no lo usan.
 */
function resolveFfmpegPath(): string {
  const moduleName = ['ffmpeg', 'static'].join('-');
  let resolved: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    resolved = require(moduleName);
  } catch {
    throw new Error(
      'ffmpeg-static no está instalado. Agrega "ffmpeg-static" a las dependencias de la app.'
    );
  }
  const ffmpegPath =
    typeof resolved === 'string'
      ? resolved
      : (resolved as { default?: string } | null)?.default;
  if (!ffmpegPath) {
    throw new Error('No se pudo resolver la ruta del binario de ffmpeg.');
  }
  return ffmpegPath;
}

async function downloadPhoto(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1024) return false;
    await fs.writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Filtergraph: cada foto se escala/recorta a 720p, recibe zoom suave (Ken Burns)
 * y se encadena con transiciones de fundido (xfade).
 */
function buildFilterGraph(photoCount: number): string {
  const clipFrames = CLIP_SECONDS * FPS;
  const parts: string[] = [];

  for (let i = 0; i < photoCount; i++) {
    // Alternar zoom-in centrado y zoom-out para variedad visual
    const zoomExpr =
      i % 2 === 0
        ? `min(zoom+0.0012,1.12)`
        : `if(eq(on,1),1.12,max(zoom-0.0012,1.0))`;
    parts.push(
      `[${i}:v]scale=${OUT_WIDTH * 2}:${OUT_HEIGHT * 2}:force_original_aspect_ratio=increase,` +
        `crop=${OUT_WIDTH * 2}:${OUT_HEIGHT * 2},` +
        `zoompan=z='${zoomExpr}':d=${clipFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${OUT_WIDTH}x${OUT_HEIGHT}:fps=${FPS},` +
        `format=yuv420p,setsar=1[v${i}]`
    );
  }

  if (photoCount === 1) {
    parts.push(`[v0]copy[vout]`);
    return parts.join(';');
  }

  let prevLabel = 'v0';
  for (let i = 1; i < photoCount; i++) {
    const offset = (i * (CLIP_SECONDS - FADE_SECONDS)).toFixed(2);
    const outLabel = i === photoCount - 1 ? 'vout' : `x${i}`;
    parts.push(
      `[${prevLabel}][v${i}]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${offset}[${outLabel}]`
    );
    prevLabel = outLabel;
  }

  return parts.join(';');
}

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-10_000);
    });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ffmpeg excedió el tiempo máximo de renderizado.'));
    }, FFMPEG_TIMEOUT_MS);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg terminó con código ${code}: ${stderr.slice(-1500)}`));
    });
  });
}

/**
 * Genera el video slideshow del vehículo, lo sube a Storage y lo guarda en el
 * documento del vehículo (`videos[0]` + `generatedVideoUrl`).
 */
export async function generateVehicleSlideshowVideo(input: {
  tenantId: string;
  vehicleId: string;
  maxPhotos?: number;
}): Promise<GenerateVehicleVideoResult> {
  const { tenantId, vehicleId } = input;
  const maxPhotos = Math.min(Math.max(input.maxPhotos ?? 6, 2), 10);

  const db = getFirestore();
  const vehicleRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles')
    .doc(vehicleId);

  const vehicleSnap = await vehicleRef.get();
  if (!vehicleSnap.exists) {
    throw new Error('Vehículo no encontrado');
  }
  const vehicle = vehicleSnap.data() as {
    photos?: string[];
    videos?: string[];
    generatedVideoUrl?: string;
  };

  const photoUrls = (vehicle.photos || [])
    .filter((p): p is string => typeof p === 'string' && /^https?:\/\//.test(p))
    .slice(0, maxPhotos);

  if (photoUrls.length < 2) {
    throw new Error('El vehículo necesita al menos 2 fotos para generar un video.');
  }

  const ffmpegPath = resolveFfmpegPath();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vehicle-video-'));

  try {
    const downloaded: string[] = [];
    for (let i = 0; i < photoUrls.length; i++) {
      const dest = path.join(workDir, `photo-${i}.jpg`);
      if (await downloadPhoto(photoUrls[i], dest)) {
        downloaded.push(dest);
      }
    }

    if (downloaded.length < 2) {
      throw new Error('No se pudieron descargar suficientes fotos del vehículo.');
    }

    const outputPath = path.join(workDir, 'slideshow.mp4');
    const inputArgs = downloaded.flatMap((file) => ['-i', file]);
    const filterGraph = buildFilterGraph(downloaded.length);

    await runFfmpeg(ffmpegPath, [
      ...inputArgs,
      '-filter_complex',
      filterGraph,
      '-map',
      '[vout]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ]);

    const videoBuffer = await fs.readFile(outputPath);
    const videoUrl = await uploadFile(
      tenantId,
      videoBuffer,
      `vehicle-${vehicleId}.mp4`,
      'video/mp4',
      'vehicle-videos'
    );

    // Reemplazar el video generado anterior (si existía) y dejar el nuevo primero
    const previousGenerated = vehicle.generatedVideoUrl;
    const otherVideos = (vehicle.videos || []).filter(
      (v) => typeof v === 'string' && v !== previousGenerated
    );

    await vehicleRef.update({
      videos: [videoUrl, ...otherVideos],
      generatedVideoUrl: videoUrl,
      generatedVideoAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const durationSeconds =
      downloaded.length * CLIP_SECONDS - (downloaded.length - 1) * FADE_SECONDS;

    return {
      videoUrl,
      photosUsed: downloaded.length,
      durationSeconds,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
