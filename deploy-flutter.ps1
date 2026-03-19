# Deploy Flutter web a Firebase Hosting (clean + build + deploy)
# Ejecutar desde la raíz del repo: .\deploy-flutter.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== 1. Limpiando Flutter ===" -ForegroundColor Cyan
Set-Location "$root\autodealers_flutter"
flutter clean
flutter pub get

Write-Host "`n=== 2. Build web ===" -ForegroundColor Cyan
flutter build web --pwa-strategy=none
if ($LASTEXITCODE -ne 0) { Write-Host "Build falló." -ForegroundColor Red; exit 1 }

Write-Host "`n=== 3. Deploy a Firebase Hosting ===" -ForegroundColor Cyan
Set-Location $root
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) { Write-Host "Deploy falló." -ForegroundColor Red; exit 1 }

Write-Host "`n=== Listo ===" -ForegroundColor Green
Write-Host "Abre en incógnito o con Ctrl+Shift+R: https://autodealers-7f62e.web.app/"
Write-Host "En el footer debe decir: Actualizado: 7 feb 2026"

