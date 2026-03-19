# Script para ejecutar la aplicacion Flutter AutoDealers
Write-Host "=== EJECUTANDO PLATAFORMA AUTODEALERS FLUTTER ===" -ForegroundColor Green
Write-Host ""

# Verificar Flutter
$flutterPath = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $flutterPath) {
    Write-Host "[ERROR] Flutter no esta instalado o no esta en el PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor instala Flutter desde:" -ForegroundColor Yellow
    Write-Host "  https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O agrega Flutter al PATH si ya esta instalado." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Flutter encontrado" -ForegroundColor Green
Write-Host ""

# Navegar al directorio Flutter
Set-Location "autodealers_flutter"

if (-not (Test-Path "pubspec.yaml")) {
    Write-Host "[ERROR] No se encontro el proyecto Flutter" -ForegroundColor Red
    exit 1
}

# Obtener dependencias
Write-Host "[INFO] Obteniendo dependencias..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al obtener dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# Verificar dispositivos
Write-Host "[INFO] Dispositivos disponibles:" -ForegroundColor Yellow
flutter devices
Write-Host ""

# Analizar codigo
Write-Host "[INFO] Analizando codigo..." -ForegroundColor Yellow
flutter analyze
Write-Host ""

# Ejecutar aplicacion
Write-Host "[INFO] Iniciando aplicacion Flutter Web..." -ForegroundColor Green
Write-Host ""
Write-Host "La aplicacion se abrira en Chrome automaticamente." -ForegroundColor Cyan
Write-Host "Presiona 'q' para detener la aplicacion." -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome

# Volver al directorio raiz
Set-Location ..


