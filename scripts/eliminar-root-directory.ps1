# Eliminar Root Directory del proyecto
Write-Host "🔧 Eliminando Root Directory..." -ForegroundColor Cyan

$auth = Get-Content "$env:USERPROFILE\.vercel\auth.json" | ConvertFrom-Json
$token = $auth.token

$project = Get-Content "c:\Users\ltorr\AutoDealers\apps\public-web\.vercel\project.json" | ConvertFrom-Json
$teamId = $project.orgId
$projectId = $project.projectId

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$projectId?teamId=$teamId"

# Enviar null para eliminar Root Directory
$body = '{"rootDirectory":null}'

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "✅ Root Directory eliminado" -ForegroundColor Green
    Write-Host "   Root Directory actual: $($result.rootDirectory)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}


