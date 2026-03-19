# Script para configurar todos los proyectos de Vercel para el monorepo

Write-Host "🚀 Configuración de Proyectos Vercel para Monorepo" -ForegroundColor Cyan
Write-Host ""

$apps = @("public-web", "admin", "dealer", "seller", "advertiser")

foreach ($app in $apps) {
    Write-Host "📦 Configurando: $app" -ForegroundColor Yellow
    Write-Host "   Ejecuta estos comandos:" -ForegroundColor White
    Write-Host "   cd apps\$app" -ForegroundColor Gray
    Write-Host "   vercel link" -ForegroundColor Gray
    Write-Host "   (Selecciona: Create new project)" -ForegroundColor Gray
    Write-Host "   (Nombre: autodealers-$app)" -ForegroundColor Gray
    Write-Host "   vercel --prod" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Luego en Vercel Dashboard:" -ForegroundColor White
    Write-Host "   - Ve a: https://vercel.com/ltorres832s-projects/autodealers-$app/settings/general" -ForegroundColor Gray
    Write-Host "   - Configura Root Directory: apps/$app" -ForegroundColor Gray
    Write-Host "   - Agrega variables de entorno" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✅ Scripts agregados a package.json:" -ForegroundColor Green
Write-Host "   npm run deploy:public:vercel" -ForegroundColor White
Write-Host "   npm run deploy:admin:vercel" -ForegroundColor White
Write-Host "   npm run deploy:dealer:vercel" -ForegroundColor White
Write-Host "   npm run deploy:seller:vercel" -ForegroundColor White
Write-Host "   npm run deploy:advertiser:vercel" -ForegroundColor White
Write-Host "   npm run deploy:all:vercel (despliega todas)" -ForegroundColor White
