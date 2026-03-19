# Script para dar acceso a secrets usando el comando oficial de Firebase
$PROJECT = "autodealers-7f62e"
$BACKEND = "public-web-app"

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
    Write-Host "Granting access to: $secret" -ForegroundColor Cyan
    firebase apphosting:secrets:grantaccess $secret --project $PROJECT --backend $BACKEND --non-interactive 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ OK" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Re-verifying IAM policies for $secret..." -ForegroundColor Gray
gcloud secrets get-iam-policy NEXT_PUBLIC_FIREBASE_API_KEY --project $PROJECT
