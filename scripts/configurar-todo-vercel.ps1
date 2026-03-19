# Script completo para configurar Root Directory en Vercel
Write-Host "🔧 CONFIGURANDO ROOT DIRECTORY EN VERCEL..." -ForegroundColor Green
Write-Host ""

# Verificar autenticación
$authFile = "$env:USERPROFILE\.vercel\auth.json"
if (-not (Test-Path $authFile)) {
    Write-Host "❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

$auth = Get-Content $authFile | ConvertFrom-Json
$token = $auth.token
Write-Host "✅ Token obtenido" -ForegroundColor Green

# Obtener team
$configFile = "$env:USERPROFILE\.vercel\config.json"
$teamId = $null
if (Test-Path $configFile) {
    $config = Get-Content $configFile | ConvertFrom-Json
    $teamId = $config.currentTeam
    Write-Host "✅ Team ID: $teamId" -ForegroundColor Green
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

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
    
    $url = "https://api.vercel.com/v9/projects/$($proj.name)"
    if ($teamId) {
        $url += "?teamId=$teamId"
    }
    
    # Primero verificar si existe
    try {
        $getResponse = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        Write-Host "   ✅ Proyecto existe" -ForegroundColor Green
        
        # Actualizar
        $body = @{
            rootDirectory = $proj.rootDir
        } | ConvertTo-Json
        
        $patchResponse = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
        Write-Host "   ✅ Root Directory configurado: $($proj.rootDir)" -ForegroundColor Green
        Write-Host "   📍 URL: $($patchResponse.link)" -ForegroundColor Gray
        
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "   ⚠️  Proyecto no existe aún. Créalo primero:" -ForegroundColor Yellow
            Write-Host "      cd apps/$($proj.name.Replace('autodealers-',''))" -ForegroundColor White
            Write-Host "      vercel --yes" -ForegroundColor White
        } else {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "   Detalles: $responseBody" -ForegroundColor Gray
            }
        }
    }
}

Write-Host ""
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Despliega cada app: cd apps/[app]; vercel --prod" -ForegroundColor White
Write-Host "2. Verifica en Vercel Dashboard que el Root Directory este correcto" -ForegroundColor White


