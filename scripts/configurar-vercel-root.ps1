# Script para configurar Root Directory automáticamente en Vercel
# Usa la API de Vercel para actualizar la configuración

$ErrorActionPreference = "Stop"

Write-Host "🔧 Configurando Root Directory en Vercel..." -ForegroundColor Green
Write-Host ""

# Verificar autenticación
Write-Host "Verificando autenticación..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Autenticado: $whoami" -ForegroundColor Green

# Obtener token de Vercel
Write-Host ""
Write-Host "Obteniendo token de Vercel..." -ForegroundColor Yellow
$vercelDir = "$env:USERPROFILE\.vercel"
if (Test-Path "$vercelDir\auth.json") {
    $auth = Get-Content "$vercelDir\auth.json" | ConvertFrom-Json
    $token = $auth.token
    Write-Host "✅ Token obtenido" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró token. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

# Obtener team/user ID
$teamId = $null
if (Test-Path "$vercelDir\config.json") {
    $config = Get-Content "$vercelDir\config.json" | ConvertFrom-Json
    $teamId = $config.currentTeam
}

# Proyectos a configurar
$projects = @(
    @{name="public-web"; rootDir="apps/public-web"},
    @{name="admin"; rootDir="apps/admin"},
    @{name="dealer"; rootDir="apps/dealer"},
    @{name="seller"; rootDir="apps/seller"},
    @{name="advertiser"; rootDir="apps/advertiser"}
)

foreach ($project in $projects) {
    $projectName = "autodealers-$($project.name)"
    Write-Host ""
    Write-Host "📦 Configurando $projectName..." -ForegroundColor Cyan
    
    # Obtener proyecto
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $url = "https://api.vercel.com/v9/projects/$projectName"
    if ($teamId) {
        $url += "?teamId=$teamId"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        Write-Host "   ✅ Proyecto encontrado" -ForegroundColor Green
        
        # Actualizar configuración
        $body = @{
            rootDirectory = $project.rootDir
        } | ConvertTo-Json
        
        $updateUrl = "https://api.vercel.com/v9/projects/$projectName"
        if ($teamId) {
            $updateUrl += "?teamId=$teamId"
        }
        
        $updateResponse = Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method PATCH -Body $body -ContentType "application/json"
        Write-Host "   ✅ Root Directory configurado: $($project.rootDir)" -ForegroundColor Green
        
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "   ⚠️  Proyecto no existe. Créalo primero con: cd apps/$($project.name) && vercel" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✅ Configuración completada" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Verifica en Vercel Dashboard que el Root Directory esté correcto" -ForegroundColor White
Write-Host "2. Despliega cada app: cd apps/[app] && vercel --prod" -ForegroundColor White


