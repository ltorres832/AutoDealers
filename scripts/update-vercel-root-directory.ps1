# Script para actualizar Root Directory usando API de Vercel

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

$apps = @(
    @{name="public-web"; projectId="prj_uYgPCawFMw7FtqzDXRVAtHZqwzTi"; rootDir="apps/public-web"},
    @{name="auto-dealers-admin"; projectId="prj_TaJGCEZWMYq303Gd34z1YPqT14C7"; rootDir="apps/admin"},
    @{name="dealer"; projectId="prj_3tw4Qp65ejOtfHVTCh3iAqGvCjm2"; rootDir="apps/dealer"},
    @{name="seller"; projectId="prj_hEFlmB5rQf3oNFKraGssvtXBk35D"; rootDir="apps/seller"},
    @{name="advertiser"; projectId="prj_ZKyI5AcXzH283L2ThwKw6jEJNVbH"; rootDir="apps/advertiser"}
)

# Intentar obtener token si no se proporcionó
if (-not $Token) {
    # Buscar token en archivos de configuración de Vercel
    $vercelConfigPath = "$env:USERPROFILE\.vercel\auth.json"
    if (Test-Path $vercelConfigPath) {
        try {
            $config = Get-Content $vercelConfigPath | ConvertFrom-Json
            if ($config.token) {
                $Token = $config.token
                Write-Host "✅ Token encontrado en configuración" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️  No se pudo leer el token de la configuración" -ForegroundColor Yellow
        }
    }
    
    # Si aún no hay token, pedirlo
    if (-not $Token) {
        Write-Host "❌ No se encontró token de Vercel" -ForegroundColor Red
        Write-Host "Obtén tu token en: https://vercel.com/account/tokens" -ForegroundColor Cyan
        Write-Host "Luego ejecuta: .\scripts\update-vercel-root-directory.ps1 -Token 'tu-token'" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "🔧 Configurando Root Directory para todos los proyectos...`n" -ForegroundColor Cyan

foreach ($app in $apps) {
    Write-Host "📦 $($app.name):" -ForegroundColor Yellow
    Write-Host "   Configurando Root Directory: $($app.rootDir)" -ForegroundColor Gray
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        rootDirectory = $app.rootDir
    } | ConvertTo-Json
    
    $url = "https://api.vercel.com/v9/projects/$($app.projectId)"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method PATCH -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "   ✅ Root Directory configurado correctamente" -ForegroundColor Green
        Write-Host "   URL: https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/$($app.name)" -ForegroundColor Gray
    } catch {
        $errorDetails = $_.ErrorDetails.Message
        if ($errorDetails) {
            try {
                $errorJson = $errorDetails | ConvertFrom-Json
                Write-Host "   ❌ Error: $($errorJson.error.message)" -ForegroundColor Red
            } catch {
                Write-Host "   ❌ Error: $errorDetails" -ForegroundColor Red
            }
        } else {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host "   📝 Configura manualmente en:" -ForegroundColor Cyan
        Write-Host "      https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/$($app.name)/settings/general" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host "✅ Proceso completado!`n" -ForegroundColor Green
