#!/usr/bin/env node
/**
 * Build Next.js standalone, build Docker image, deploy to Google Cloud Run.
 * Firebase Hosting rewrites to these services (sin Vercel).
 *
 * Requisitos:
 *   - npm run build:all (o build de la app concreta) ya ejecutado
 *   - Docker instalado y en PATH
 *   - gcloud CLI instalado y autenticado (gcloud auth login)
 *   - Proyecto Firebase/GCP con Cloud Run API habilitada
 *
 * Uso:
 *   node scripts/deploy-cloudrun.js                    # despliega las 5 apps
 *   node scripts/deploy-cloudrun.js public-web        # solo public-web
 *   node scripts/deploy-cloudrun.js seller admin      # seller y admin
 *
 * Variables de entorno (opcionales):
 *   GCLOUD_PROJECT   - proyecto GCP (por defecto: lee .firebaserc)
 *   CLOUD_RUN_REGION - región (por defecto: us-central1)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..');

const APPS = {
  'public-web': { serviceId: 'public-site', buildScript: 'build:public' },
  'admin': { serviceId: 'admin-panel', buildScript: 'build:admin' },
  'dealer': { serviceId: 'dealer-dashboard', buildScript: 'build:dealer' },
  'seller': { serviceId: 'seller-dashboard', buildScript: 'build:seller' },
  'advertiser': { serviceId: 'advertiser-dashboard', buildScript: 'build:advertiser' },
};

function getProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  const firebaserc = path.join(REPO_ROOT, '.firebaserc');
  if (!fs.existsSync(firebaserc)) throw new Error('No .firebaserc found. Set GCLOUD_PROJECT or run from project root.');
  const json = JSON.parse(fs.readFileSync(firebaserc, 'utf8'));
  return json.projects?.default;
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || REPO_ROOT;
  console.log('[run]', cmd);
  return execSync(cmd, { stdio: 'inherit', cwd, ...opts });
}

function buildApp(appKey) {
  const { buildScript } = APPS[appKey];
  run(`npm run ${buildScript}`, { cwd: REPO_ROOT });
}

function dockerBuildAndPush(appKey, projectId, region) {
  const appPath = path.join(REPO_ROOT, 'apps', appKey);
  const standaloneDir = path.join(appPath, '.next', 'standalone');
  if (!fs.existsSync(standaloneDir)) {
    throw new Error(`Missing ${standaloneDir}. Run build first: npm run ${APPS[appKey].buildScript}`);
  }
  const imageName = `gcr.io/${projectId}/nextjs-${appKey}`;
  run(`docker build -f apps/${appKey}/Dockerfile -t ${imageName} apps/${appKey}`, { cwd: REPO_ROOT });
  run(`docker push ${imageName}`);
}

function deployToCloudRun(appKey, projectId, region) {
  const { serviceId } = APPS[appKey];
  const imageName = `gcr.io/${projectId}/nextjs-${appKey}`;
  run(
    `gcloud run deploy ${serviceId} --image ${imageName} --region ${region} --platform managed --allow-unauthenticated --port 8080 --quiet`,
    { cwd: REPO_ROOT }
  );
}

function main() {
  const requested = process.argv.slice(2);
  const appsToDeploy = requested.length ? requested : Object.keys(APPS);
  const invalid = appsToDeploy.filter((a) => !APPS[a]);
  if (invalid.length) {
    console.error('Apps no válidas:', invalid.join(', '));
    console.error('Válidas:', Object.keys(APPS).join(', '));
    process.exit(1);
  }

  const projectId = getProjectId();
  const region = process.env.CLOUD_RUN_REGION || 'us-central1';
  console.log('Proyecto:', projectId, '| Región:', region);
  console.log('Apps a desplegar:', appsToDeploy.join(', '));

  for (const appKey of appsToDeploy) {
    console.log('\n---', appKey, '---');
    buildApp(appKey);
    dockerBuildAndPush(appKey, projectId, region);
    deployToCloudRun(appKey, projectId, region);
  }

  console.log('\nListo. Actualiza firebase.json con rewrites a Cloud Run y ejecuta: firebase deploy --only hosting');
}

main();
