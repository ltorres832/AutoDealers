# Ejecutar AutoDealers Flutter Web
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTODEALERS FLUTTER - EJECUTAR" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar al proyecto
Set-Location "autodealers_flutter"

# Instalar dependencias
Write-Host "[1/3] Instalando dependencias..." -ForegroundColor Yellow
flutter pub get
Write-Host ""

# Verificar dispositivos
Write-Host "[2/3] Dispositivos disponibles:" -ForegroundColor Yellow
flutter devices
Write-Host ""

# Ejecutar
Write-Host "[3/3] Ejecutando aplicacion..." -ForegroundColor Green
Write-Host ""
Write-Host "La aplicacion se abrira en Chrome automaticamente." -ForegroundColor Cyan
Write-Host "Presiona 'q' para detener la aplicacion." -ForegroundColor Yellow
Write-Host ""
Write-Host "Compilando..." -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome

# Volver al directorio raiz
Set-Location ".."


