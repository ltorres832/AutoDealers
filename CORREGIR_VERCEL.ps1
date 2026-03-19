# Script para corregir Root Directory en Vercel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CORRIGIENDO ROOT DIRECTORY EN VERCEL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buscar archivos de autenticación en todas las ubicaciones posibles
$authPaths = @(
    "$env:USERPROFILE\.vercel\auth.json",
    "$env:LOCALAPPDATA\.vercel\auth.json",
    "$env:APPDATA\.vercel\auth.json",
    "$env:HOME\.vercel\auth.json"
)

$authFile = $null
foreach ($path in $authPaths) {
    if (Test-Path $path) {
        $authFile = $path
        Write-Host "Auth file encontrado: $path" -ForegroundColor Green
        break
    }
}

if (-not $authFile) {
    Write-Host "ERROR: No se encontro archivo de autenticacion" -ForegroundColor Red
    Write-Host "Buscando en:" -ForegroundColor Yellow
    foreach ($path in $authPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Ejecuta: vercel login" -ForegroundColor Yellow
    exit 1
}

$configPaths = @(
    "$env:USERPROFILE\.vercel\config.json",
    "$env:LOCALAPPDATA\.vercel\config.json",
    "$env:APPDATA\.vercel\config.json",
    "$env:HOME\.vercel\config.json"
)

$configFile = $null
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        $configFile = $path
        break
    }
}

if (-not $configFile) {
    Write-Host "WARNING: No se encontro config.json, continuando sin team ID" -ForegroundColor Yellow
}

$auth = Get-Content $authFile | ConvertFrom-Json
$token = $auth.token

$teamId = $null
if ($configFile) {
    $config = Get-Content $configFile | ConvertFrom-Json
    $teamId = $config.currentTeam
}

Write-Host "Token obtenido: OK" -ForegroundColor Green
Write-Host "Team ID: $teamId" -ForegroundColor Green
Write-Host ""

# Configurar proyecto
$project = "autodealers-public-web"
$correctRootDir = "apps/public-web"

$url = "https://api.vercel.com/v9/projects/$project"
if ($teamId) {
    $url += "?teamId=$teamId"
}

Write-Host "Obteniendo configuracion actual..." -ForegroundColor Yellow
try {
    $headers = @{"Authorization" = "Bearer $token"}
    $current = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "Root Directory actual: '$($current.rootDirectory)'" -ForegroundColor Cyan
    
    if ($current.rootDirectory -eq $correctRootDir) {
        Write-Host "Ya esta correcto!" -ForegroundColor Green
    } else {
        Write-Host "Corrigiendo a: '$correctRootDir'..." -ForegroundColor Yellow
        
        $patchHeaders = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        $body = @{rootDirectory = $correctRootDir} | ConvertTo-Json -Compress
        
        $updated = Invoke-RestMethod -Uri $url -Headers $patchHeaders -Method PATCH -Body $body
        Write-Host "SUCCESS! Root Directory corregido: '$($updated.rootDirectory)'" -ForegroundColor Green
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora ejecuta: cd apps/public-web; vercel --prod" -ForegroundColor Yellow


