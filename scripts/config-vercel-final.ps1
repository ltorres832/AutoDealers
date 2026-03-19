# Solucion final - Configurar Root Directory
Write-Host "=== CONFIGURANDO ROOT DIRECTORY EN VERCEL ===" -ForegroundColor Green
Write-Host ""

# Obtener token usando vercel inspect
Write-Host "Obteniendo informacion de Vercel..." -ForegroundColor Yellow

# Intentar obtener token desde diferentes ubicaciones
$authPaths = @(
    "$env:USERPROFILE\.vercel\auth.json",
    "$env:LOCALAPPDATA\.vercel\auth.json",
    "$env:APPDATA\.vercel\auth.json"
)

$authFile = $null
foreach ($path in $authPaths) {
    if (Test-Path $path) {
        $authFile = $path
        break
    }
}

if (-not $authFile) {
    Write-Host "ERROR: No se encontro archivo de autenticacion" -ForegroundColor Red
    Write-Host "Ejecuta: vercel login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Archivo de auth encontrado: $authFile" -ForegroundColor Green

$auth = Get-Content $authFile -Raw | ConvertFrom-Json
$token = $auth.token

# Obtener config
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

$teamId = $null
if ($configFile) {
    $config = Get-Content $configFile -Raw | ConvertFrom-Json
    $teamId = $config.currentTeam
    Write-Host "Team ID: $teamId" -ForegroundColor Green
}

# Configurar proyecto
$project = "autodealers-public-web"
$rootDir = "apps/public-web"

$url = "https://api.vercel.com/v9/projects/$project"
if ($teamId) {
    $url += "?teamId=$teamId"
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "Configurando proyecto: $project" -ForegroundColor Cyan
Write-Host "Root Directory: $rootDir" -ForegroundColor Cyan
Write-Host ""

try {
    $body = @{
        rootDirectory = $rootDir
    } | ConvertTo-Json -Compress
    
    Write-Host "Enviando peticion a API..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    
    Write-Host "SUCCESS: Root Directory configurado!" -ForegroundColor Green
    Write-Host "Proyecto: $($response.name)" -ForegroundColor White
    Write-Host "Root Directory: $($response.rootDirectory)" -ForegroundColor White
    Write-Host "URL: https://$($response.name).vercel.app" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "=== CONFIGURACION COMPLETADA ===" -ForegroundColor Green
Write-Host "Ahora puedes desplegar con: cd apps/public-web; vercel --prod" -ForegroundColor Yellow


