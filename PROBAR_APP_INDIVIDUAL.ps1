# Script para probar apps individuales
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('admin', 'dealer', 'seller', 'advertiser', 'public', 'all')]
    [string]$App = 'all',
    
    [Parameter(Mandatory=$false)]
    [switch]$Build,
    
    [Parameter(Mandatory=$false)]
    [switch]$Serve
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROBAR APPS INDIVIDUALES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "autodealers_flutter"

if ($Build) {
    Write-Host "[1/3] Compilando para producción..." -ForegroundColor Yellow
    flutter build web --release
    Write-Host ""
    
    if ($Serve) {
        Write-Host "[2/3] Sirviendo aplicación..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Abre tu navegador en: http://localhost:8000" -ForegroundColor Green
        Write-Host ""
        Write-Host "Usuarios de prueba:" -ForegroundColor Cyan
        Write-Host "  Admin:      admin@autodealers.test / Admin123!" -ForegroundColor White
        Write-Host "  Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor White
        Write-Host "  Seller:     seller@autodealers.test / Seller123!" -ForegroundColor White
        Write-Host "  Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor White
        Write-Host ""
        Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
        Write-Host ""
        Set-Location "build/web"
        python -m http.server 8000
        Set-Location "../.."
        exit
    }
}

Write-Host "[INFO] Ejecutando aplicación en modo desarrollo..." -ForegroundColor Yellow
Write-Host ""

switch ($App) {
    'admin' {
        Write-Host "📱 Probando: Admin App" -ForegroundColor Green
        Write-Host "   Usuario: admin@autodealers.test / Admin123!" -ForegroundColor Cyan
    }
    'dealer' {
        Write-Host "📱 Probando: Dealer App" -ForegroundColor Green
        Write-Host "   Usuario: dealer@autodealers.test / Dealer123!" -ForegroundColor Cyan
    }
    'seller' {
        Write-Host "📱 Probando: Seller App" -ForegroundColor Green
        Write-Host "   Usuario: seller@autodealers.test / Seller123!" -ForegroundColor Cyan
    }
    'advertiser' {
        Write-Host "📱 Probando: Advertiser App" -ForegroundColor Green
        Write-Host "   Usuario: advertiser@autodealers.test / Advertiser123!" -ForegroundColor Cyan
    }
    'public' {
        Write-Host "📱 Probando: Public-Web App" -ForegroundColor Green
        Write-Host "   No requiere login" -ForegroundColor Cyan
    }
    'all' {
        Write-Host "📱 Probando: Todas las Apps" -ForegroundColor Green
        Write-Host ""
        Write-Host "Usuarios disponibles:" -ForegroundColor Cyan
        Write-Host "  Admin:      admin@autodealers.test / Admin123!" -ForegroundColor White
        Write-Host "  Dealer:     dealer@autodealers.test / Dealer123!" -ForegroundColor White
        Write-Host "  Seller:     seller@autodealers.test / Seller123!" -ForegroundColor White
        Write-Host "  Advertiser: advertiser@autodealers.test / Advertiser123!" -ForegroundColor White
        Write-Host "  Public:     No requiere login" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "La aplicación se abrirá en Chrome." -ForegroundColor Yellow
Write-Host "URL fija: http://localhost:8080" -ForegroundColor Green
Write-Host "Inicia sesión con el usuario correspondiente para probar cada app." -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona 'r' para hot reload, 'R' para hot restart, 'q' para salir" -ForegroundColor Gray
Write-Host ""

flutter run -d chrome --web-port=8080

Set-Location ".."


