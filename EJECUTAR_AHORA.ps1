# Script para ejecutar AutoDealers Flutter
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EJECUTANDO AUTODEALERS FLUTTER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar al proyecto
Set-Location "autodealers_flutter"

# Instalar dependencias
Write-Host "[1/4] Instalando dependencias..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Error al instalar dependencias" -ForegroundColor Red
    Set-Location ".."
    pause
    exit 1
}
Write-Host "  [OK] Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# Analizar código
Write-Host "[2/4] Analizando codigo..." -ForegroundColor Yellow
flutter analyze --no-fatal-infos 2>&1 | Out-Null
Write-Host "  [OK] Analisis completado" -ForegroundColor Green
Write-Host ""

# Verificar dispositivos
Write-Host "[3/4] Dispositivos disponibles:" -ForegroundColor Yellow
flutter devices
Write-Host ""

# Ejecutar aplicación
Write-Host "[4/4] Ejecutando aplicacion Flutter Web..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  La aplicacion se abrira en Chrome" -ForegroundColor Cyan
Write-Host "  Presiona 'q' para detener" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Compilando (primera vez puede tardar 2-5 minutos)..." -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome

# Volver al directorio raiz
Set-Location ".."


