# Script para limpiar caché de Next.js
Write-Host "Limpiando caché de Next.js..." -ForegroundColor Yellow

# Detener procesos Node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Eliminar caché
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "✅ Caché .next eliminada" -ForegroundColor Green
}

if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force
    Write-Host "✅ Caché de node_modules eliminada" -ForegroundColor Green
}

Write-Host "`nCaché limpiada. Ejecuta 'npm run dev' para reiniciar." -ForegroundColor Green





