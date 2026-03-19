# Script para ejecutar deployment completo a Firebase
# Captura todos los errores y los muestra claramente

Write-Host "=== INICIANDO DEPLOYMENT FIREBASE ===" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Construir paquetes
Write-Host "Paso 1: Construyendo paquetes..." -ForegroundColor Yellow
$packagesBuild = npm run build:packages 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en build:packages" -ForegroundColor Red
    Write-Host $packagesBuild
    exit 1
}
Write-Host "✓ Paquetes construidos" -ForegroundColor Green
Write-Host ""

# Paso 2: Construir apps
Write-Host "Paso 2: Construyendo apps..." -ForegroundColor Yellow
$appsBuild = npm run build:public 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en build:public" -ForegroundColor Red
    Write-Host $appsBuild
    exit 1
}

$adminBuild = npm run build:admin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en build:admin" -ForegroundColor Red
    Write-Host $adminBuild
    exit 1
}

$dealerBuild = npm run build:dealer 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en build:dealer" -ForegroundColor Red
    Write-Host $dealerBuild
    exit 1
}

$sellerBuild = npm run build:seller 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en build:seller" -ForegroundColor Red
    Write-Host $sellerBuild
    exit 1
}

$advertiserBuild = npm run build:advertiser 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en build:advertiser" -ForegroundColor Red
    Write-Host $advertiserBuild
    exit 1
}
Write-Host "✓ Apps construidas" -ForegroundColor Green
Write-Host ""

# Paso 3: Preparar hosting
Write-Host "Paso 3: Preparando hosting..." -ForegroundColor Yellow
$prepareHosting = npm run prepare-hosting 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en prepare-hosting" -ForegroundColor Red
    Write-Host $prepareHosting
    exit 1
}
Write-Host "✓ Hosting preparado" -ForegroundColor Green
Write-Host ""

# Paso 4: Deploy a Firebase
Write-Host "Paso 4: Desplegando a Firebase..." -ForegroundColor Yellow
$firebaseDeploy = firebase deploy --only hosting 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en firebase deploy" -ForegroundColor Red
    Write-Host $firebaseDeploy
    exit 1
}
Write-Host "✓ Deployment completado" -ForegroundColor Green
Write-Host ""

Write-Host "=== DEPLOYMENT COMPLETADO EXITOSAMENTE ===" -ForegroundColor Green


