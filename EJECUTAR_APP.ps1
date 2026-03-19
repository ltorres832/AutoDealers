# Script para ejecutar AutoDealers Flutter
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTODEALERS FLUTTER - EJECUTAR APP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Flutter
Write-Host "[1/6] Verificando Flutter..." -ForegroundColor Yellow
$flutterCheck = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $flutterCheck) {
    Write-Host "  [ERROR] Flutter no encontrado" -ForegroundColor Red
    Write-Host "  Instala Flutter desde: https://docs.flutter.dev/get-started/install" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "  [OK] Flutter encontrado" -ForegroundColor Green
Write-Host ""

# Navegar al proyecto
Write-Host "[2/6] Navegando al proyecto Flutter..." -ForegroundColor Yellow
$flutterDir = Join-Path $PSScriptRoot "autodealers_flutter"
if (-not (Test-Path $flutterDir)) {
    Write-Host "  [ERROR] No se encontro el directorio autodealers_flutter" -ForegroundColor Red
    pause
    exit 1
}
Set-Location $flutterDir
Write-Host "  [OK] Directorio: $flutterDir" -ForegroundColor Green
Write-Host ""

# Verificar pubspec.yaml
if (-not (Test-Path "pubspec.yaml")) {
    Write-Host "  [ERROR] No se encontro pubspec.yaml" -ForegroundColor Red
    pause
    exit 1
}

# Obtener dependencias
Write-Host "[3/6] Instalando dependencias de Flutter..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Error al instalar dependencias" -ForegroundColor Red
    Write-Host "  Revisa los errores arriba" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "  [OK] Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# Analizar código
Write-Host "[4/6] Analizando codigo..." -ForegroundColor Yellow
flutter analyze --no-fatal-infos
Write-Host ""

# Verificar dispositivos
Write-Host "[5/6] Dispositivos disponibles:" -ForegroundColor Yellow
flutter devices
Write-Host ""

# Ejecutar aplicación
Write-Host "[6/6] Iniciando aplicacion Flutter Web..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  La aplicacion se abrira en Chrome" -ForegroundColor Cyan
Write-Host "  Presiona 'q' para detener" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Compilando y ejecutando..." -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome

# Volver al directorio raiz
Set-Location $PSScriptRoot


