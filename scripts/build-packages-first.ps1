# Script para construir paquetes en orden correcto antes de construir apps
Write-Host "🔨 Construyendo paquetes en orden..." -ForegroundColor Cyan
Write-Host ""

$rootDir = "c:\Users\ltorr\AutoDealers"
Set-Location $rootDir

# Orden de construcción de paquetes (dependencias primero)
$packages = @(
    "packages/shared",
    "packages/core",
    "packages/crm",
    "packages/inventory",
    "packages/billing",
    "packages/ai",
    "packages/messaging",
    "packages/reports"
)

$failed = @()

foreach ($pkg in $packages) {
    $pkgPath = Join-Path $rootDir $pkg
    if (-not (Test-Path $pkgPath)) {
        Write-Host "⚠️  Paquete no encontrado: $pkg" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "📦 Construyendo $pkg..." -ForegroundColor Yellow
    Set-Location $pkgPath
    
    $result = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $pkg construido exitosamente" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error construyendo $pkg" -ForegroundColor Red
        $failed += $pkg
        # Continuar con los demás aunque falle uno
    }
    Write-Host ""
}

Set-Location $rootDir

if ($failed.Count -gt 0) {
    Write-Host "❌ Paquetes con errores:" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "   - $f" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "⚠️  Algunos paquetes fallaron, pero continuando con apps..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Todos los paquetes construidos exitosamente" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Construyendo apps..." -ForegroundColor Cyan
Write-Host ""

# Construir apps
$apps = @(
    "apps/public-web",
    "apps/admin",
    "apps/dealer",
    "apps/seller",
    "apps/advertiser"
)

$failedApps = @()

foreach ($app in $apps) {
    $appPath = Join-Path $rootDir $app
    if (-not (Test-Path $appPath)) {
        Write-Host "⚠️  App no encontrada: $app" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "📱 Construyendo $app..." -ForegroundColor Yellow
    Set-Location $appPath
    
    $result = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $app construida exitosamente" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error construyendo $app" -ForegroundColor Red
        $failedApps += $app
    }
    Write-Host ""
}

Set-Location $rootDir

Write-Host ""
if ($failed.Count -eq 0 -and $failedApps.Count -eq 0) {
    Write-Host "✅ ¡TODO CONSTRUIDO EXITOSAMENTE!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Resumen:" -ForegroundColor Yellow
    if ($failed.Count -gt 0) {
        Write-Host "   Paquetes con errores: $($failed.Count)" -ForegroundColor Red
    }
    if ($failedApps.Count -gt 0) {
        Write-Host "   Apps con errores: $($failedApps.Count)" -ForegroundColor Red
    }
}


