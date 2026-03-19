# Ejecuta esto y veras TODO el output
Write-Host "========================================" -ForegroundColor Green
Write-Host "CONFIGURANDO Y DESPLEGANDO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Paso 1: Configurar Root Directory
Write-Host "PASO 1: Configurando Root Directory..." -ForegroundColor Yellow

# Buscar auth.json en todas las ubicaciones posibles
$authPaths = @(
    "$env:USERPROFILE\.vercel\auth.json",
    "$env:LOCALAPPDATA\.vercel\auth.json",
    "$env:APPDATA\.vercel\auth.json"
)

$authFile = $null
foreach ($path in $authPaths) {
    if (Test-Path $path) {
        $authFile = $path
        Write-Host "Auth file encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $authFile) {
    Write-Host "ERROR: No se encontro auth.json" -ForegroundColor Red
    Write-Host "Buscando en:" -ForegroundColor Yellow
    foreach ($path in $authPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Ejecuta: vercel login" -ForegroundColor Yellow
    pause
    exit 1
}

$auth = Get-Content $authFile | ConvertFrom-Json

# Buscar config.json
$configPaths = @(
    "$env:USERPROFILE\.vercel\config.json",
    "$env:LOCALAPPDATA\.vercel\config.json",
    "$env:APPDATA\.vercel\config.json"
)

$configFile = $null
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        $configFile = $path
        break
    }
}

if (-not $configFile) {
    Write-Host "WARNING: No se encontro config.json" -ForegroundColor Yellow
    $teamId = $null
} else {
    $config = Get-Content $configFile | ConvertFrom-Json
    $teamId = $config.currentTeam
}

$token = $auth.token
$teamId = $config.currentTeam

Write-Host "Token: OK" -ForegroundColor Green
Write-Host "Team: $teamId" -ForegroundColor Green

$url = "https://api.vercel.com/v9/projects/autodealers-public-web"
if ($teamId) {
    $url += "?teamId=$teamId"
}
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$body = @{rootDirectory = "apps/public-web"} | ConvertTo-Json

Write-Host "Configurando Root Directory..." -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "SUCCESS: Root Directory = $($result.rootDirectory)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "PASO 2: Desplegando..." -ForegroundColor Yellow
Write-Host ""

Set-Location "apps\public-web"
vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Set-Location "../.."
pause


