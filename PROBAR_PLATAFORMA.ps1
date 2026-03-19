# Script para probar la plataforma AutoDealers Flutter
Write-Host "=== PROBANDO PLATAFORMA AUTODEALERS ===" -ForegroundColor Green
Write-Host ""

# 1. Verificar Flutter
Write-Host "1. Verificando Flutter..." -ForegroundColor Yellow
try {
    $flutterVersion = flutter --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Flutter instalado" -ForegroundColor Green
        Write-Host "  $flutterVersion" -ForegroundColor Cyan
    } else {
        Write-Host "  ❌ Flutter no encontrado" -ForegroundColor Red
        Write-Host "  Instala Flutter desde: https://docs.flutter.dev/get-started/install" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "  ❌ Flutter no encontrado en PATH" -ForegroundColor Red
    Write-Host "  Instala Flutter desde: https://docs.flutter.dev/get-started/install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Verificar Flutter Doctor
Write-Host "2. Verificando configuración de Flutter..." -ForegroundColor Yellow
flutter doctor
Write-Host ""

# 3. Navegar al directorio Flutter
Write-Host "3. Navegando al proyecto Flutter..." -ForegroundColor Yellow
Set-Location "autodealers_flutter"

if (-not (Test-Path "pubspec.yaml")) {
    Write-Host "  ❌ No se encontró pubspec.yaml" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Directorio correcto" -ForegroundColor Green
Write-Host ""

# 4. Obtener dependencias
Write-Host "4. Obteniendo dependencias de Flutter..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Error al obtener dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# 5. Verificar dispositivos disponibles
Write-Host "5. Verificando dispositivos disponibles..." -ForegroundColor Yellow
flutter devices
Write-Host ""

# 6. Analizar código
Write-Host "6. Analizando código..." -ForegroundColor Yellow
flutter analyze
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Sin errores de análisis" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Hay advertencias en el código" -ForegroundColor Yellow
}
Write-Host ""

# 7. Opciones para ejecutar
Write-Host "=== OPCIONES DE EJECUCIÓN ===" -ForegroundColor Green
Write-Host ""
Write-Host "Para ejecutar la aplicación, usa uno de estos comandos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Flutter Web:" -ForegroundColor Yellow
Write-Host "    flutter run -d chrome" -ForegroundColor White
Write-Host ""
Write-Host "  Flutter Web (modo release):" -ForegroundColor Yellow
Write-Host "    flutter run -d chrome --release" -ForegroundColor White
Write-Host ""
Write-Host "  Android (si tienes emulador/dispositivo):" -ForegroundColor Yellow
Write-Host "    flutter run -d android" -ForegroundColor White
Write-Host ""
Write-Host "  iOS (si tienes Mac/simulador):" -ForegroundColor Yellow
Write-Host "    flutter run -d ios" -ForegroundColor White
Write-Host ""
Write-Host "  Ver dispositivos disponibles:" -ForegroundColor Yellow
Write-Host "    flutter devices" -ForegroundColor White
Write-Host ""

# 8. Preguntar si quiere ejecutar ahora
$ejecutar = Read-Host "¿Deseas ejecutar la aplicación ahora? (S/N)"
if ($ejecutar -eq "S" -or $ejecutar -eq "s" -or $ejecutar -eq "Y" -or $ejecutar -eq "y") {
    Write-Host ""
    Write-Host "Ejecutando aplicación Flutter Web..." -ForegroundColor Green
    Write-Host ""
    flutter run -d chrome
} else {
    Write-Host ""
    Write-Host "Para ejecutar más tarde, usa los comandos mostrados arriba." -ForegroundColor Cyan
    Write-Host ""
}

Set-Location ".."


