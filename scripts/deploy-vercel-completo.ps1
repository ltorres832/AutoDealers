# Script completo para desplegar todas las apps en Vercel
# Ejecuta desde la raíz: .\scripts\deploy-vercel-completo.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 DESPLEGANDO TODAS LAS APPS EN VERCEL" -ForegroundColor Green
Write-Host ""

# Verificar Vercel CLI
Write-Host "Verificando Vercel CLI..." -ForegroundColor Yellow
try {
    $version = vercel --version 2>&1
    Write-Host "✅ Vercel CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI no encontrado. Instalando..." -ForegroundColor Red
    npm i -g vercel
}

# Verificar autenticación
Write-Host ""
Write-Host "Verificando autenticación..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Autenticado: $whoami" -ForegroundColor Green
} else {
    Write-Host "❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

# Apps a desplegar
$apps = @(
    @{name="public-web"; path="apps/public-web"; buildCmd="npm run build:public"},
    @{name="admin"; path="apps/admin"; buildCmd="npm run build:admin"},
    @{name="dealer"; path="apps/dealer"; buildCmd="npm run build:dealer"},
    @{name="seller"; path="apps/seller"; buildCmd="npm run build:seller"},
    @{name="advertiser"; path="apps/advertiser"; buildCmd="cd apps/advertiser && npm run build"}
)

# Desplegar cada app
foreach ($app in $apps) {
    Write-Host ""
    Write-Host "📦 Desplegando $($app.name)..." -ForegroundColor Cyan
    Write-Host "   Directorio: $($app.path)" -ForegroundColor Gray
    
    Set-Location $app.path
    
    # Verificar que vercel.json existe y es válido
    if (Test-Path "vercel.json") {
        Write-Host "   ✅ vercel.json encontrado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ vercel.json NO encontrado" -ForegroundColor Red
        Set-Location ../..
        continue
    }
    
    # Desplegar
    Write-Host "   Ejecutando: vercel --yes --prod" -ForegroundColor Yellow
    $deployOutput = vercel --yes --prod 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $($app.name) desplegado exitosamente" -ForegroundColor Green
        Write-Host $deployOutput
    } else {
        Write-Host "   ⚠️  $($app.name) puede necesitar configuración manual" -ForegroundColor Yellow
        Write-Host $deployOutput
    }
    
    Set-Location ../..
}

Write-Host ""
Write-Host "✅ PROCESO COMPLETADO" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Verifica en https://vercel.com/dashboard:" -ForegroundColor Yellow
Write-Host "   - Cada proyecto debe tener Root Directory configurado" -ForegroundColor White
Write-Host "   - Variables de entorno deben estar configuradas" -ForegroundColor White


