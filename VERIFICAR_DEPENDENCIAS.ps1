# Script para verificar dependencias de Flutter
Write-Host "Verificando dependencias de Firebase..." -ForegroundColor Yellow
Write-Host ""

cd autodealers_flutter

Write-Host "Ejecutando flutter pub get..." -ForegroundColor Cyan
flutter pub get

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Versiones configuradas en pubspec.yaml:" -ForegroundColor Cyan
    Get-Content pubspec.yaml | Select-String -Pattern "firebase|cloud" | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    Write-Host "Revisa los errores arriba" -ForegroundColor Yellow
}

cd ..


