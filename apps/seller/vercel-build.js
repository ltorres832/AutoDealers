#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../..');
process.chdir(rootDir);

console.log('📦 Instalando dependencias...');
try {
  if (fs.existsSync('package-lock.json')) {
    execSync('npm ci --prefer-offline --no-audit', { stdio: 'inherit' });
  } else {
    execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit' });
  }
} catch (error) {
  console.log('⚠️  npm ci falló, intentando npm install...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit' });
}

console.log('🔨 Construyendo seller...');
process.chdir(path.join(rootDir, 'apps/seller'));
execSync('npm run build', { stdio: 'inherit' });

console.log('✅ Build completado');


