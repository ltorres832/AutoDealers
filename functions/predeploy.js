const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const functionsDir = __dirname;
const repoRoot = path.resolve(functionsDir, '..');
// Por ahora solo construir public-web (las otras apps se pueden agregar después)
const apps = ['public-web'];

console.log('🔨 Predeploy: Building all Next.js apps...');
console.log(`   Repo root: ${repoRoot}`);
console.log(`   process.cwd(): ${process.cwd()}`);

if (!fs.existsSync(path.join(repoRoot, 'firebase.json'))) {
  console.error(
    '❌ No se encontró firebase.json junto al monorepo. Ejecuta `firebase deploy` desde la raíz del repo (carpeta AutoDealers).'
  );
  process.exit(1);
}

const crmDist = path.join(repoRoot, 'packages', 'crm', 'dist', 'index.js');
if (!fs.existsSync(crmDist)) {
  console.warn(
    '⚠️  No está compilado packages/crm (falta dist). Si el build falla, ejecuta desde la raíz: npm run build:packages'
  );
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* espera breve para liberar bloqueo de archivos en Windows */
  }
}

/**
 * Copia un archivo en Windows a veces falla con UNKNOWN/EPERM (indexador, IDE, antivirus).
 */
function copyFileSafe(src, dest, label = '') {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    try {
      fs.unlinkSync(dest);
    } catch {
      /* ignore */
    }
  }
  const max = 6;
  let lastErr;
  for (let i = 0; i < max; i++) {
    try {
      fs.copyFileSync(src, dest);
      return;
    } catch (e) {
      lastErr = e;
      if (i < max - 1) sleepSync(400);
    }
  }
  try {
    const buf = fs.readFileSync(src);
    fs.writeFileSync(dest, buf);
    return;
  } catch (e2) {
    throw new Error(
      `copyFile falló${label ? ` (${label})` : ''}: ${lastErr?.message || lastErr}. Fallback: ${e2.message || e2}`
    );
  }
}

// Helper function to copy directory
const copyRecursive = (src, dest) => {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (path.basename(src) === 'node_modules') {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    copyFileSafe(src, dest, path.basename(src));
  }
};

function rmNextDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (e) {
    throw new Error(
      `No se pudo borrar ${dir}: ${e.message}. Cierra el IDE/antivirus o borra la carpeta a mano y reintenta.`
    );
  }
}

function runNpmBuild(nextAppDir) {
  const extraNodeOptions = '--max-old-space-size=8192';
  const merged = [process.env.NODE_OPTIONS, extraNodeOptions].filter(Boolean).join(' ').trim();
  const env = { ...process.env, NODE_OPTIONS: merged };
  try {
    execSync('npm run build', {
      cwd: nextAppDir,
      stdio: 'inherit',
      shell: true,
      env,
    });
  } catch (err) {
    const e = err;
    const msg = e?.message || String(e);
    const status = e?.status != null ? ` (exit ${e.status})` : '';
    console.error(`\n❌ npm run build falló en ${nextAppDir}${status}`);
    console.error(`   ${msg}`);
    if (e?.stderr?.length) console.error('   stderr:', e.stderr.toString());
    if (e?.stdout?.length) console.error('   stdout:', e.stdout.toString());
    console.error('\n   Comprueba:');
    console.error('   - Desde la raíz del repo: npm install');
    console.error('   - Si falta dist de paquetes: npm run build:packages');
    console.error('   - Memoria: cierra otras apps o define NODE_OPTIONS=--max-old-space-size=12288');
    throw err;
  }
}

try {
  console.log('\n📦 Building Cloud Functions TypeScript (lib/)...');
  execSync('npm run build', { cwd: functionsDir, stdio: 'inherit', shell: true });

  // Build all apps
  for (const app of apps) {
    const nextAppDir = path.resolve(functionsDir, '..', 'apps', app);
    const nextBuildDir = path.resolve(nextAppDir, '.next');
    const targetDir = path.resolve(functionsDir, app, '.next');

    console.log(`\n📦 Processing ${app}...`);
    console.log(`   App dir: ${nextAppDir}`);
    console.log(`   Target dir: ${targetDir}`);

    if (!fs.existsSync(path.join(nextAppDir, 'package.json'))) {
      throw new Error(`No existe la app: ${nextAppDir}`);
    }

    // Build Next.js
    console.log('   1. Running npm run build...');
    runNpmBuild(nextAppDir);

    // Verify build exists
    if (!fs.existsSync(nextBuildDir)) {
      throw new Error(`Build directory not found: ${nextBuildDir}`);
    }

    // Create target directory structure
    const targetParent = path.dirname(targetDir);
    if (!fs.existsSync(targetParent)) {
      fs.mkdirSync(targetParent, { recursive: true });
    }

    // Remove existing .next in functions if it exists
    if (fs.existsSync(targetDir)) {
      console.log('      Removing existing .next in functions/...');
      rmNextDir(targetDir);
    }

    // Copy .next directory
    console.log('   2. Copying .next directory...');
    copyRecursive(nextBuildDir, targetDir);

    // Copy next.config so Next server can run from functions/<app>
    const configNames = ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts'];
    for (const name of configNames) {
      const src = path.join(nextAppDir, name);
      if (fs.existsSync(src)) {
        copyFileSafe(src, path.join(targetParent, name), name);
        console.log(`      Copied ${name}`);
      }
    }
    const publicDir = path.join(nextAppDir, 'public');
    if (fs.existsSync(publicDir)) {
      const destPublic = path.join(targetParent, 'public');
      if (fs.existsSync(destPublic)) rmNextDir(destPublic);
      copyRecursive(publicDir, destPublic);
      console.log('      Copied public/');
    }
    console.log(`   ✅ ${app} copied successfully!`);
  }

  console.log('\n✅ Predeploy complete! All apps built and copied.');
} catch (error) {
  console.error('❌ Predeploy failed:', error.message);
  process.exit(1);
}
