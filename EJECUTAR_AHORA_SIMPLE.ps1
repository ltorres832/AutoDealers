# Script simple para ejecutar AutoDealers Flutter
Write-Host "Ejecutando AutoDealers Flutter..." -ForegroundColor Green
Write-Host ""

cd autodealers_flutter

Write-Host "Instalando dependencias..." -ForegroundColor Yellow
flutter pub get

Write-Host ""
Write-Host "Iniciando aplicacion en Chrome..." -ForegroundColor Green
Write-Host "Presiona 'q' para detener" -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome

cd ..


