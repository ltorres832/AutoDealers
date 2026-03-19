#!/usr/bin/env node

/**
 * Script para configurar el Root Directory de todos los proyectos de Vercel
 * Ejecuta: node scripts/configure-vercel-root-directory.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apps = [
  { name: 'public-web', rootDir: 'apps/public-web' },
  { name: 'admin', rootDir: 'apps/admin' },
  { name: 'dealer', rootDir: 'apps/dealer' },
  { name: 'seller', rootDir: 'apps/seller' },
  { name: 'advertiser', rootDir: 'apps/advertiser' }
];

console.log('🔧 Configurando Root Directory para todos los proyectos de Vercel...\n');

for (const app of apps) {
  const vercelDir = path.join(__dirname, '..', 'apps', app.name, '.vercel');
  const projectJsonPath = path.join(vercelDir, 'project.json');
  
  if (!fs.existsSync(projectJsonPath)) {
    console.log(`⚠️  ${app.name}: No se encontró .vercel/project.json`);
    continue;
  }
  
  try {
    const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    const projectId = projectData.projectId;
    const orgId = projectData.orgId;
    
    console.log(`📦 ${app.name}:`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Root Directory: ${app.rootDir}`);
    
    // Usar la API de Vercel para actualizar el root directory
    // Nota: Esto requiere un token de Vercel
    try {
      const token = execSync('vercel whoami --token', { encoding: 'utf8' }).trim();
      
      const fetch = require('node-fetch');
      const apiUrl = `https://api.vercel.com/v9/projects/${projectId}`;
      
      fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rootDirectory: app.rootDir
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.log(`   ❌ Error: ${data.error.message}`);
        } else {
          console.log(`   ✅ Root Directory configurado correctamente`);
        }
      })
      .catch(err => {
        console.log(`   ⚠️  No se pudo actualizar automáticamente.`);
        console.log(`   📝 Configura manualmente en: https://vercel.com/${orgId}/${app.name}/settings/general`);
        console.log(`      Root Directory: ${app.rootDir}`);
      });
      
    } catch (err) {
      console.log(`   ⚠️  No se pudo obtener el token de Vercel.`);
      console.log(`   📝 Configura manualmente en: https://vercel.com/${orgId}/${app.name}/settings/general`);
      console.log(`      Root Directory: ${app.rootDir}\n`);
    }
    
  } catch (err) {
    console.log(`   ❌ Error leyendo proyecto: ${err.message}\n`);
  }
}

console.log('\n✅ Proceso completado.');
console.log('\n📝 Si algún proyecto no se actualizó automáticamente,');
console.log('   ve al Dashboard de Vercel y configura el Root Directory manualmente.');
