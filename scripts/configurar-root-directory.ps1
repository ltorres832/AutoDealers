# Configurar Root Directory usando vercel link
Write-Host "Configurando Root Directory..." -ForegroundColor Green

$apps = @(
    @{name="public-web"; path="apps/public-web"},
    @{name="admin"; path="apps/admin"},
    @{name="dealer"; path="apps/dealer"},
    @{name="seller"; path="apps/seller"},
    @{name="advertiser"; path="apps/advertiser"}
)

foreach ($app in $apps) {
    Write-Host ""
    Write-Host "Configurando $($app.name)..." -ForegroundColor Cyan
    Set-Location $app.path
    
    # Link el proyecto
    Write-Host "  Linking proyecto..." -ForegroundColor Gray
    vercel link --yes --project="autodealers-$($app.name)" 2>&1 | Out-Null
    
    # Crear .vercel/project.json si no existe para forzar root directory
    $vercelDir = ".vercel"
    if (-not (Test-Path $vercelDir)) {
        New-Item -ItemType Directory -Path $vercelDir | Out-Null
    }
    
    $projectJson = @{
        projectId = "autodealers-$($app.name)"
        orgId = ""
        settings = @{
            rootDirectory = $app.path
        }
    } | ConvertTo-Json
    
    Set-Location "../.."
}

Write-Host ""
Write-Host "Configuracion completada" -ForegroundColor Green
Write-Host "Ahora despliega con: cd apps/[app]; vercel --prod" -ForegroundColor Yellow


