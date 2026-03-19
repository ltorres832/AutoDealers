# Script para crear usuarios usando Firebase CLI directamente
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREAR USUARIOS EN FIREBASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Firebase CLI
$firebaseCheck = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCheck) {
    Write-Host "[ERROR] Firebase CLI no encontrado" -ForegroundColor Red
    Write-Host "Instala Firebase CLI: npm install -g firebase-tools" -ForegroundColor Yellow
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
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para crear los usuarios, tienes 2 opciones:" -ForegroundColor Yellow
Write-Host ""
Write-Host "OPCIÓN 1: Manualmente en Firebase Console (RECOMENDADO)" -ForegroundColor Green
Write-Host "  1. Ve a: https://console.firebase.google.com/project/autodealers-7f62e/authentication/users" -ForegroundColor White
Write-Host "  2. Haz clic en 'Add user' y crea cada usuario:" -ForegroundColor White
Write-Host ""
Write-Host "     Admin:      admin@autodealers.test / Admin123!" -ForegroundColor Cyan
Write-Host "     Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor Cyan
Write-Host "     Seller:     seller@autodealers.test / Seller123!" -ForegroundColor Cyan
Write-Host "     Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Luego en Firestore, crea documentos en la colección 'users'" -ForegroundColor White
Write-Host "     con los datos del archivo CREAR_USUARIOS_MANUAL.md" -ForegroundColor White
Write-Host ""
Write-Host "OPCIÓN 2: Usar Cloud Function (requiere deploy)" -ForegroundColor Green
Write-Host "  1. Despliega las Cloud Functions:" -ForegroundColor White
Write-Host "     firebase deploy --only functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Ejecuta la función:" -ForegroundColor White
Write-Host "     firebase functions:call createTestUsers --data '{}'" -ForegroundColor Cyan
Write-Host ""

# Intentar usar el script Node.js si está disponible
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) {
    Write-Host "OPCIÓN 3: Script Node.js (requiere credenciales)" -ForegroundColor Green
    Write-Host "  Ejecuta: cd functions && node crear-usuarios-directo.js" -ForegroundColor Cyan
    Write-Host ""
    
    $useScript = Read-Host "¿Deseas intentar crear usuarios con el script Node.js? (S/N)"
    if ($useScript -eq "S" -or $useScript -eq "s") {
        Write-Host ""
        Write-Host "Ejecutando script..." -ForegroundColor Yellow
        Set-Location "functions"
        node crear-usuarios-directo.js
        Set-Location ".."
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE USUARIOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin:      admin@autodealers.test / Admin123!" -ForegroundColor White
Write-Host "Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor White
Write-Host "Seller:     seller@autodealers.test / Seller123!" -ForegroundColor White
Write-Host "Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor White
Write-Host ""
Write-Host "Una vez creados, puedes iniciar sesión en la app Flutter." -ForegroundColor Green
Write-Host ""


