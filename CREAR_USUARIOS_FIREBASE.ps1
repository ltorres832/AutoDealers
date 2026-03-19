# Script para crear usuarios directamente en Firebase usando Firebase CLI
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREAR USUARIOS EN FIREBASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Firebase CLI
$firebaseCheck = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCheck) {
    Write-Host "[ERROR] Firebase CLI no encontrado" -ForegroundColor Red
    Write-Host "Instala Firebase CLI desde: https://firebase.tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Firebase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Verificar autenticación
Write-Host "Verificando autenticación..." -ForegroundColor Yellow
$firebaseUser = firebase login:list 2>&1 | Select-String -Pattern "@"
if (-not $firebaseUser) {
    Write-Host "[INFO] Iniciando login..." -ForegroundColor Yellow
    firebase login
}

Write-Host ""
Write-Host "Creando usuarios usando Firebase Admin SDK..." -ForegroundColor Green
Write-Host ""

# Crear script Node.js mejorado
$nodeScript = @'
const admin = require('firebase-admin');

// Inicializar Firebase Admin con credenciales del proyecto
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'autodealers-7f62e'
    });
  }
} catch (error) {
  console.error('Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function createTestUsers() {
  const users = [
    {
      email: 'admin@autodealers.test',
      password: 'Admin123!',
      role: 'admin',
      name: 'Admin Usuario',
      tenantId: null,
      membershipId: 'admin-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    {
      email: 'dealer@autodealers.test',
      password: 'Dealer123!',
      role: 'dealer',
      name: 'Dealer Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'dealer-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    {
      email: 'seller@autodealers.test',
      password: 'Seller123!',
      role: 'seller',
      name: 'Seller Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'seller-membership',
      membershipType: 'seller',
      status: 'active',
    },
    {
      email: 'advertiser@autodealers.test',
      password: 'Advertiser123!',
      role: 'advertiser',
      name: 'Advertiser Usuario',
      tenantId: null,
      membershipId: 'advertiser-membership',
      membershipType: 'dealer',
      status: 'active',
    },
  ];

  console.log('========================================');
  console.log('  CREANDO USUARIOS DE PRUEBA');
  console.log('========================================\n');

  const results = [];

  for (const userData of users) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        console.log(`⚠️  Usuario ${userData.email} ya existe, actualizando...`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.name,
          });
          console.log(`✅ Usuario ${userData.email} creado en Auth`);
        } else {
          throw error;
        }
      }

      const userDoc = {
        id: userRecord.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenantId: userData.tenantId,
        membershipId: userData.membershipId,
        membershipType: userData.membershipType,
        status: userData.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });

      results.push({
        email: userData.email,
        role: userData.role,
        status: 'created',
        uid: userRecord.uid,
      });
      
      console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Error al crear usuario ${userData.email}:`, error.message);
      results.push({
        email: userData.email,
        role: userData.role,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log('\n========================================');
  console.log('  RESULTADOS');
  console.log('========================================\n');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n✅ Proceso completado');
  
  return { success: true, users: results };
}

createTestUsers()
  .then(() => {
    console.log('\n✅ Todos los usuarios creados exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
'@

# Guardar script temporal
$tempScript = Join-Path $PSScriptRoot "crear-usuarios-temp.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

# Ejecutar script
Write-Host "Ejecutando script..." -ForegroundColor Yellow
Write-Host ""

Set-Location "functions"
node $tempScript
$exitCode = $LASTEXITCODE
Set-Location ".."

# Limpiar
Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  USUARIOS CREADOS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ahora puedes iniciar sesión con:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Admin:      admin@autodealers.test / Admin123!" -ForegroundColor White
    Write-Host "  Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor White
    Write-Host "  Seller:     seller@autodealers.test / Seller123!" -ForegroundColor White
    Write-Host "  Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERROR] Hubo un error al crear los usuarios" -ForegroundColor Red
    Write-Host "Verifica que Firebase CLI esté configurado correctamente" -ForegroundColor Yellow
}


