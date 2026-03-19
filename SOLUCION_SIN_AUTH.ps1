# Solucion que NO requiere auth.json - usa vercel CLI directamente
Write-Host "========================================" -ForegroundColor Green
Write-Host "SOLUCION SIN ARCHIVO AUTH" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verificar autenticacion
Write-Host "[1] Verificando autenticacion..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "OK: $whoami" -ForegroundColor Green

# Configurar Root Directory usando vercel link
Write-Host ""
Write-Host "[2] Configurando proyecto..." -ForegroundColor Yellow

Set-Location "apps\public-web"

# Limpiar .vercel anterior
if (Test-Path ".vercel") {
    Remove-Item ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Limpiado .vercel anterior" -ForegroundColor Gray
}

# Linkear proyecto
Write-Host "  Linkeando proyecto..." -ForegroundColor Cyan
vercel link --yes --project=autodealers-public-web 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Proyecto linkeado" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Link puede haber fallado" -ForegroundColor Yellow
}

# Verificar .vercel/project.json
if (Test-Path ".vercel\project.json") {
    $proj = Get-Content ".vercel\project.json" | ConvertFrom-Json
    Write-Host "  Project ID: $($proj.projectId)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3] IMPORTANTE: Configura Root Directory en Vercel Dashboard" -ForegroundColor Yellow
Write-Host "  1. Ve a: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "  2. Abre proyecto: autodealers-public-web" -ForegroundColor White
Write-Host "  3. Settings -> General -> Root Directory" -ForegroundColor White
Write-Host "  4. Cambia a: apps/public-web" -ForegroundColor White
Write-Host "  5. Guarda" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Enter cuando hayas configurado el Root Directory..." -ForegroundColor Cyan
pause

Write-Host ""
Write-Host "[4] Desplegando..." -ForegroundColor Yellow
Write-Host ""

vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Set-Location "../.."
pause


