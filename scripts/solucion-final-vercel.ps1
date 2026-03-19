# SOLUCIÓN FINAL - Configura Root Directory y despliega
Write-Host "🚀 SOLUCIÓN FINAL VERCEL" -ForegroundColor Green
Write-Host ""

# 1. Configurar Root Directory
Write-Host "1️⃣ Configurando Root Directory..." -ForegroundColor Yellow

$authFile = "$env:USERPROFILE\.vercel\auth.json"
$configFile = "$env:USERPROFILE\.vercel\config.json"

if (-not (Test-Path $authFile)) {
    Write-Host "❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
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
    Write-Host "   Verificando proyecto $project..." -ForegroundColor Gray
    $getResponse = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "   ✅ Proyecto existe" -ForegroundColor Green
    
    Write-Host "   Configurando Root Directory: $rootDir..." -ForegroundColor Gray
    $body = @{rootDirectory = $rootDir} | ConvertTo-Json
    $patchResponse = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "   ✅ Root Directory configurado: $($patchResponse.rootDirectory)" -ForegroundColor Green
    Write-Host "   🌐 URL: https://$($patchResponse.name).vercel.app" -ForegroundColor Cyan
    
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Detalles: $responseBody" -ForegroundColor Gray
    }
    exit 1
}

Write-Host ""
Write-Host "2️⃣ Desplegando a producción..." -ForegroundColor Yellow
Write-Host "   Ejecutando: cd apps/public-web && vercel --prod" -ForegroundColor Gray
Write-Host ""

Set-Location "apps/public-web"
$deployOutput = vercel --prod 2>&1 | Out-String
Write-Host $deployOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡DESPLIEGUE EXITOSO!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error en despliegue. Revisa los logs arriba." -ForegroundColor Red
}

Set-Location "../.."


