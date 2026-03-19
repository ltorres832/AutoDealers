# Script para crear usuarios de prueba usando Firebase CLI
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREAR USUARIOS DE PRUEBA" -ForegroundColor Cyan
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
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  USUARIOS QUE SE CREARAN:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Admin App" -ForegroundColor Yellow
Write-Host "   Email: admin@autodealers.test" -ForegroundColor White
Write-Host "   Password: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "2. Dealer App" -ForegroundColor Yellow
Write-Host "   Email: dealer@autodealers.test" -ForegroundColor White
Write-Host "   Password: Dealer123!" -ForegroundColor White
Write-Host ""
Write-Host "3. Seller App" -ForegroundColor Yellow
Write-Host "   Email: seller@autodealers.test" -ForegroundColor White
Write-Host "   Password: Seller123!" -ForegroundColor White
Write-Host ""
Write-Host "4. Advertiser App" -ForegroundColor Yellow
Write-Host "   Email: advertiser@autodealers.test" -ForegroundColor White
Write-Host "   Password: Advertiser123!" -ForegroundColor White
Write-Host ""
Write-Host "5. Public-Web App" -ForegroundColor Yellow
Write-Host "   No requiere login - Acceso público" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "¿Deseas crear estos usuarios? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Creando usuarios..." -ForegroundColor Green
Write-Host ""

# Ejecutar Cloud Function para crear usuarios
Write-Host "[INFO] Ejecutando Cloud Function createTestUsers..." -ForegroundColor Yellow
firebase functions:call createTestUsers --data '{}'

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  USUARIOS CREADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes iniciar sesión en la app Flutter con:" -ForegroundColor Green
Write-Host ""
Write-Host "  flutter run -d chrome" -ForegroundColor Yellow
Write-Host ""
Write-Host "Y usar cualquiera de los usuarios creados arriba." -ForegroundColor Cyan
Write-Host ""


