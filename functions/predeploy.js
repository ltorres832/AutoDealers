const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const functionsDir = __dirname;
const repoRoot = path.resolve(functionsDir, '..');

/** Carpetas legacy de Next.js SSR en functions/ (producción usa App Hosting). */
const LEGACY_NEXT_APP_DIRS = ['public-web', 'admin', 'dealer', 'seller', 'advertiser'];

console.log('🔨 Predeploy: Cloud Functions (lean — sin bundles Next.js)');
console.log(`   Repo root: ${repoRoot}`);

if (!fs.existsSync(path.join(repoRoot, 'firebase.json'))) {
  console.error(
    '❌ No se encontró firebase.json junto al monorepo. Ejecuta `firebase deploy` desde la raíz del repo (carpeta AutoDealers).'
  );
  process.exit(1);
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

const REQUIRED_PACKAGE_ARTIFACTS = [
  path.join('packages', 'shared', 'dist', 'platform-sender.js'),
  path.join('packages', 'voice', 'dist', 'index.js'),
];

function ensurePackagesBuilt() {
  const missing = REQUIRED_PACKAGE_ARTIFACTS.filter(
    (rel) => !fs.existsSync(path.join(repoRoot, rel))
  );
  if (missing.length === 0) return;

  console.log('\n📦 Compilando paquetes del monorepo (necesario para webhooks/crons)...');
  console.log(`   Faltan: ${missing.join(', ')}`);
  execSync('npm run build:packages', {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });
}

function cleanLegacyNextBundles() {
  console.log('\n🧹 Limpiando bundles Next.js legacy en functions/ (no se suben al deploy)...');
  for (const app of LEGACY_NEXT_APP_DIRS) {
    const dir = path.join(functionsDir, app);
    if (!fs.existsSync(dir)) continue;
    rmDir(dir);
    console.log(`   Eliminado functions/${app}/`);
  }

  const strayNext = path.join(functionsDir, '.next');
  if (fs.existsSync(strayNext)) {
    rmDir(strayNext);
    console.log('   Eliminado functions/.next/');
  }
}

const { validateDeployPackage } = require('./deploy-manifest');

try {
  cleanLegacyNextBundles();
  ensurePackagesBuilt();

  console.log('\n📦 Building Cloud Functions TypeScript (lib/) + webhooks...');
  execSync('npm run build', { cwd: functionsDir, stdio: 'inherit', shell: true });

  const validation = validateDeployPackage(functionsDir);
  if (!validation.ok) {
    console.error('\n❌ Paquete de functions incompleto:');
    for (const err of validation.errors) console.error(`   - ${err}`);
    process.exit(1);
  }

  console.log(`\n✅ Predeploy complete — paquete listo (~${validation.totalMb} MB sin node_modules).`);
  console.log(`   Functions: ${validation.deployedFunctions.join(', ')}`);
  console.log('   Apps Next.js: Firebase App Hosting (deploy separado).');
} catch (error) {
  console.error('❌ Predeploy failed:', error.message);
  process.exit(1);
}
