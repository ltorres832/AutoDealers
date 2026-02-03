/**
 * Prepara carpetas de hosting para Firebase con index.html + _next/static.
 * Next.js no pone index.html en .next/static; este script lo genera y copia los estáticos.
 *
 * Uso: node scripts/prepare-hosting.js
 * Requiere: que cada app tenga ya hecho "npm run build" (existir apps/NOMBRE_APP/.next)
 */

const fs = require('fs');
const path = require('path');

const APPS = ['public-web', 'admin', 'dealer', 'seller', 'advertiser'];
const ROOT = path.resolve(__dirname, '..');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (path.basename(src) === 'node_modules') return;
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function prepareApp(appName) {
  const appDir = path.join(ROOT, 'apps', appName);
  const nextDir = path.join(appDir, '.next');
  const staticDir = path.join(nextDir, 'static');
  const manifestPath = path.join(nextDir, 'build-manifest.json');
  const hostingDir = path.join(appDir, 'hosting');

  if (!fs.existsSync(staticDir)) {
    console.warn(`  ⚠ ${appName}: .next/static no existe. Ejecuta "npm run build" en apps/${appName} primero.`);
    return false;
  }

  fs.mkdirSync(hostingDir, { recursive: true });

  // Copiar .next/static → hosting/_next/static
  const targetStatic = path.join(hostingDir, '_next', 'static');
  if (fs.existsSync(targetStatic)) fs.rmSync(path.join(hostingDir, '_next'), { recursive: true });
  fs.mkdirSync(path.dirname(targetStatic), { recursive: true });
  copyRecursive(staticDir, targetStatic);
  console.log(`  ✓ ${appName}: _next/static copiado`);

  // Leer build-manifest para script tags
  let scriptPaths = [];
  let cssPath = null;

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const base = '/_next/';
    scriptPaths = [
      ...(manifest.polyfillFiles || []),
      ...(manifest.rootMainFiles || []),
      ...(manifest.lowPriorityFiles || []),
    ].map((p) => base + p);
  }

  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const files = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
    if (files.length) cssPath = `/_next/static/css/${files[0]}`;
  }

  const title = appName === 'public-web' ? 'AutoDealers' : `AutoDealers - ${appName}`;
  // Sin defer en los últimos scripts para que Next arranque en orden (polyfills y main)
  const scriptTags = scriptPaths.map((s) => `  <script src="${s}"></script>`).join('\n');
  const linkTag = cssPath ? `  <link rel="stylesheet" href="${cssPath}">` : '';

  // buildId para __NEXT_DATA__ (Next.js lo usa para cache/hidratación)
  let buildId = '';
  const buildIdPath = path.join(nextDir, 'BUILD_ID');
  if (fs.existsSync(buildIdPath)) {
    buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
  }
  const nextData = buildId
    ? `  <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}},"page":"/","query":{},"buildId":"${buildId}"}</script>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
${linkTag}
  <style>
    #__next { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f3f4f6; }
    .load-msg { font-family: system-ui,sans-serif; color: #374151; }
    .load-spin { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="__next">
    <div class="load-msg"><div class="load-spin"></div><div>Cargando...</div></div>
  </div>
${nextData}
${scriptTags}
  <noscript><p style="padding:2rem;text-align:center;">Habilita JavaScript para usar la aplicación.</p></noscript>
</body>
</html>
`;

  fs.writeFileSync(path.join(hostingDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(hostingDir, '404.html'), html, 'utf8');
  console.log(`  ✓ ${appName}: index.html y 404.html generados`);
  return true;
}

console.log('Preparando carpetas de hosting (index.html + _next/static)...\n');
let ok = 0;
for (const app of APPS) {
  if (prepareApp(app)) ok++;
}
console.log(`\nListo: ${ok}/${APPS.length} apps. Directorios: apps/<app>/hosting`);
console.log('Actualiza firebase.json "public" a apps/<app>/hosting y vuelve a desplegar.');
