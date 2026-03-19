# Script para crear usuarios directamente usando Firebase Admin
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREANDO USUARIOS EN FIREBASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "[ERROR] Node.js no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Node.js encontrado" -ForegroundColor Green
Write-Host ""

# Crear script inline que ejecute directamente
$scriptContent = @'
const admin = require('firebase-admin');
const { execSync } = require('child_process');

console.log('Inicializando Firebase Admin...');

// Intentar usar Application Default Credentials
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'autodealers-7f62e'
    });
  }
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Ejecutando: firebase login');
  try {
    execSync('firebase login --no-localhost', { stdio: 'inherit' });
    admin.initializeApp({ projectId: 'autodealers-7f62e' });
    console.log('✅ Firebase Admin inicializado después de login');
  } catch (e) {
    console.error('❌ No se pudo inicializar Firebase Admin');
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

const users = [
  { email: 'admin@autodealers.test', password: 'Admin123!', role: 'admin', name: 'Admin Usuario', tenantId: null, membershipId: 'admin-membership', membershipType: 'dealer', status: 'active' },
  { email: 'dealer@autodealers.test', password: 'Dealer123!', role: 'dealer', name: 'Dealer Usuario', tenantId: 'test-tenant-1', membershipId: 'dealer-membership', membershipType: 'dealer', status: 'active' },
  { email: 'seller@autodealers.test', password: 'Seller123!', role: 'seller', name: 'Seller Usuario', tenantId: 'test-tenant-1', membershipId: 'seller-membership', membershipType: 'seller', status: 'active' },
  { email: 'advertiser@autodealers.test', password: 'Advertiser123!', role: 'advertiser', name: 'Advertiser Usuario', tenantId: null, membershipId: 'advertiser-membership', membershipType: 'dealer', status: 'active' },
];

async function createUsers() {
  console.log('\n========================================');
  console.log('  CREANDO USUARIOS');
  console.log('========================================\n');
  
  for (const u of users) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(u.email);
        console.log(`⚠️  ${u.email} ya existe`);
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({ email: u.email, password: u.password, displayName: u.name });
          console.log(`✅ ${u.email} creado en Auth`);
        } else throw e;
      }
      
      await db.collection('users').doc(userRecord.uid).set({
        id: userRecord.uid, email: u.email, name: u.name, role: u.role,
        tenantId: u.tenantId, membershipId: u.membershipId, membershipType: u.membershipType, status: u.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      console.log(`✅ ${u.email} (${u.role}) - UID: ${userRecord.uid}`);
    } catch (e) {
      console.error(`❌ Error ${u.email}:`, e.message);
    }
  }
  
  console.log('\n✅ Proceso completado');
}

createUsers().then(() => process.exit(0)).catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
'@

# Guardar y ejecutar
$tempScript = Join-Path $env:TEMP "crear_usuarios_$(Get-Date -Format 'yyyyMMddHHmmss').js"
$scriptContent | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "Ejecutando script..." -ForegroundColor Yellow
Write-Host ""

Set-Location "functions"
node $tempScript
$exitCode = $LASTEXITCODE
Set-Location ".."

Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ✅ USUARIOS CREADOS" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Admin:      admin@autodealers.test / Admin123!" -ForegroundColor White
    Write-Host "Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor White
    Write-Host "Seller:     seller@autodealers.test / Seller123!" -ForegroundColor White
    Write-Host "Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERROR] Hubo un error. Verifica que Firebase CLI esté configurado." -ForegroundColor Red
}


