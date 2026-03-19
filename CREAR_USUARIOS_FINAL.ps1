# Script final para crear usuarios en Firebase
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREAR USUARIOS EN FIREBASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Firebase CLI
$firebaseCheck = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCheck) {
    Write-Host "[ERROR] Firebase CLI no encontrado" -ForegroundColor Red
    Write-Host "Instala: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Firebase CLI encontrado" -ForegroundColor Green

# Verificar autenticación
$firebaseUser = firebase login:list 2>&1 | Select-String -Pattern "@"
if (-not $firebaseUser) {
    Write-Host "[INFO] Iniciando login..." -ForegroundColor Yellow
    firebase login
}

Write-Host ""
Write-Host "Creando usuarios..." -ForegroundColor Green
Write-Host ""

# Crear archivo JSON para importar usuarios
$usersJson = @'
{
  "users": [
    {
      "localId": "admin_user",
      "email": "admin@autodealers.test",
      "passwordHash": "",
      "password": "Admin123!",
      "displayName": "Admin Usuario",
      "emailVerified": true
    },
    {
      "localId": "dealer_user",
      "email": "dealer@autodealers.test",
      "passwordHash": "",
      "password": "Dealer123!",
      "displayName": "Dealer Usuario",
      "emailVerified": true
    },
    {
      "localId": "seller_user",
      "email": "seller@autodealers.test",
      "passwordHash": "",
      "password": "Seller123!",
      "displayName": "Seller Usuario",
      "emailVerified": true
    },
    {
      "localId": "advertiser_user",
      "email": "advertiser@autodealers.test",
      "passwordHash": "",
      "password": "Advertiser123!",
      "displayName": "Advertiser Usuario",
      "emailVerified": true
    }
  ]
}
'@

$tempJson = Join-Path $env:TEMP "firebase_users.json"
$usersJson | Out-File -FilePath $tempJson -Encoding UTF8

Write-Host "[INFO] Intentando crear usuarios con script Node.js..." -ForegroundColor Yellow
Write-Host ""

# Intentar con script Node.js
Set-Location "functions"
$nodeOutput = node crear-usuarios-directo.js 2>&1
Set-Location ".."

if ($LASTEXITCODE -eq 0 -and $nodeOutput -match "✅") {
    Write-Host "[OK] Usuarios creados exitosamente con script Node.js" -ForegroundColor Green
    Remove-Item $tempJson -ErrorAction SilentlyContinue
    exit 0
}

Write-Host ""
Write-Host "[INFO] El script automático no funcionó. Usa Firebase Console:" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES MANUALES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abre: https://console.firebase.google.com/project/autodealers-7f62e/authentication/users" -ForegroundColor White
Write-Host ""
Write-Host "2. Haz clic en 'Add user' y crea:" -ForegroundColor White
Write-Host ""
Write-Host "   Admin:      admin@autodealers.test / Admin123!" -ForegroundColor Cyan
Write-Host "   Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor Cyan
Write-Host "   Seller:     seller@autodealers.test / Seller123!" -ForegroundColor Cyan
Write-Host "   Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Luego en Firestore (users collection), crea documentos con:" -ForegroundColor White
Write-Host "   - id: UID del usuario de Auth" -ForegroundColor White
Write-Host "   - email, name, role, tenantId, membershipId, etc." -ForegroundColor White
Write-Host ""
Write-Host "   Ver detalles en: CREAR_USUARIOS_MANUAL.md" -ForegroundColor Yellow
Write-Host ""

Remove-Item $tempJson -ErrorAction SilentlyContinue


