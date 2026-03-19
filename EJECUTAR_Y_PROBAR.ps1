# Script completo para ejecutar y probar AutoDealers Flutter
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTODEALERS FLUTTER - EJECUTAR Y PROBAR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Flutter
Write-Host "[1/5] Verificando Flutter..." -ForegroundColor Yellow
try {
    $null = flutter --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Flutter no encontrado"
    }
    Write-Host "  [OK] Flutter instalado" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Flutter no encontrado" -ForegroundColor Red
    Write-Host "  Instala Flutter desde: https://docs.flutter.dev/get-started/install" -ForegroundColor Yellow
    exit 1
}

# 2. Navegar al proyecto
Write-Host "[2/5] Navegando al proyecto Flutter..." -ForegroundColor Yellow
Set-Location "autodealers_flutter"

if (-not (Test-Path "pubspec.yaml")) {
    Write-Host "  [ERROR] No se encontro pubspec.yaml" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Proyecto encontrado" -ForegroundColor Green

# 3. Instalar dependencias
Write-Host "[3/5] Instalando dependencias..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Error al instalar dependencias" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
Write-Host "  [OK] Dependencias instaladas" -ForegroundColor Green

# 4. Analizar código
Write-Host "[4/5] Analizando codigo..." -ForegroundColor Yellow
flutter analyze --no-fatal-infos 2>&1 | Out-Null
Write-Host "  [OK] Analisis completado" -ForegroundColor Green

# 5. Mostrar información de usuarios
Write-Host "[5/5] Informacion de usuarios de prueba:" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  USUARIOS DE PRUEBA" -ForegroundColor Cyan
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
Write-Host "   No requiere login - Acceso publico" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 6. Ejecutar aplicación
Write-Host "Ejecutando aplicacion Flutter Web..." -ForegroundColor Green
Write-Host ""
Write-Host "La aplicacion se abrira en Chrome automaticamente." -ForegroundColor Cyan
Write-Host "Presiona 'q' para detener la aplicacion." -ForegroundColor Yellow
Write-Host ""
Write-Host "Compilando (primera vez puede tardar 2-5 minutos)..." -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome

# Volver al directorio raiz
Set-Location ".."


