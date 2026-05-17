#!/usr/bin/env node
/**
 * Postbuild: copia .next/static y public/ al output standalone
 * Next.js no los incluye por defecto y el server los necesita
 */
const fs = require('fs');
const path = require('path');

const appDir = __dirname.replace(/[/\\]scripts$/, '');
const repoRoot = path.join(appDir, '..', '..');
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

/**
 * App Hosting solo despliega el standalone; require('firebase-admin') debe resolver aquí.
 * Copia desde el node_modules del monorepo si falta o está incompleto.
 */
function copyNpmPackage(pkgName) {
  const destRoot = path.join(standaloneRoot, 'node_modules');
  const dest = path.join(destRoot, pkgName);
  const candidates = [
    path.join(repoRoot, 'node_modules', pkgName),
    path.join(appDir, 'node_modules', pkgName),
  ];
  const src = candidates.find((p) => fs.existsSync(p));
  if (!src) {
    console.warn('WARN postbuild: no se encontro', pkgName, 'en', candidates.join(' | '));
    return;
  }
  fs.mkdirSync(destRoot, { recursive: true });
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  copyRecursive(src, dest);
  console.log('✅ postbuild: copiado', pkgName, '-> standalone/node_modules');
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

  copyNpmPackage('firebase-admin');
} catch (err) {
  console.error('❌ Error en postbuild:', err.message);
  process.exit(1);
}
