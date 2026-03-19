# SOLUCION FINAL - Usar vercel link para configurar correctamente
Write-Host "=== SOLUCION FINAL VERCEL ===" -ForegroundColor Green
Write-Host ""

# Ir a cada app y linkear correctamente
$apps = @(
    @{name="public-web"; project="autodealers-public-web"},
    @{name="admin"; project="autodealers-admin"},
    @{name="dealer"; project="autodealers-dealer"},
    @{name="seller"; project="autodealers-seller"},
    @{name="advertiser"; project="autodealers-advertiser"}
)

foreach ($app in $apps) {
    Write-Host "Configurando $($app.name)..." -ForegroundColor Cyan
    Set-Location "apps\$($app.name)"
    
    # Verificar si existe .vercel
    if (Test-Path ".vercel") {
        Remove-Item ".vercel" -Recurse -Force
        Write-Host "  Limpiado .vercel anterior" -ForegroundColor Gray
    }
    
    # Linkear proyecto
    Write-Host "  Linkeando proyecto..." -ForegroundColor Yellow
    vercel link --yes --project=$($app.project) 2>&1 | Out-Null
    
    Set-Location "../.."
    Write-Host "  OK" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=== COMPLETADO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora configura manualmente en Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "1. Ve a https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Abre cada proyecto" -ForegroundColor White
Write-Host "3. Settings -> General -> Root Directory" -ForegroundColor White
Write-Host "4. Configura:" -ForegroundColor White
Write-Host "   - public-web: apps/public-web" -ForegroundColor Gray
Write-Host "   - admin: apps/admin" -ForegroundColor Gray
Write-Host "   - dealer: apps/dealer" -ForegroundColor Gray
Write-Host "   - seller: apps/seller" -ForegroundColor Gray
Write-Host "   - advertiser: apps/advertiser" -ForegroundColor Gray
Write-Host ""
Write-Host "Luego despliega: cd apps/public-web; vercel --prod" -ForegroundColor Yellow


