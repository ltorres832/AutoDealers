// Prueba local del filtergraph del video slideshow (mismos parámetros que
// packages/core/src/vehicle-slideshow-video.ts). Genera imágenes de prueba y renderiza.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ffmpeg = require('ffmpeg-static');

const CLIP_SECONDS = 3;
const FADE_SECONDS = 0.5;
const FPS = 30;
const OUT_WIDTH = 1280;
const OUT_HEIGHT = 720;

function buildFilterGraph(photoCount) {
  const clipFrames = CLIP_SECONDS * FPS;
  const parts = [];
  for (let i = 0; i < photoCount; i++) {
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

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-test-'));
console.log('Directorio de trabajo:', workDir);

// Generar 3 imágenes de prueba de distintos colores y tamaños (simulan fotos reales)
const colors = ['red', 'blue', 'green'];
const sizes = ['1600x1200', '1920x1080', '1200x1600'];
const images = [];
for (let i = 0; i < 3; i++) {
  const img = path.join(workDir, `photo-${i}.jpg`);
  const r = spawnSync(ffmpeg, [
    '-f', 'lavfi', '-i', `color=c=${colors[i]}:s=${sizes[i]}:d=1`,
    '-frames:v', '1', '-y', img,
  ], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('ERROR generando imagen:', r.stderr.slice(-800));
    process.exit(1);
  }
  images.push(img);
}
console.log('Imágenes de prueba creadas:', images.length);

const output = path.join(workDir, 'slideshow.mp4');
const inputArgs = images.flatMap((f) => ['-i', f]);
const filterGraph = buildFilterGraph(images.length);

console.log('Renderizando video...');
const start = Date.now();
const result = spawnSync(ffmpeg, [
  ...inputArgs,
  '-filter_complex', filterGraph,
  '-map', '[vout]',
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-crf', '23',
  '-movflags', '+faststart',
  '-y', output,
], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

if (result.status !== 0) {
  console.error('FALLO ffmpeg:');
  console.error(result.stderr.slice(-3000));
  process.exit(1);
}

const stats = fs.statSync(output);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`OK: video generado en ${elapsed}s — ${(stats.size / 1024).toFixed(0)} KB`);
console.log('Salida:', output);
