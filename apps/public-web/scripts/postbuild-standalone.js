#!/usr/bin/env node
/**
 * Postbuild: copia .next/static y public/ al output standalone
 * Next.js no los incluye por defecto y el server los necesita
 */
const fs = require('fs');
const path = require('path');

const appDir = __dirname.replace(/[/\\]scripts$/, '');
const standaloneRoot = path.join(appDir, '.next', 'standalone');
const standaloneDir = path.join(standaloneRoot, 'apps', 'public-web');
const staticSrc = path.join(appDir, '.next', 'static');
const staticDst = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(appDir, 'public');
const publicDst = path.join(standaloneDir, 'public');

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const dstPath = path.join(dst, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

try {
  // Entrypoint en la raíz de .next/standalone (CWD en App Hosting = apps/public-web)
  const innerServer = path.join(standaloneDir, 'server.js');
  const rootEntry = path.join(standaloneRoot, 'server.js');
  if (fs.existsSync(innerServer)) {
    fs.writeFileSync(
      rootEntry,
      "'use strict';\nrequire('./apps/public-web/server.js');\n",
      'utf8'
    );
    console.log('OK postbuild: .next/standalone/server.js -> apps/public-web/server.js');
  } else {
    console.warn(
      'WARN postbuild: no se encontro server anidado en',
      innerServer,
      'standaloneRoot existe:',
      fs.existsSync(standaloneRoot)
    );
  }

  if (fs.existsSync(staticSrc)) {
    copyRecursive(staticSrc, staticDst);
    console.log('✅ Copiado .next/static a standalone');
  }
  if (fs.existsSync(publicSrc)) {
    copyRecursive(publicSrc, publicDst);
    console.log('✅ Copiado public/ a standalone');
  }
} catch (err) {
  console.error('❌ Error en postbuild:', err.message);
  process.exit(1);
}
