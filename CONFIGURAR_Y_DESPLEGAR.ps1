# Script final que configura y despliega
Write-Host "========================================" -ForegroundColor Green
Write-Host "CONFIGURANDO Y DESPLEGANDO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 1. Verificar auth
Write-Host "[1/4] Verificando..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: vercel login primero" -ForegroundColor Red
    exit 1
}
Write-Host "OK" -ForegroundColor Green

# 2. Obtener info del proyecto
Write-Host ""
Write-Host "[2/4] Obteniendo info del proyecto..." -ForegroundColor Yellow
$projects = vercel projects ls --json 2>&1 | ConvertFrom-Json
$proj = $projects | Where-Object { $_.name -eq "autodealers-public-web" }

if ($proj) {
    Write-Host "Proyecto encontrado: $($proj.name)" -ForegroundColor Green
    Write-Host "Root Directory actual: $($proj.rootDirectory)" -ForegroundColor Cyan
    Write-Host "Project ID: $($proj.id)" -ForegroundColor Gray
    
    if ($proj.rootDirectory -ne "apps/public-web") {
        Write-Host ""
        Write-Host "⚠️  Root Directory incorrecto!" -ForegroundColor Yellow
        Write-Host "Configura manualmente:" -ForegroundColor Yellow
        Write-Host "1. Ve a: https://vercel.com/dashboard" -ForegroundColor White
        Write-Host "2. Abre: autodealers-public-web" -ForegroundColor White
        Write-Host "3. Settings -> General -> Root Directory" -ForegroundColor White
        Write-Host "4. Cambia a: apps/public-web" -ForegroundColor White
        Write-Host "5. Guarda" -ForegroundColor White
        Write-Host ""
        Write-Host "Presiona Enter cuando hayas configurado..." -ForegroundColor Cyan
        pause
    } else {
        Write-Host "Root Directory correcto!" -ForegroundColor Green
    }
} else {
    Write-Host "Proyecto no encontrado" -ForegroundColor Yellow
}

# 3. Linkear
Write-Host ""
Write-Host "[3/4] Linkeando proyecto..." -ForegroundColor Yellow
Set-Location "apps\public-web"

if (Test-Path ".vercel") {
    Remove-Item ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
}

vercel link --yes --project=autodealers-public-web 2>&1 | Out-Null
Write-Host "OK" -ForegroundColor Green

# 4. Desplegar
Write-Host ""
Write-Host "[4/4] Desplegando..." -ForegroundColor Yellow
Write-Host ""

vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Set-Location "../.."


