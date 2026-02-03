# Script para crear sitios adicionales en Firebase Hosting
# Ejecutar: .\scripts\create-firebase-sites.ps1

Write-Host "`n🌐 Creando sitios adicionales en Firebase Hosting...`n" -ForegroundColor Cyan

$sites = @(
    "autodealers-admin",
    "autodealers-dealer", 
    "autodealers-seller",
    "autodealers-advertiser"
)

foreach ($site in $sites) {
    Write-Host "Creando sitio: $site..." -ForegroundColor Yellow
    firebase hosting:sites:create $site
    Start-Sleep -Seconds 2
}

Write-Host "`n✅ Sitios creados!`n" -ForegroundColor Green
Write-Host "Ahora configura los targets:" -ForegroundColor Cyan
Write-Host "  firebase target:apply hosting admin-panel autodealers-admin"
Write-Host "  firebase target:apply hosting dealer-dashboard autodealers-dealer"
Write-Host "  firebase target:apply hosting seller-dashboard autodealers-seller"
Write-Host "  firebase target:apply hosting advertiser-dashboard autodealers-advertiser"



