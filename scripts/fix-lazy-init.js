// Script para corregir inicialización lazy en todos los archivos de packages/core/src
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const coreSrcPath = path.join(__dirname, '..', 'packages', 'core', 'src');
const files = glob.sync('**/*.ts', { cwd: coreSrcPath });

const filesToFix = [
  'policies.ts',
  'pdf-generator.ts',
  'document-branding.ts',
  'maintenance.ts',
  'announcements.ts',
  'feature-flags.ts',
  'credentials.ts',
  'sub-users.ts',
  'multi-dealer-access.ts',
  'promotions.ts',
  'pricing-config.ts',
  'referrals.ts',
  'advertisers.ts',
  'advertiser-limits.ts',
  'feature-executor.ts',
  'advertiser-metrics.ts',
  'advertiser-ab-testing.ts',
  'scheduler.ts',
  'social-scheduler.ts',
  'social-ads.ts',
  'ratings.ts',
  'seller-management.ts',
  'ai-config.ts',
  'whatsapp-config.ts',
  'follow-up.ts',
  'post-scheduler.ts',
  'dynamic-features.ts',
  'admin-users.ts',
  'dealer-admin-users.ts',
  'feature-sync.ts',
  'faqs.ts',
  'comments.ts',
  'campaigns.ts',
  'auto-responses.ts',
  'social-integrations.ts',
];

console.log('🔧 Corrigiendo inicialización lazy...\n');

filesToFix.forEach(fileName => {
  const filePath = path.join(coreSrcPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${fileName}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Reemplazar const db = getFirestore(); con función lazy
  if (content.includes('const db = getFirestore();')) {
    // Verificar si ya tiene función getDb
    if (!content.includes('function getDb()')) {
      content = content.replace(
        /const db = getFirestore\(\);/g,
        '// Lazy initialization - solo se inicializa cuando se necesita\nfunction getDb() {\n  return getFirestore();\n}'
      );
      modified = true;
    }
  }
  
  // Reemplazar const auth = getAuth(); con función lazy
  if (content.includes('const auth = getAuth();')) {
    if (!content.includes('function getAuthInstance()')) {
      content = content.replace(
        /const auth = getAuth\(\);/g,
        '// Lazy initialization - solo se inicializa cuando se necesita\nfunction getAuthInstance() {\n  return getAuth();\n}'
      );
      modified = true;
    }
  }
  
  // Reemplazar db. con getDb().
  if (content.includes('function getDb()')) {
    // Solo reemplazar si no está dentro de la función getDb
    content = content.replace(/\bdb\.collection\(/g, 'getDb().collection(');
    content = content.replace(/\bdb\.collectionGroup\(/g, 'getDb().collectionGroup(');
    content = content.replace(/\bdb\.doc\(/g, 'getDb().doc(');
    content = content.replace(/\bdb\.batch\(/g, 'getDb().batch(');
    content = content.replace(/\bdb\.runTransaction\(/g, 'getDb().runTransaction(');
    modified = true;
  }
  
  // Reemplazar auth. con getAuthInstance().
  if (content.includes('function getAuthInstance()')) {
    content = content.replace(/\bauth\./g, 'getAuthInstance().');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Corregido: ${fileName}`);
  } else {
    console.log(`⏭️  Ya corregido o no necesita cambios: ${fileName}`);
  }
});

console.log('\n✅ Corrección completada!\n');


