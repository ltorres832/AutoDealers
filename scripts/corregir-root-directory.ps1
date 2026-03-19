# Script para corregir el Root Directory en Vercel
Write-Host "🔧 CORRIGIENDO ROOT DIRECTORY EN VERCEL..." -ForegroundColor Cyan
Write-Host ""

# Obtener token de Vercel
$vercelToken = $null
$possiblePaths = @(
    "$env:USERPROFILE\.vercel\auth.json",
    "$env:APPDATA\vercel\auth.json",
    "$env:LOCALAPPDATA\vercel\auth.json"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        try {
            $auth = Get-Content $path | ConvertFrom-Json
            $vercelToken = $auth.token
            Write-Host "✅ Token encontrado en: $path" -ForegroundColor Green
            break
        } catch {
            continue
        }
    }
}

if (-not $vercelToken) {
    Write-Host "❌ No se encontró token de Vercel. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

# Obtener team ID
$teamId = $null
$configFile = "$env:USERPROFILE\.vercel\config.json"
if (Test-Path $configFile) {
    try {
        $config = Get-Content $configFile | ConvertFrom-Json
        $teamId = $config.currentTeam
        if ($teamId) {
            Write-Host "✅ Team ID: $teamId" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ No se pudo leer config.json" -ForegroundColor Yellow
    }
}

$headers = @{
    "Authorization" = "Bearer $vercelToken"
    "Content-Type" = "application/json"
}

# Proyectos a configurar
$projects = @(
    @{name="autodealers-public-web"; rootDir="apps/public-web"},
    @{name="autodealers-admin"; rootDir="apps/admin"},
    @{name="autodealers-dealer"; rootDir="apps/dealer"},
    @{name="autodealers-seller"; rootDir="apps/seller"},
    @{name="autodealers-advertiser"; rootDir="apps/advertiser"}
)

foreach ($proj in $projects) {
    Write-Host ""
    Write-Host "📦 Configurando $($proj.name)..." -ForegroundColor Cyan
    
    # Construir URL
    $url = "https://api.vercel.com/v9/projects/$($proj.name)"
    if ($teamId) {
        $url += "?teamId=$teamId"
    }
    
    try {
        # Obtener proyecto actual
        $currentProject = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        Write-Host "   ✅ Proyecto existe" -ForegroundColor Green
        Write-Host "   📍 Root Directory actual: $($currentProject.rootDirectory)" -ForegroundColor Gray
        
        # Actualizar Root Directory
        $body = @{
            rootDirectory = $proj.rootDir
        } | ConvertTo-Json
        
        $updatedProject = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
        Write-Host "   ✅ Root Directory actualizado a: $($proj.rootDir)" -ForegroundColor Green
        Write-Host "   🌐 URL: https://$($updatedProject.name).vercel.app" -ForegroundColor Gray
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "   ⚠️  Proyecto no existe. Créalo primero:" -ForegroundColor Yellow
            Write-Host "      cd apps/$($proj.name.Replace('autodealers-',''))" -ForegroundColor White
            Write-Host "      vercel --yes" -ForegroundColor White
        } else {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                try {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $responseBody = $reader.ReadToEnd()
                    Write-Host "   Detalles: $responseBody" -ForegroundColor Gray
                } catch {
                    # Ignorar errores al leer respuesta
                }
            }
        }
    }
}

Write-Host ""
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Despliega cada app: cd apps/[app]; vercel --prod" -ForegroundColor White
Write-Host "2. Verifica en Vercel Dashboard que el Root Directory esté correcto" -ForegroundColor White


