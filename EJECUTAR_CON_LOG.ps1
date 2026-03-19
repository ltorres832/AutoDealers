# Script con log completo
$logFile = "vercel-deploy.log"
Start-Transcript -Path $logFile -Append

Write-Host "=== INICIANDO CONFIGURACION Y DESPLIEGUE ===" -ForegroundColor Green

# 1. Verificar auth
Write-Host "Verificando autenticacion..." -ForegroundColor Yellow
vercel whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No autenticado" -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# 2. Linkear
Write-Host "Linkeando proyecto..." -ForegroundColor Yellow
Set-Location "apps\public-web"
Remove-Item ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
vercel link --yes --project=autodealers-public-web

# 3. Configurar Root Directory
Write-Host "Configurando Root Directory..." -ForegroundColor Yellow
$authPath = "$env:USERPROFILE\.vercel\auth.json"
if (Test-Path $authPath) {
    $auth = Get-Content $authPath | ConvertFrom-Json
    $config = Get-Content "$env:USERPROFILE\.vercel\config.json" | ConvertFrom-Json
    
    $url = "https://api.vercel.com/v9/projects/autodealers-public-web?teamId=$($config.currentTeam)"
    $headers = @{
        "Authorization" = "Bearer $($auth.token)"
        "Content-Type" = "application/json"
    }
    $body = @{rootDirectory = "apps/public-web"} | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
        Write-Host "Root Directory configurado: $($result.rootDirectory)" -ForegroundColor Green
    } catch {
        Write-Host "Error configurando: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Desplegar
Write-Host "Desplegando..." -ForegroundColor Yellow
vercel --prod

Stop-Transcript
Write-Host ""
Write-Host "Log guardado en: $logFile" -ForegroundColor Cyan
Write-Host "Revisa el log para ver detalles completos" -ForegroundColor Yellow

Set-Location "../.."


