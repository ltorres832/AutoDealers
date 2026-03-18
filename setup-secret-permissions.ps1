# Script para dar acceso a la cuenta de servicio de Firebase App Hosting a todos los secrets
$PROJECT = "autodealers-7f62e"
$SERVICE_ACCOUNT = "serviceAccount:firebase-app-hosting-compute@autodealers-7f62e.iam.gserviceaccount.com"

$secrets = @(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "META_VERIFY_TOKEN",
    "NEXTAUTH_SECRET"
)

foreach ($secret in $secrets) {
    Write-Host "Dando acceso a: $secret" -ForegroundColor Cyan
    gcloud secrets add-iam-policy-binding $secret `
        --project=$PROJECT `
        --member=$SERVICE_ACCOUNT `
        --role="roles/secretmanager.secretAccessor" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ OK" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error" -ForegroundColor Red
    }
}

# También dar acceso al Cloud Build Service Account
$projectNumber = "857179023916"
$CLOUDBUILD_SA = "serviceAccount:$projectNumber@cloudbuild.gserviceaccount.com"

Write-Host ""
Write-Host "Dando acceso a Cloud Build..." -ForegroundColor Yellow

foreach ($secret in $secrets) {
    gcloud secrets add-iam-policy-binding $secret `
        --project=$PROJECT `
        --member=$CLOUDBUILD_SA `
        --role="roles/secretmanager.secretAccessor" 2>&1 | Out-Null
}

Write-Host ""
Write-Host "✅ Permisos configurados!" -ForegroundColor Green
