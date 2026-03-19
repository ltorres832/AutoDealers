# Script para configurar Root Directory de public-web
Write-Host "🔧 Configurando Root Directory para public-web..." -ForegroundColor Cyan

# Obtener token
$authFile = "$env:USERPROFILE\.vercel\auth.json"
if (-not (Test-Path $authFile)) {
    Write-Host "❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

$auth = Get-Content $authFile | ConvertFrom-Json
$token = $auth.token
Write-Host "✅ Token obtenido" -ForegroundColor Green

# Obtener información del proyecto
$projectJsonPath = "c:\Users\ltorr\AutoDealers\apps\public-web\.vercel\project.json"
if (-not (Test-Path $projectJsonPath)) {
    Write-Host "❌ Proyecto no vinculado. Ejecuta: cd apps/public-web && vercel link" -ForegroundColor Red
    exit 1
}

$project = Get-Content $projectJsonPath | ConvertFrom-Json
$teamId = $project.orgId
$projectId = $project.projectId
$projectName = $project.projectName

Write-Host "📦 Proyecto: $projectName" -ForegroundColor Yellow
Write-Host "   ID: $projectId" -ForegroundColor Gray
Write-Host "   Team: $teamId" -ForegroundColor Gray

# Configurar Root Directory
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$projectId?teamId=$teamId"
$body = @{
    rootDirectory = "apps/public-web"
} | ConvertTo-Json

Write-Host ""
Write-Host "📝 Actualizando Root Directory a 'apps/public-web'..." -ForegroundColor Yellow

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
    Write-Host "✅ Root Directory configurado correctamente!" -ForegroundColor Green
    Write-Host "   Root Directory: $($result.rootDirectory)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Ahora puedes desplegar:" -ForegroundColor Cyan
    Write-Host "   cd apps/public-web" -ForegroundColor White
    Write-Host "   vercel --prod" -ForegroundColor White
} catch {
    Write-Host "❌ Error al configurar Root Directory" -ForegroundColor Red
    Write-Host "   Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status: $statusCode" -ForegroundColor Red
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Detalles: $responseBody" -ForegroundColor Gray
        } catch {
            # Ignorar errores al leer respuesta
        }
    }
    exit 1
}


