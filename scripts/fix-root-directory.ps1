# Fix Root Directory en Vercel
Write-Host "=== CORRIGIENDO ROOT DIRECTORY ===" -ForegroundColor Green

# Buscar auth.json
$authPaths = @(
    "$env:USERPROFILE\.vercel\auth.json",
    "$env:LOCALAPPDATA\.vercel\auth.json"
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
    Write-Host "ERROR: No se encontro auth.json" -ForegroundColor Red
    Write-Host "Ejecuta: vercel login" -ForegroundColor Yellow
    exit 1
}

$auth = Get-Content $authFile | ConvertFrom-Json
$token = $auth.token

# Buscar config.json
$configPaths = @(
    "$env:USERPROFILE\.vercel\config.json",
    "$env:LOCALAPPDATA\.vercel\config.json"
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
    $config = Get-Content $configFile | ConvertFrom-Json
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
Write-Host "Configurando: $project" -ForegroundColor Cyan
Write-Host "Root Directory: $rootDir" -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host ""

try {
    $body = @{rootDirectory = $rootDir} | ConvertTo-Json -Compress
    Write-Host "Body: $body" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Proyecto: $($response.name)" -ForegroundColor White
    Write-Host "Root Directory: $($response.rootDirectory)" -ForegroundColor White
    
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Gray
        } catch {
            Write-Host "No se pudo leer respuesta" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== COMPLETADO ===" -ForegroundColor Green


