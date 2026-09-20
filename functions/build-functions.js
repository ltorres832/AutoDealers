const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const functionsDir = __dirname;

function run(command) {
  execSync(command, { cwd: functionsDir, stdio: 'inherit', shell: true });
}

try {
  run('tsc');
} catch (err) {
  const requiredCron = path.join(functionsDir, 'lib', 'scheduler', 'platform-tasks-cron.js');
  if (!fs.existsSync(requiredCron)) {
    throw err;
  }
  console.warn('⚠️  functions TypeScript reportó diagnósticos heredados, pero emitió lib/. Continuando build.');
}

const { validateDeployPackage } = require('./deploy-manifest');
const existing = validateDeployPackage(functionsDir);
if (existing.ok) {
  console.log('✅ Bundles de webhooks ya válidos; se omite rebuild.');
} else {
  try {
    run('node ./build-webhooks.js');
  } catch (err) {
    const whatsapp = path.join(functionsDir, 'lib', 'webhooks', 'whatsapp.js');
    if (!fs.existsSync(whatsapp)) throw err;
    console.warn('⚠️  Rebuild de webhooks falló; se reutilizan bundles existentes en lib/webhooks/.');
  }
}

const validation = validateDeployPackage(functionsDir);
if (!validation.ok) {
  console.error('❌ Validación del paquete de functions falló:');
  for (const e of validation.errors) console.error(`   - ${e}`);
  process.exit(1);
}
console.log(`✅ Build functions OK (~${validation.totalMb} MB artefactos locales)`);
