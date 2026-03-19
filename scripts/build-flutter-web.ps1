# Script para build y deploy de Flutter Web
param(
    [switch]$Deploy
)

Write-Host "🚀 Building Flutter Web..." -ForegroundColor Cyan

# Navegar al directorio Flutter
Set-Location "autodealers_flutter"

# Limpiar build anterior
Write-Host "🧹 Limpiando build anterior..." -ForegroundColor Yellow
flutter clean

# Obtener dependencias
Write-Host "📦 Obteniendo dependencias..." -ForegroundColor Yellow
flutter pub get

# Build para web
Write-Host "🏗️ Construyendo para web..." -ForegroundColor Yellow
flutter build web --release

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build completado exitosamente!" -ForegroundColor Green

# Volver al directorio raíz
Set-Location ..

if ($Deploy) {
    Write-Host "🚀 Desplegando a Firebase Hosting..." -ForegroundColor Cyan
    firebase deploy --only hosting:flutter-web
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deploy completado exitosamente!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error en el deploy" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "💡 Para deployar, ejecuta: .\scripts\build-flutter-web.ps1 -Deploy" -ForegroundColor Cyan
}


