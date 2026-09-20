<#
.SYNOPSIS
  Despliega public-web, seller y dealer (fix OG + anuncios sociales) y verifica Open Graph.

.DESCRIPTION
  1. Valida builds locales (opcional)
  2. Despliega App Hosting: public-web-app, seller-app, dealer-app (+ hosting para public)
  3. Espera el rollout y comprueba og:image / og:title en producción

.PARAMETER SellerId
  ID del vendedor para verificar https://www.autodealers-online.com/seller/{id}

.PARAMETER DealerId
  ID del dealer para verificar https://www.autodealers-online.com/dealer/{id}

.PARAMETER SkipBuild
  Omite npm run build:public|seller|dealer antes del deploy.

.PARAMETER SkipDeploy
  Solo ejecuta la verificación OG (sin firebase deploy).

.PARAMETER IncludeAdmin
  También despliega admin-app (defer de anuncio social vía webhook Stripe).

.PARAMETER WaitSeconds
  Segundos entre reintentos de verificación OG (default: 30).

.PARAMETER MaxOgAttempts
  Reintentos máximos de verificación OG (default: 12 ≈ 6 min).

.EXAMPLE
  .\scripts\deploy-social-og-fix.ps1 -SellerId "abc123" -DealerId "def456"

.EXAMPLE
  .\scripts\deploy-social-og-fix.ps1 -SkipBuild -SellerId "abc123"
#>

param(
  [string]$SellerId = "",
  [string]$DealerId = "",
  [switch]$SkipBuild,
  [switch]$SkipDeploy,
  [switch]$IncludeAdmin,
  [int]$WaitSeconds = 30,
  [int]$MaxOgAttempts = 12,
  [string]$BaseUrl = "https://www.autodealers-online.com",
  [string]$FirebaseProject = "autodealers-7f62e"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "OK $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Write-Err([string]$Message) {
  Write-Host "ERROR $Message" -ForegroundColor Red
}

function Invoke-NpmBuild([string]$Label, [string]$ScriptName) {
  Write-Host "  build: $Label..." -ForegroundColor Gray
  npm run $ScriptName
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo npm run $ScriptName"
  }
  Write-Ok "$Label compilado"
}

function Invoke-FirebaseDeploy([string]$Target, [string]$Label) {
  Write-Host "  deploy: $Label ($Target)..." -ForegroundColor Gray
  firebase deploy --only $Target
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo firebase deploy --only $Target"
  }
  Write-Ok "$Label desplegado"
}

function Get-OpenGraphFromHtml([string]$Html) {
  $ogImage = $null
  $ogTitle = $null
  $ogDescription = $null

  $imagePatterns = @(
    'property=["'']og:image["'']\s+content=["'']([^"'']+)["'']',
    'content=["'']([^"'']+)["'']\s+property=["'']og:image["'']',
    'name=["'']og:image["'']\s+content=["'']([^"'']+)["'']'
  )
  foreach ($pattern in $imagePatterns) {
    if ($Html -match $pattern) {
      $ogImage = $Matches[1]
      break
    }
  }

  $titlePatterns = @(
    'property=["'']og:title["'']\s+content=["'']([^"'']+)["'']',
    'content=["'']([^"'']+)["'']\s+property=["'']og:title["'']'
  )
  foreach ($pattern in $titlePatterns) {
    if ($Html -match $pattern) {
      $ogTitle = $Matches[1]
      break
    }
  }

  $descPatterns = @(
    'property=["'']og:description["'']\s+content=["'']([^"'']+)["'']',
    'content=["'']([^"'']+)["'']\s+property=["'']og:description["'']'
  )
  foreach ($pattern in $descPatterns) {
    if ($Html -match $pattern) {
      $ogDescription = $Matches[1]
      break
    }
  }

  return @{
    OgImage       = $ogImage
    OgTitle       = $ogTitle
    OgDescription = $ogDescription
  }
}

function Test-OpenGraphUrl {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Label
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 60
    $og = Get-OpenGraphFromHtml -Html $response.Content

    $isGenericLogo = $false
    if ($og.OgImage -match 'ad-platform-logo|platform-logo|brand/ad-platform') {
      $isGenericLogo = $true
    }

    $ok = [bool]$og.OgImage -and [bool]$og.OgTitle -and -not $isGenericLogo

    return @{
      Label         = $Label
      Url           = $Url
      Ok            = $ok
      OgImage       = $og.OgImage
      OgTitle       = $og.OgTitle
      OgDescription = $og.OgDescription
      IsGenericLogo = $isGenericLogo
      StatusCode    = [int]$response.StatusCode
    }
  }
  catch {
    return @{
      Label = $Label
      Url   = $Url
      Ok    = $false
      Error = $_.Exception.Message
    }
  }
}

