// Bundle del voice-bridge con esbuild (mismo patrón que functions/build-webhooks.js).
// Compila src/server.ts + todos los packages @autodealers desde fuente a un solo dist/server.js.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const serviceDir = __dirname;
const repoRoot = path.resolve(serviceDir, '../..');
const entry = path.join(serviceDir, 'src', 'server.ts');
const outfile = path.join(serviceDir, 'dist', 'server.js');

const external = ['firebase-admin', 'firebase-admin/*', 'ws', 'stripe', 'openai', 'openai/*'];

// core dist está incompleto; bundlear desde fuente. voice apunta al dist compilado.
const aliases = [
  `@autodealers/core=${path.join(repoRoot, 'packages/core/src/index.ts')}`,
  `@autodealers/voice=${path.join(repoRoot, 'packages/voice/dist/index.js')}`,
];

fs.mkdirSync(path.dirname(outfile), { recursive: true });

const cmd = [
  'npx',
  '--yes',
  'esbuild',
  entry,
  '--bundle',
  '--platform=node',
  '--format=cjs',
  '--target=node20',
  `--outfile=${outfile}`,
  ...external.map((pkg) => `--external:${pkg}`),
  ...aliases.map((a) => `--alias:${a}`),
].join(' ');

execSync(cmd, { cwd: repoRoot, stdio: 'inherit', shell: true });
console.log('✅ voice-bridge bundle listo en dist/server.js');
