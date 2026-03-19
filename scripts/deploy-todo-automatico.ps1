# Script que intenta desplegar TODO automáticamente
# Ejecuta desde la raíz: .\scripts\deploy-todo-automatico.ps1

Write-Host "🚀 DESPLEGANDO TODO AUTOMÁTICAMENTE..." -ForegroundColor Green
Write-Host ""

# Verificar Vercel CLI
Write-Host "1. Verificando Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelCheck = vercel --version 2>&1
    Write-Host "   ✅ Vercel CLI disponible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Instalando Vercel CLI..." -ForegroundColor Yellow
    npm i -g vercel
}

# Verificar autenticación
Write-Host ""
Write-Host "2. Verificando autenticación..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Autenticado como: $whoami" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No autenticado. Intentando login..." -ForegroundColor Yellow
    Write-Host "   ⚠️  Necesitas ejecutar manualmente: vercel login" -ForegroundColor Red
    exit 1
}

# Instalar dependencias
Write-Host ""
Write-Host "3. Instalando dependencias..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Error instalando dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green

# Desplegar cada app
$apps = @(
    @{name="public-web"; path="apps/public-web"; project="autodealers-public-web"},
    @{name="admin"; path="apps/admin"; project="autodealers-admin"},
    @{name="dealer"; path="apps/dealer"; project="autodealers-dealer"},
    @{name="seller"; path="apps/seller"; project="autodealers-seller"},
    @{name="advertiser"; path="apps/advertiser"; project="autodealers-advertiser"}
)

foreach ($app in $apps) {
    Write-Host ""
    Write-Host "📦 Desplegando $($app.name)..." -ForegroundColor Cyan
    Set-Location $app.path
    
    # Intentar desplegar con flags no interactivos
    Write-Host "   Ejecutando vercel --yes --prod..." -ForegroundColor Yellow
    
    # Primero verificar si el proyecto existe
    $projectExists = vercel ls 2>&1 | Select-String -Pattern $app.project
    
    if ($projectExists) {
        Write-Host "   ✅ Proyecto existe, desplegando..." -ForegroundColor Green
        vercel --yes --prod 2>&1 | Out-Host
    } else {
        Write-Host "   ⚠️  Proyecto no existe, creando..." -ForegroundColor Yellow
        # Crear proyecto primero
        echo "Y" | vercel --yes 2>&1 | Out-Host
        # Luego desplegar
        vercel --yes --prod 2>&1 | Out-Host
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $($app.name) desplegado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $($app.name) puede necesitar configuración manual" -ForegroundColor Yellow
    }
    
    Set-Location ../..
}

Write-Host ""
Write-Host "✅ PROCESO COMPLETADO" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Verifica en Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "   1. Root Directory configurado para cada proyecto" -ForegroundColor White
Write-Host "   2. Build Command configurado" -ForegroundColor White
Write-Host "   3. Variables de entorno agregadas" -ForegroundColor White
Write-Host "   4. Redeploy después de configurar variables" -ForegroundColor White


