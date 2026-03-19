# Script que resuelve TODO y muestra output completo
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESOLVIENDO PROBLEMA DE VERCEL" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar y obtener token
Write-Host "[1] Obteniendo token de Vercel..." -ForegroundColor Yellow

$token = $null
$teamId = $null

# Buscar en todas las ubicaciones
$basePaths = @(
    $env:USERPROFILE,
    $env:LOCALAPPDATA,
    $env:APPDATA
)

foreach ($base in $basePaths) {
    $authFile = Join-Path $base ".vercel\auth.json"
    $configFile = Join-Path $base ".vercel\config.json"
    
    if (Test-Path $authFile) {
        try {
            $auth = Get-Content $authFile -Raw | ConvertFrom-Json
            $token = $auth.token
            Write-Host "  Token encontrado en: $authFile" -ForegroundColor Green
        } catch {
            Write-Host "  Error leyendo: $authFile" -ForegroundColor Red
        }
    }
    
    if (Test-Path $configFile) {
        try {
            $config = Get-Content $configFile -Raw | ConvertFrom-Json
            $teamId = $config.currentTeam
            Write-Host "  Team ID encontrado: $teamId" -ForegroundColor Green
        } catch { }
    }
    
    if ($token -and $teamId) { break }
}

if (-not $token) {
    Write-Host "  ERROR: No se encontro token" -ForegroundColor Red
    Write-Host "  Ejecuta: vercel login" -ForegroundColor Yellow
    exit 1
}

# 2. Configurar Root Directory
Write-Host ""
Write-Host "[2] Configurando Root Directory via API..." -ForegroundColor Yellow

$project = "autodealers-public-web"
$correctRoot = "apps/public-web"

$url = "https://api.vercel.com/v9/projects/$project"
if ($teamId) {
    $url += "?teamId=$teamId"
}

Write-Host "  URL: $url" -ForegroundColor Gray
Write-Host "  Root Directory correcto: $correctRoot" -ForegroundColor Gray

try {
    # Primero obtener configuración actual
    $headers = @{"Authorization" = "Bearer $token"}
    $current = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "  Root Directory actual: '$($current.rootDirectory)'" -ForegroundColor Cyan
    
    if ($current.rootDirectory -ne $correctRoot) {
        Write-Host "  Corrigiendo..." -ForegroundColor Yellow
        
        $patchHeaders = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        $body = @{rootDirectory = $correctRoot} | ConvertTo-Json -Compress
        
        Write-Host "  Body: $body" -ForegroundColor Gray
        
        $updated = Invoke-RestMethod -Uri $url -Headers $patchHeaders -Method PATCH -Body $body
        Write-Host "  SUCCESS! Root Directory actualizado: '$($updated.rootDirectory)'" -ForegroundColor Green
    } else {
        Write-Host "  Ya esta correcto!" -ForegroundColor Green
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "  Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response: $responseBody" -ForegroundColor Gray
        } catch { }
    }
    exit 1
}

# 3. Desplegar
Write-Host ""
Write-Host "[3] Desplegando..." -ForegroundColor Yellow
Write-Host ""

Set-Location "apps\public-web"

$deployOutput = vercel --prod 2>&1 | Out-String
Write-Host $deployOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "DESPLIEGUE EXITOSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ERROR EN DESPLIEGUE" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Revisa el output arriba para ver el error especifico" -ForegroundColor Yellow
}

Set-Location "../.."


