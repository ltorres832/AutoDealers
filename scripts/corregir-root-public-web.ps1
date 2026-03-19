# Corregir Root Directory del proyecto public-web
Write-Host "🔧 Corrigiendo Root Directory..." -ForegroundColor Cyan

$auth = Get-Content "$env:USERPROFILE\.vercel\auth.json" | ConvertFrom-Json
$token = $auth.token

$project = Get-Content "c:\Users\ltorr\AutoDealers\apps\public-web\.vercel\project.json" | ConvertFrom-Json
$teamId = $project.orgId
$projectId = $project.projectId
$projectName = $project.projectName

Write-Host "Proyecto: $projectName" -ForegroundColor Yellow
Write-Host "Project ID: $projectId" -ForegroundColor Gray

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$projectId?teamId=$teamId"
$body = @{
    rootDirectory = "apps/public-web"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "✅ Root Directory actualizado a: $($result.rootDirectory)" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Ahora puedes desplegar:" -ForegroundColor Cyan
    Write-Host "   cd apps/public-web" -ForegroundColor White
    Write-Host "   vercel --prod" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configúralo manualmente:" -ForegroundColor Yellow
    Write-Host "   https://vercel.com/ltorres832s-projects/$projectName/settings" -ForegroundColor White
}


