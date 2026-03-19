# Script que hace TODO automáticamente
Write-Host "=== CONFIGURANDO Y DESPLEGANDO TODO ===" -ForegroundColor Green
Write-Host ""

# 1. Limpiar y linkear proyectos
Write-Host "1. Linkeando proyectos..." -ForegroundColor Yellow

$apps = @("public-web", "admin", "dealer", "seller", "advertiser")

foreach ($app in $apps) {
    Write-Host "  Linkeando $app..." -ForegroundColor Cyan
    Set-Location "apps\$app"
    
    # Limpiar
    if (Test-Path ".vercel") {
        Remove-Item ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Linkear
    vercel link --yes --project="autodealers-$app" 2>&1 | Out-Null
    
    Set-Location "../.."
}

Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# 2. Configurar Root Directory usando API
Write-Host "2. Configurando Root Directory via API..." -ForegroundColor Yellow

# Obtener token desde vercel CLI
$token = $null
$configPaths = @(
    "$env:USERPROFILE\.vercel",
    "$env:LOCALAPPDATA\.vercel",
    "$env:APPDATA\.vercel"
)

foreach ($basePath in $configPaths) {
    $authPath = Join-Path $basePath "auth.json"
    if (Test-Path $authPath) {
        try {
            $auth = Get-Content $authPath | ConvertFrom-Json
            $token = $auth.token
            Write-Host "  Token encontrado en: $authPath" -ForegroundColor Green
            break
        } catch {
            continue
        }
    }
}

if (-not $token) {
    Write-Host "  WARNING: No se encontro token, pero continuando..." -ForegroundColor Yellow
    Write-Host "  Configura Root Directory manualmente en Vercel Dashboard" -ForegroundColor Yellow
} else {
    # Obtener team ID
    $teamId = $null
    foreach ($basePath in $configPaths) {
        $configPath = Join-Path $basePath "config.json"
        if (Test-Path $configPath) {
            try {
                $config = Get-Content $configPath | ConvertFrom-Json
                $teamId = $config.currentTeam
                break
            } catch {
                continue
            }
        }
    }
    
    # Configurar cada proyecto
    foreach ($app in $apps) {
        $project = "autodealers-$app"
        $rootDir = "apps/$app"
        
        $url = "https://api.vercel.com/v9/projects/$project"
        if ($teamId) {
            $url += "?teamId=$teamId"
        }
        
        try {
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            $body = @{rootDirectory = $rootDir} | ConvertTo-Json -Compress
            
            $response = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body -ErrorAction Stop
            $rootDirValue = $response.rootDirectory
            Write-Host "  ${app}: Root Directory = $rootDirValue" -ForegroundColor Green
        } catch {
            $errorMessage = $_.Exception.Message
            Write-Host "  ${app}: Error - $errorMessage" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 3. Desplegar
Write-Host "3. Desplegando public-web..." -ForegroundColor Yellow
Set-Location "apps\public-web"
vercel --prod 2>&1

Set-Location "../.."
Write-Host ""
Write-Host "=== COMPLETADO ===" -ForegroundColor Green


