# Script PowerShell para configurar Root Directory en Vercel usando la API

Write-Host "🔧 Configurando Root Directory para todos los proyectos de Vercel...`n" -ForegroundColor Cyan

$apps = @(
    @{name="public-web"; rootDir="apps/public-web"},
    @{name="admin"; rootDir="apps/admin"},
    @{name="dealer"; rootDir="apps/dealer"},
    @{name="seller"; rootDir="apps/seller"},
    @{name="advertiser"; rootDir="apps/advertiser"}
)

foreach ($app in $apps) {
    $vercelDir = "apps\$($app.name)\.vercel"
    $projectJsonPath = "$vercelDir\project.json"
    
    if (-not (Test-Path $projectJsonPath)) {
        Write-Host "⚠️  $($app.name): No se encontró .vercel/project.json" -ForegroundColor Yellow
        continue
    }
    
    try {
        $projectData = Get-Content $projectJsonPath | ConvertFrom-Json
        $projectId = $projectData.projectId
        $orgId = $projectData.orgId
        
        Write-Host "📦 $($app.name):" -ForegroundColor Yellow
        Write-Host "   Project ID: $projectId" -ForegroundColor Gray
        Write-Host "   Root Directory: $($app.rootDir)" -ForegroundColor Gray
        
        # Obtener token de Vercel
        try {
            $token = vercel whoami --token 2>$null
            if ($LASTEXITCODE -ne 0) {
                throw "No se pudo obtener token"
            }
            
            # Actualizar usando API de Vercel
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            
            $body = @{
                rootDirectory = $app.rootDir
            } | ConvertTo-Json
            
            $url = "https://api.vercel.com/v9/projects/$projectId"
            
            try {
                $response = Invoke-RestMethod -Uri $url -Method PATCH -Headers $headers -Body $body -ErrorAction Stop
                Write-Host "   ✅ Root Directory configurado correctamente" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  No se pudo actualizar automáticamente" -ForegroundColor Yellow
                Write-Host "   📝 Configura manualmente en:" -ForegroundColor Cyan
                Write-Host "      https://vercel.com/$orgId/$($app.name)/settings/general" -ForegroundColor White
                Write-Host "      Root Directory: $($app.rootDir)" -ForegroundColor White
            }
        } catch {
            Write-Host "   ⚠️  No se pudo obtener el token de Vercel" -ForegroundColor Yellow
            Write-Host "   📝 Configura manualmente en:" -ForegroundColor Cyan
            Write-Host "      https://vercel.com/$orgId/$($app.name)/settings/general" -ForegroundColor White
            Write-Host "      Root Directory: $($app.rootDir)" -ForegroundColor White
        }
        
        Write-Host ""
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "✅ Proceso completado.`n" -ForegroundColor Green
Write-Host "📝 Si algún proyecto no se actualizó automáticamente," -ForegroundColor Cyan
Write-Host "   ve al Dashboard de Vercel y configura el Root Directory manualmente.`n" -ForegroundColor Cyan
