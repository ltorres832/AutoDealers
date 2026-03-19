# Script para compilar Flutter Web
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPILANDO FLUTTER WEB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "autodealers_flutter"

Write-Host "[1/4] Verificando Flutter..." -ForegroundColor Yellow
flutter --version | Select-Object -First 3
Write-Host ""

Write-Host "[2/4] Obteniendo dependencias..." -ForegroundColor Yellow
flutter pub get
Write-Host ""

Write-Host "[3/4] Compilando para Web (Release)..." -ForegroundColor Yellow
Write-Host "Esto puede tardar varios minutos..." -ForegroundColor Gray
Write-Host ""

$buildOutput = flutter build web --release 2>&1 | Out-String
$buildOutput | Out-File -FilePath "build_output.log" -Encoding UTF8

Write-Host $buildOutput
Write-Host ""

Write-Host "[4/4] Verificando resultado..." -ForegroundColor Yellow
if (Test-Path "build\web\index.html") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ BUILD EXITOSO" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Archivos generados en: build\web\" -ForegroundColor White
    $files = Get-ChildItem "build\web" -Recurse -File | Measure-Object
    Write-Host "Total de archivos: $($files.Count)" -ForegroundColor White
    Write-Host ""
    Write-Host "Para probar la aplicación:" -ForegroundColor Cyan
    Write-Host "  flutter run -d chrome" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ BUILD FALLIDO" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa el archivo build_output.log para más detalles" -ForegroundColor Yellow
    Write-Host ""
    if (Test-Path "build_output.log") {
        Write-Host "Últimas líneas del log:" -ForegroundColor Yellow
        Get-Content "build_output.log" | Select-Object -Last 30
    }
}

Set-Location ".."


