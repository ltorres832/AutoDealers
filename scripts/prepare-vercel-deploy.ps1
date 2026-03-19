# Script para preparar todo antes de desplegar en Vercel
# Ejecutar desde la raíz: .\scripts\prepare-vercel-deploy.ps1

Write-Host "🔍 VERIFICANDO QUE TODO ESTÉ LISTO PARA VERCEL..." -ForegroundColor Green
Write-Host ""

# Verificar que Vercel CLI está instalado
Write-Host "1. Verificando Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "   ✅ Vercel CLI instalado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Vercel CLI NO está instalado" -ForegroundColor Red
    Write-Host "   Instala con: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

# Verificar que estamos en la raíz del proyecto
Write-Host ""
Write-Host "2. Verificando estructura del proyecto..." -ForegroundColor Yellow
$requiredDirs = @("apps/public-web", "apps/admin", "apps/dealer", "apps/seller", "apps/advertiser")
$allExist = $true

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "   ✅ $dir existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $dir NO existe" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "   ❌ Estructura del proyecto incompleta" -ForegroundColor Red
    exit 1
}

# Verificar archivos vercel.json
Write-Host ""
Write-Host "3. Verificando archivos vercel.json..." -ForegroundColor Yellow
$vercelFiles = @(
    "apps/public-web/vercel.json",
    "apps/admin/vercel.json",
    "apps/dealer/vercel.json",
    "apps/seller/vercel.json",
    "apps/advertiser/vercel.json"
)

foreach ($file in $vercelFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file NO existe" -ForegroundColor Red
        $allExist = $false
    }
}

# Verificar que node_modules existe
Write-Host ""
Write-Host "4. Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  node_modules NO existe. Ejecutando npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Error al instalar dependencias" -ForegroundColor Red
        exit 1
    }
}

# Verificar builds (opcional, puede tardar)
Write-Host ""
Write-Host "5. ¿Quieres verificar que los builds funcionan? (S/N)" -ForegroundColor Yellow
$verifyBuilds = Read-Host "   (Esto puede tardar varios minutos)"

if ($verifyBuilds -eq "S" -or $verifyBuilds -eq "s") {
    Write-Host ""
    Write-Host "   🔨 Verificando build de public-web..." -ForegroundColor Cyan
    cd apps/public-web
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ public-web build OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ public-web build FALLÓ" -ForegroundColor Red
    }
    cd ../..
}

Write-Host ""
Write-Host "✅ VERIFICACIÓN COMPLETA" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS MANUALES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Login en Vercel:" -ForegroundColor White
Write-Host "   vercel login" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Desplegar cada app (una por una):" -ForegroundColor White
Write-Host "   cd apps/public-web" -ForegroundColor Cyan
Write-Host "   vercel" -ForegroundColor Cyan
Write-Host "   (Repetir para admin, dealer, seller, advertiser)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configurar en Vercel Dashboard:" -ForegroundColor White
Write-Host "   - Root Directory para cada proyecto" -ForegroundColor Gray
Write-Host "   - Build Command para cada proyecto" -ForegroundColor Gray
Write-Host "   - Variables de entorno" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Ver VERCEL_AHORA.md para instrucciones detalladas" -ForegroundColor Cyan


