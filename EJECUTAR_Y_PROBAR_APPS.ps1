# Script para ejecutar y probar las apps individuales
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROBAR APPS INDIVIDUALES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "autodealers_flutter"

Write-Host "📱 Las 5 Apps de AutoDealers:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Admin App      - Panel de administración" -ForegroundColor White
Write-Host "2. Dealer App     - Dashboard del concesionario" -ForegroundColor White
Write-Host "3. Seller App     - Dashboard del vendedor" -ForegroundColor White
Write-Host "4. Advertiser App - Dashboard del anunciante" -ForegroundColor White
Write-Host "5. Public-Web App - Sitio web público" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  USUARIOS DE PRUEBA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin:      admin@autodealers.test / Admin123!" -ForegroundColor Green
Write-Host "Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor Green
Write-Host "Seller:     seller@autodealers.test / Seller123!" -ForegroundColor Green
Write-Host "Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor Green
Write-Host "Public:     No requiere login" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. La aplicación se abrirá en Chrome" -ForegroundColor Yellow
Write-Host "2. Inicia sesión con el usuario correspondiente" -ForegroundColor Yellow
Write-Host "3. Serás redirigido automáticamente al dashboard según tu rol" -ForegroundColor Yellow
Write-Host "4. Para probar otra app, cierra sesión e inicia con otro usuario" -ForegroundColor Yellow
Write-Host ""
Write-Host "Controles:" -ForegroundColor Cyan
Write-Host "  'r' - Hot reload (recargar cambios)" -ForegroundColor Gray
Write-Host "  'R' - Hot restart (reiniciar app)" -ForegroundColor Gray
Write-Host "  'q' - Salir" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "¿Deseas ejecutar la aplicación ahora? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    Set-Location ".."
    exit 0
}

Write-Host ""
Write-Host "🚀 Ejecutando aplicación..." -ForegroundColor Green
Write-Host ""

flutter run -d chrome

Set-Location ".."