function Wait-And-Verify-OpenGraph {
  param(
    [string]$Path,
    [string]$Label,
    [string]$MemberId
  )

  if (-not $MemberId) {
    Write-Warn "Sin ID para $Label — omitiendo verificación OG."
    return $null
  }

  $url = "$BaseUrl$Path$MemberId"
  Write-Host ""
  Write-Host "Verificando OG: $Label" -ForegroundColor White
  Write-Host "  URL: $url" -ForegroundColor Gray

  $last = $null
  for ($attempt = 1; $attempt -le $MaxOgAttempts; $attempt++) {
    $last = Test-OpenGraphUrl -Url $url -Label $Label

    if ($last.Ok) {
      Write-Ok "$Label — og:image y og:title presentes"
      Write-Host "  og:title: $($last.OgTitle)" -ForegroundColor Gray
      Write-Host "  og:image: $($last.OgImage)" -ForegroundColor Gray
      return $last
    }

    $reason = if ($last.Error) { $last.Error }
    elseif ($last.IsGenericLogo) { "og:image sigue siendo logo genérico de plataforma" }
    elseif (-not $last.OgImage) { "falta og:image" }
    else { "falta og:title o validación incompleta" }

    Write-Warn "Intento $attempt/$MaxOgAttempts — $reason"
    if ($attempt -lt $MaxOgAttempts) {
      Start-Sleep -Seconds $WaitSeconds
    }
  }

  Write-Err "$Label — verificación OG no pasó tras $MaxOgAttempts intentos"
  if ($last.OgImage) { Write-Host "  og:image: $($last.OgImage)" -ForegroundColor Gray }
  if ($last.OgTitle) { Write-Host "  og:title: $($last.OgTitle)" -ForegroundColor Gray }
  if ($last.Error) { Write-Host "  error: $($last.Error)" -ForegroundColor Gray }

  return $last
}

# --- main ---

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
Write-Host "Repo: $repoRoot" -ForegroundColor Gray

Write-Step "Pre-requisitos"
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
  throw "Firebase CLI no encontrado. Instala: npm install -g firebase-tools"
}
$firebaseVersion = firebase --version 2>&1
Write-Host "  firebase: $firebaseVersion" -ForegroundColor Gray

firebase use $FirebaseProject
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo seleccionar el proyecto Firebase '$FirebaseProject'. Ejecuta: firebase login"
}
Write-Ok "Proyecto Firebase: $FirebaseProject"

if (-not $SkipBuild -and -not $SkipDeploy) {
  Write-Step "Build local (validación previa)"
  Invoke-NpmBuild "public-web" "build:public"
  Invoke-NpmBuild "seller" "build:seller"
  Invoke-NpmBuild "dealer" "build:dealer"
}

if (-not $SkipDeploy) {
  Write-Step "Deploy Firebase App Hosting"
  Invoke-FirebaseDeploy "apphosting:public-web-app" "public-web-app"
  Invoke-FirebaseDeploy "hosting" "hosting (rewrite → public-web-app)"
  Invoke-FirebaseDeploy "apphosting:seller-app" "seller-app"
  Invoke-FirebaseDeploy "apphosting:dealer-app" "dealer-app"

  if ($IncludeAdmin) {
    Invoke-FirebaseDeploy "apphosting:admin-app" "admin-app"
  }
}
else {
  Write-Warn "SkipDeploy activo — no se ejecutó firebase deploy"
}

Write-Step "Estado backends"
firebase apphosting:backends:list 2>&1 | Out-Host

Write-Step "Verificación Open Graph"
Write-Host "Esperando rollout inicial ($WaitSeconds s)..." -ForegroundColor Gray
Start-Sleep -Seconds $WaitSeconds

$sellerResult = Wait-And-Verify-OpenGraph -Path "/seller/" -Label "Seller" -MemberId $SellerId
$dealerResult = Wait-And-Verify-OpenGraph -Path "/dealer/" -Label "Dealer" -MemberId $DealerId

Write-Step "Resumen"
$deployed = if ($SkipDeploy) { "omitido" } else { "public-web + seller + dealer" + $(if ($IncludeAdmin) { " + admin" } else { "" }) }
Write-Host "  Deploy: $deployed" -ForegroundColor White

$checks = @($sellerResult, $dealerResult) | Where-Object { $_ -ne $null }
if ($checks.Count -eq 0) {
  Write-Warn "No se verificó OG. Pasa -SellerId y/o -DealerId para comprobar metadatos."
  Write-Host ""
  Write-Host "Ejemplo:" -ForegroundColor Gray
  Write-Host "  .\scripts\deploy-social-og-fix.ps1 -SkipDeploy -SellerId TU_SELLER_ID -DealerId TU_DEALER_ID" -ForegroundColor Gray
  exit 0
}

$failed = @($checks | Where-Object { -not $_.Ok })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Warn "Algunas verificaciones fallaron. El rollout puede tardar más."
  Write-Host "  Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/" -ForegroundColor Gray
  exit 1
}

Write-Ok "Deploy y verificación OG completados"
Write-Host ""
Write-Host "Tip: refresca caché de Facebook para posts ya publicados:" -ForegroundColor Gray
Write-Host "  https://developers.facebook.com/tools/debug/" -ForegroundColor Gray
exit 0
