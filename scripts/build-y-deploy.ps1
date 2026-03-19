# Script completo de build y deploy con manejo de errores

$ErrorActionPreference = "Stop"

Write-Host "=== PASO 1: Construyendo paquetes base ===" -ForegroundColor Cyan
cd packages\shared
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en shared" -ForegroundColor Red; exit 1 }

cd ..\core
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en core" -ForegroundColor Red; exit 1 }

cd ..\crm
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en crm" -ForegroundColor Red; exit 1 }

cd ..\inventory
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en inventory" -ForegroundColor Red; exit 1 }

cd ..\billing
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en billing" -ForegroundColor Red; exit 1 }

cd ..\ai
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en ai" -ForegroundColor Red; exit 1 }

cd ..\messaging
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en messaging" -ForegroundColor Red; exit 1 }

cd ..\reports
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en reports" -ForegroundColor Red; exit 1 }

cd ..\..
Write-Host "✓ Paquetes construidos" -ForegroundColor Green

Write-Host "`n=== PASO 2: Construyendo apps ===" -ForegroundColor Cyan
cd apps\public-web
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en public-web" -ForegroundColor Red; exit 1 }

cd ..\admin
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en admin" -ForegroundColor Red; exit 1 }

cd ..\dealer
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en dealer" -ForegroundColor Red; exit 1 }

cd ..\seller
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en seller" -ForegroundColor Red; exit 1 }

cd ..\advertiser
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en advertiser" -ForegroundColor Red; exit 1 }

cd ..\..
Write-Host "✓ Apps construidas" -ForegroundColor Green

Write-Host "`n=== PASO 3: Preparando hosting ===" -ForegroundColor Cyan
npm run prepare-hosting
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en prepare-hosting" -ForegroundColor Red; exit 1 }

Write-Host "`n=== PASO 4: Desplegando a Firebase ===" -ForegroundColor Cyan
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en firebase deploy" -ForegroundColor Red; exit 1 }

Write-Host "`n=== DEPLOYMENT COMPLETADO EXITOSAMENTE ===" -ForegroundColor Green


