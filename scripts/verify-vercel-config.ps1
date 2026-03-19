# Script para verificar la configuración de Root Directory en Vercel

$apps = @(
    @{name="public-web"; projectId="prj_uYgPCawFMw7FtqzDXRVAtHZqwzTi"; expectedRoot="apps/public-web"},
    @{name="auto-dealers-admin"; projectId="prj_TaJGCEZWMYq303Gd34z1YPqT14C7"; expectedRoot="apps/admin"},
    @{name="dealer"; projectId="prj_3tw4Qp65ejOtfHVTCh3iAqGvCjm2"; expectedRoot="apps/dealer"},
    @{name="seller"; projectId="prj_hEFlmB5rQf3oNFKraGssvtXBk35D"; expectedRoot="apps/seller"},
    @{name="advertiser"; projectId="prj_ZKyI5AcXzH283L2ThwKw6jEJNVbH"; expectedRoot="apps/advertiser"}
)

Write-Host "🔍 Verificando configuración de Root Directory en Vercel...`n" -ForegroundColor Cyan

# Intentar obtener token
$token = $null
$vercelConfigPath = "$env:USERPROFILE\.vercel\auth.json"
if (Test-Path $vercelConfigPath) {
    try {
        $config = Get-Content $vercelConfigPath | ConvertFrom-Json
        if ($config.token) {
            $token = $config.token
        }
    } catch {
        # Ignorar error
    }
}

foreach ($app in $apps) {
    Write-Host "📦 $($app.name):" -ForegroundColor Yellow
    
    # Verificar si existe .vercel/project.json
    $vercelDir = "apps\$($app.name)\.vercel"
    $projectJsonPath = "$vercelDir\project.json"
    
    if (Test-Path $projectJsonPath) {
        Write-Host "   ✅ Vinculado a Vercel" -ForegroundColor Green
    } else {
        Write-Host "   ❌ No vinculado" -ForegroundColor Red
        Write-Host ""
        continue
    }
    
    # Intentar verificar Root Directory usando API si tenemos token
    if ($token) {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $url = "https://api.vercel.com/v9/projects/$($app.projectId)"
        
        try {
            $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -ErrorAction Stop
            $currentRoot = $response.rootDirectory
            
            if ($currentRoot -eq $app.expectedRoot) {
                Write-Host "   ✅ Root Directory configurado: $currentRoot" -ForegroundColor Green
            } elseif ($currentRoot) {
                Write-Host "   ⚠️  Root Directory actual: $currentRoot" -ForegroundColor Yellow
                Write-Host "   📝 Debería ser: $($app.expectedRoot)" -ForegroundColor Gray
            } else {
                Write-Host "   ⚠️  Root Directory no configurado" -ForegroundColor Yellow
                Write-Host "   📝 Debe ser: $($app.expectedRoot)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "   ⚠️  No se pudo verificar (necesita token)" -ForegroundColor Yellow
            Write-Host "   📝 Link: https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/$($app.name)/settings/general" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No se puede verificar automáticamente (sin token)" -ForegroundColor Yellow
        Write-Host "   📝 Verifica manualmente:" -ForegroundColor Cyan
        Write-Host "      https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/$($app.name)/settings/general" -ForegroundColor Gray
        Write-Host "      Root Directory debe ser: $($app.expectedRoot)" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "✅ Verificación completada`n" -ForegroundColor Green

if (-not $token) {
    Write-Host "💡 Para verificación automática, obtén tu token en:" -ForegroundColor Cyan
    Write-Host "   https://vercel.com/account/tokens`n" -ForegroundColor White
}
