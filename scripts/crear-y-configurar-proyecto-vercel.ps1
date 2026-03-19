# Script para crear y configurar proyecto en Vercel desde cero
Write-Host "🚀 CREANDO Y CONFIGURANDO PROYECTO EN VERCEL" -ForegroundColor Cyan
Write-Host ""

$appDir = "c:\Users\ltorr\AutoDealers\apps\public-web"

# Paso 1: Limpiar configuración anterior
Write-Host "1️⃣ Limpiando configuración anterior..." -ForegroundColor Yellow
if (Test-Path "$appDir\.vercel") {
    Remove-Item -Path "$appDir\.vercel" -Recurse -Force
    Write-Host "   ✅ Limpiado" -ForegroundColor Green
}

# Paso 2: Crear proyecto en Vercel
Write-Host ""
Write-Host "2️⃣ Creando proyecto en Vercel..." -ForegroundColor Yellow
Write-Host "   (Esto puede tomar unos segundos)" -ForegroundColor Gray

Set-Location $appDir

# Crear proyecto con nombre específico
$createOutput = vercel --yes --name public-web 2>&1 | Out-String
Write-Host $createOutput

# Verificar que se creó
if (Test-Path "$appDir\.vercel\project.json") {
    $project = Get-Content "$appDir\.vercel\project.json" | ConvertFrom-Json
    Write-Host "   ✅ Proyecto creado: $($project.projectName)" -ForegroundColor Green
    Write-Host "   📍 Project ID: $($project.projectId)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ No se pudo crear el proyecto" -ForegroundColor Red
    Write-Host "   Intenta manualmente: cd apps/public-web && vercel" -ForegroundColor Yellow
    exit 1
}

# Paso 3: Configurar Root Directory
Write-Host ""
Write-Host "3️⃣ Configurando Root Directory..." -ForegroundColor Yellow

$authFile = "$env:USERPROFILE\.vercel\auth.json"
if (-not (Test-Path $authFile)) {
    Write-Host "   ❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

$auth = Get-Content $authFile | ConvertFrom-Json
$token = $auth.token
$project = Get-Content "$appDir\.vercel\project.json" | ConvertFrom-Json
$teamId = $project.orgId
$projectId = $project.projectId

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$projectId?teamId=$teamId"
$body = @{
    rootDirectory = "apps/public-web"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "   ✅ Root Directory configurado: apps/public-web" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  No se pudo configurar Root Directory automáticamente" -ForegroundColor Yellow
    Write-Host "   Configúralo manualmente en Vercel Dashboard" -ForegroundColor Yellow
}

# Paso 4: Desplegar
Write-Host ""
Write-Host "4️⃣ Desplegando a producción..." -ForegroundColor Yellow
Write-Host ""

vercel --prod

Write-Host ""
Write-Host "✅ PROCESO COMPLETADO" -ForegroundColor Green


