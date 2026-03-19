# ULTIMA SOLUCION - Configura todo y despliega
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ULTIMA SOLUCION - CONFIGURANDO TODO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar autenticacion
Write-Host "[1/3] Verificando autenticacion..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Ejecuta primero: vercel login" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Autenticado como $whoami" -ForegroundColor Green

# Paso 2: Linkear y verificar proyecto
Write-Host ""
Write-Host "[2/3] Configurando proyecto public-web..." -ForegroundColor Yellow

Set-Location "apps\public-web"

# Limpiar
if (Test-Path ".vercel") {
    Remove-Item ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
}

# Linkear
Write-Host "  Linkeando..." -ForegroundColor Cyan
vercel link --yes --project=autodealers-public-web 2>&1 | Out-Null

Write-Host "  OK" -ForegroundColor Green

# Paso 3: Desplegar
Write-Host ""
Write-Host "[3/3] Desplegando a produccion..." -ForegroundColor Yellow
Write-Host ""

# Mostrar output completo
vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

Set-Location "../.."


