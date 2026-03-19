# Script para configurar y desplegar public-web en Vercel
# Este script configura el Root Directory y despliega

Write-Host "🔧 Configurando Vercel para public-web..." -ForegroundColor Cyan

# Obtener token de Vercel
$vercelToken = $null
$possiblePaths = @(
    "$env:USERPROFILE\.vercel\auth.json",
    "$env:APPDATA\vercel\auth.json",
    "$env:LOCALAPPDATA\vercel\auth.json",
    "$PSScriptRoot\..\.vercel\auth.json"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $auth = Get-Content $path | ConvertFrom-Json
        $vercelToken = $auth.token
        Write-Host "✅ Token encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $vercelToken) {
    Write-Host "❌ No se encontró token de Vercel. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

# Obtener project ID
$projectName = "autodealers-public-web"
$teamId = $null

# Intentar obtener team ID desde .vercel/project.json
$projectJsonPath = "$PSScriptRoot\..\.vercel\project.json"
if (Test-Path $projectJsonPath) {
    $projectJson = Get-Content $projectJsonPath | ConvertFrom-Json
    $teamId = $projectJson.teamId
}

# Configurar Root Directory usando API de Vercel
Write-Host "📝 Configurando Root Directory a 'apps/public-web'..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $vercelToken"
    "Content-Type" = "application/json"
}

# Primero obtener el project ID
$getProjectsUrl = "https://api.vercel.com/v9/projects"
if ($teamId) {
    $getProjectsUrl += "?teamId=$teamId"
}

try {
    $projectsResponse = Invoke-RestMethod -Uri $getProjectsUrl -Headers $headers -Method Get
    $project = $projectsResponse.projects | Where-Object { $_.name -eq $projectName } | Select-Object -First 1
    
    if (-not $project) {
        Write-Host "❌ Proyecto '$projectName' no encontrado" -ForegroundColor Red
        exit 1
    }
    
    $projectId = $project.id
    Write-Host "✅ Proyecto encontrado: $projectId" -ForegroundColor Green
    
    # Actualizar configuración del proyecto
    $updateUrl = "https://api.vercel.com/v9/projects/$projectId"
    if ($teamId) {
        $updateUrl += "?teamId=$teamId"
    }
    
    $body = @{
        rootDirectory = "apps/public-web"
    } | ConvertTo-Json
    
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Patch -Body $body
    Write-Host "✅ Root Directory configurado correctamente" -ForegroundColor Green
    
    # Desplegar
    Write-Host "🚀 Desplegando a producción..." -ForegroundColor Cyan
    Set-Location "$PSScriptRoot\..\apps\public-web"
    vercel --prod --yes
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalles: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}


