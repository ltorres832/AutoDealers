Write-Host "Configurando Root Directory en Vercel..." -ForegroundColor Green

# Buscar archivo de autenticación en diferentes ubicaciones
$authFile = "$env:USERPROFILE\.vercel\auth.json"
if (-not (Test-Path $authFile)) {
    $authFile = "$env:LOCALAPPDATA\.vercel\auth.json"
}
if (-not (Test-Path $authFile)) {
    Write-Host "Error: No se encontro archivo de autenticacion" -ForegroundColor Red
    Write-Host "Ejecuta: vercel login" -ForegroundColor Yellow
    exit 1
}

$configFile = "$env:USERPROFILE\.vercel\config.json"
if (-not (Test-Path $configFile)) {
    $configFile = "$env:LOCALAPPDATA\.vercel\config.json"
}

$auth = Get-Content $authFile | ConvertFrom-Json
$config = Get-Content $configFile | ConvertFrom-Json
$token = $auth.token
$teamId = $config.currentTeam

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$project = "autodealers-public-web"
$rootDir = "apps/public-web"

$url = "https://api.vercel.com/v9/projects/$project?teamId=$teamId"

try {
    Write-Host "Verificando proyecto..." -ForegroundColor Yellow
    $getResponse = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "Proyecto existe" -ForegroundColor Green
    
    Write-Host "Configurando Root Directory..." -ForegroundColor Yellow
    $body = @{rootDirectory = $rootDir} | ConvertTo-Json
    $patchResponse = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "Root Directory configurado: $($patchResponse.rootDirectory)" -ForegroundColor Green
    Write-Host "URL: $($patchResponse.link)" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Configuracion completada" -ForegroundColor Green


