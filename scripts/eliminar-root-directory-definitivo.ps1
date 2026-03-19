# Eliminar Root Directory completamente
Write-Host "🔧 ELIMINANDO ROOT DIRECTORY..." -ForegroundColor Cyan
Write-Host ""

$auth = Get-Content "$env:USERPROFILE\.vercel\auth.json" | ConvertFrom-Json
$token = $auth.token

$project = Get-Content "c:\Users\ltorr\AutoDealers\.vercel\project.json" | ConvertFrom-Json
$teamId = $project.orgId
$projectId = $project.projectId

Write-Host "Proyecto ID: $projectId" -ForegroundColor Yellow
Write-Host "Team ID: $teamId" -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$projectId?teamId=$teamId"

# Primero obtener el proyecto actual
try {
    $current = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "Root Directory actual: '$($current.rootDirectory)'" -ForegroundColor Gray
} catch {
    Write-Host "No se pudo obtener proyecto actual" -ForegroundColor Yellow
}

# Eliminar Root Directory enviando null explícitamente
Write-Host "Eliminando Root Directory..." -ForegroundColor Yellow

$body = @{
    rootDirectory = $null
} | ConvertTo-Json -Depth 10

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "✅ Root Directory eliminado exitosamente" -ForegroundColor Green
    Write-Host "   Root Directory ahora: '$($result.rootDirectory)'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Ahora despliega:" -ForegroundColor Cyan
    Write-Host "   cd c:\Users\ltorr\AutoDealers" -ForegroundColor White
    Write-Host "   vercel --prod" -ForegroundColor White
} catch {
    Write-Host "❌ Error al eliminar Root Directory" -ForegroundColor Red
    Write-Host "   Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Respuesta: $responseBody" -ForegroundColor Gray
        } catch {
            Write-Host "   No se pudo leer respuesta" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Configúralo manualmente en:" -ForegroundColor Yellow
    Write-Host "   https://vercel.com/ltorres832s-projects/public-web/settings" -ForegroundColor White
    Write-Host "   Deja el Root Directory VACÍO" -ForegroundColor White
}


