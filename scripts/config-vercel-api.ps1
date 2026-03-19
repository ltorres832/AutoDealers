# Configurar Root Directory usando API de Vercel
$ErrorActionPreference = "Continue"

# Obtener token
$vercelAuth = "$env:USERPROFILE\.vercel\auth.json"
if (-not (Test-Path $vercelAuth)) {
    Write-Host "❌ No autenticado. Ejecuta: vercel login" -ForegroundColor Red
    exit 1
}

$auth = Get-Content $vercelAuth | ConvertFrom-Json
$token = $auth.token

# Obtener team
$vercelConfig = "$env:USERPROFILE\.vercel\config.json"
$teamId = $null
if (Test-Path $vercelConfig) {
    $config = Get-Content $vercelConfig | ConvertFrom-Json
    $teamId = $config.currentTeam
}

$projects = @(
    @{name="autodealers-public-web"; rootDir="apps/public-web"},
    @{name="autodealers-admin"; rootDir="apps/admin"},
    @{name="autodealers-dealer"; rootDir="apps/dealer"},
    @{name="autodealers-seller"; rootDir="apps/seller"},
    @{name="autodealers-advertiser"; rootDir="apps/advertiser"}
)

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

foreach ($proj in $projects) {
    Write-Host "Configurando $($proj.name)..." -ForegroundColor Yellow
    
    $url = "https://api.vercel.com/v9/projects/$($proj.name)"
    if ($teamId) {
        $url += "?teamId=$teamId"
    }
    
    $body = @{
        rootDirectory = $proj.rootDir
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
        Write-Host "✅ $($proj.name) configurado: $($proj.rootDir)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  $($proj.name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "✅ Proceso completado" -ForegroundColor Green


