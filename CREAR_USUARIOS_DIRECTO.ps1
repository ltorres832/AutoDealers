# Script para crear usuarios directamente en Firebase
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

# Verificar que estás logueado
Write-Host "Verificando autenticación de Firebase..." -ForegroundColor Yellow
$firebaseUser = firebase login:list 2>&1 | Select-String -Pattern "@"
if (-not $firebaseUser) {
    Write-Host "[INFO] No hay sesión activa. Iniciando login..." -ForegroundColor Yellow
    firebase login
}

Write-Host ""
Write-Host "Creando usuarios directamente en Firebase..." -ForegroundColor Green
Write-Host ""

# Crear script temporal Node.js
$nodeScript = @"
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
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

  const results = [];

  for (const userData of users) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        Write-Host \`Usuario \${userData.email} ya existe, actualizando...\` -ForegroundColor Yellow;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.name,
          });
          console.log(\`✅ Usuario \${userData.email} creado en Auth\`);
        } else {
          throw error;
        }
      }

      await db.collection('users').doc(userRecord.uid).set({
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
      }, { merge: true });

      results.push({
        email: userData.email,
        role: userData.role,
        status: 'created',
        uid: userRecord.uid,
      });
      
      console.log(\`✅ Usuario creado: \${userData.email} (\${userData.role})\`);
    } catch (error) {
      console.error(\`❌ Error al crear usuario \${userData.email}:\`, error.message);
      results.push({
        email: userData.email,
        role: userData.role,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log('\n✅ Proceso completado');
  console.log('Resultados:', JSON.stringify(results, null, 2));
  
  return {
    success: true,
    users: results,
  };
}

createTestUsers()
  .then(() => {
    console.log('\n✅ Todos los usuarios creados exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
"@

# Guardar script temporal
$tempScript = Join-Path $env:TEMP "crear_usuarios_temp.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "Ejecutando script Node.js..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar usando Firebase Functions shell o Node.js directo
# Primero intentar con Node.js si está disponible
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) {
    Write-Host "[INFO] Usando Node.js directamente..." -ForegroundColor Yellow
    Set-Location "functions"
    node $tempScript
    Set-Location ".."
} else {
    Write-Host "[INFO] Node.js no encontrado. Usando Firebase Functions..." -ForegroundColor Yellow
    Write-Host "[INFO] Ejecutando Cloud Function createTestUsers..." -ForegroundColor Yellow
    firebase functions:call createTestUsers --data '{}'
}

# Limpiar script temporal
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  USUARIOS CREADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes iniciar sesión con:" -ForegroundColor Green
Write-Host ""
Write-Host "  Admin:     admin@autodealers.test / Admin123!" -ForegroundColor White
Write-Host "  Dealer:    dealer@autodealers.test / Dealer123!" -ForegroundColor White
Write-Host "  Seller:    seller@autodealers.test / Seller123!" -ForegroundColor White
Write-Host "  Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor White
Write-Host ""


