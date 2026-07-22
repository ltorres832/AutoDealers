const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const functionsDir = __dirname;
const repoRoot = path.resolve(functionsDir, '..');
const webhooks = ['whatsapp', 'facebook', 'instagram', 'twilio-voice', 'twilio-voice-recording'];

const REQUIRED_PACKAGE_ARTIFACTS = [
  path.join(repoRoot, 'packages', 'shared', 'dist', 'platform-sender.js'),
  path.join(repoRoot, 'packages', 'voice', 'dist', 'index.js'),
];

for (const artifact of REQUIRED_PACKAGE_ARTIFACTS) {
  if (!fs.existsSync(artifact)) {
    console.error(
      `❌ Falta ${path.relative(repoRoot, artifact)}. Ejecuta desde la raíz: npm run build:packages`
    );
    process.exit(1);
  }
}

const external = [
  'firebase-admin',
  'firebase-admin/*',
  'firebase-functions',
  'firebase-functions/*',
  'stripe',
  'openai',
  'openai/*',
];

/** @autodealers/core/dist está incompleto; bundlear desde fuente TypeScript. */
/** @autodealers/voice puede faltar del symlink en node_modules; apuntar al dist compilado. */
const aliases = [
  `@autodealers/core=${path.join(repoRoot, 'packages/core/src/index.ts')}`,
  `@autodealers/voice=${path.join(repoRoot, 'packages/voice/dist/index.js')}`,
];

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync retry delay */
  }
}

function unlinkWithRetry(filePath, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      sleep(150 * (i + 1));
    }
  }
}

function bundleWebhook(name) {
  const entry = path.join(functionsDir, 'src', 'webhooks', `${name}.ts`);
  const outfile = path.join(functionsDir, 'lib', 'webhooks', `${name}.js`);
  const tmpOut = `${outfile}.tmp`;

  fs.mkdirSync(path.dirname(outfile), { recursive: true });
  unlinkWithRetry(tmpOut);
  unlinkWithRetry(outfile);

  const cmd = [
    'npx',
    '--yes',
    'esbuild',
    entry,
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--target=node20',
    `--outfile=${tmpOut}`,
    ...external.map((pkg) => `--external:${pkg}`),
    ...aliases.map((a) => `--alias:${a}`),
  ].join(' ');

  console.log(`📦 Bundling webhook ${name}...`);

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync(cmd, { cwd: repoRoot, stdio: 'inherit', shell: true });
      fs.renameSync(tmpOut, outfile);
      return;
    } catch (err) {
      lastErr = err;
      unlinkWithRetry(tmpOut);
      if (attempt < 3) {
        console.warn(`⚠️  Reintentando bundle ${name} (${attempt}/3)...`);
        sleep(250 * attempt);
      }
    }
  }

  throw lastErr;
}

for (const name of webhooks) {
  bundleWebhook(name);
}

console.log('✅ Webhook bundles ready in functions/lib/webhooks/');
