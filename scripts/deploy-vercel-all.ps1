# Script PowerShell para desplegar todas las apps en Vercel
# Ejecutar desde la raíz del proyecto: .\scripts\deploy-vercel-all.ps1

Write-Host "🚀 DESPLIEGUE DE TODAS LAS APPS EN VERCEL" -ForegroundColor Green
Write-Host ""

$apps = @(
    @{name="public-web"; path="apps/public-web"; project="autodealers-public-web"},
    @{name="admin"; path="apps/admin"; project="autodealers-admin"},
    @{name="dealer"; path="apps/dealer"; project="autodealers-dealer"},
    @{name="seller"; path="apps/seller"; project="autodealers-seller"},
    @{name="advertiser"; path="apps/advertiser"; project="autodealers-advertiser"}
)

foreach ($app in $apps) {
    Write-Host "📦 Desplegando $($app.name)..." -ForegroundColor Yellow
    Write-Host "   Proyecto: $($app.project)" -ForegroundColor Gray
    Write-Host "   Directorio: $($app.path)" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $app.path
    
    Write-Host "   Ejecutando: vercel" -ForegroundColor Cyan
    Write-Host "   ⚠️  Cuando pregunte:" -ForegroundColor Yellow
    Write-Host "      - Set up and deploy? → Y" -ForegroundColor White
    Write-Host "      - Link to existing project? → N" -ForegroundColor White
    Write-Host "      - Project name? → $($app.project)" -ForegroundColor White
    Write-Host "      - Directory? → $($app.path) o Enter" -ForegroundColor White
    Write-Host ""
    
    vercel
    
    Write-Host ""
    Write-Host "   ✅ $($app.name) desplegado" -ForegroundColor Green
    Write-Host "   📝 IMPORTANTE: Ve a Vercel Dashboard y configura:" -ForegroundColor Yellow
    Write-Host "      - Root Directory: $($app.path)" -ForegroundColor White
    Write-Host "      - Build Command: cd ../.. && npm ci && npm run build:$($app.name)" -ForegroundColor White
    Write-Host "      - Install Command: cd ../.. && npm ci" -ForegroundColor White
    Write-Host "      - Output Directory: .next" -ForegroundColor White
    Write-Host ""
    Write-Host "   Luego ejecuta: vercel --prod" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Presiona Enter para continuar con la siguiente app..." -ForegroundColor Gray
    Read-Host
    
    Set-Location ../..
}

Write-Host "✅ TODAS LAS APPS DESPLEGADAS" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "1. Configurar variables de entorno en cada proyecto en Vercel" -ForegroundColor White
Write-Host "2. Redeploy cada app después de configurar variables" -ForegroundColor White
Write-Host "3. Verificar que cada app funciona en su URL" -ForegroundColor White
Write-Host ""
Write-Host "📖 Ver DEPLOY_VERCEL.md para instrucciones detalladas" -ForegroundColor Cyan


