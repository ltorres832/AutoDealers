# Script para crear todos los secrets necesarios en Google Cloud Secret Manager
# Para Firebase App Hosting del proyecto autodealers-7f62e

$PROJECT = "autodealers-7f62e"

# Función para crear o actualizar un secret
function Set-Secret {
    param($Name, $Value)
    
    Write-Host "Configurando secret: $Name" -ForegroundColor Cyan
    
    # Verificar si el secret existe
    $exists = gcloud secrets describe $Name --project=$PROJECT 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        # Crear el secret
        Write-Host "  Creando nuevo secret..." -ForegroundColor Yellow
        $Value | gcloud secrets create $Name --project=$PROJECT --data-file=- 2>&1
    } else {
        # Actualizar el secret existente
        Write-Host "  Actualizando version del secret..." -ForegroundColor Yellow
        $Value | gcloud secrets versions add $Name --project=$PROJECT --data-file=- 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $Name configurado correctamente" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error configurando $Name" -ForegroundColor Red
    }
}

# Firebase Web Config (Public)
Set-Secret "NEXT_PUBLIC_FIREBASE_API_KEY" "AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44"
Set-Secret "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "autodealers-7f62e.firebaseapp.com"
Set-Secret "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "857179023916"
Set-Secret "NEXT_PUBLIC_FIREBASE_APP_ID" "1:857179023916:web:31fb898acfb33b87b1bf89"

# Firebase Admin SDK (Private)
Set-Secret "FIREBASE_CLIENT_EMAIL" "firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com"

# La private key necesita formato especial
$privateKey = @"
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDO4lsWCkiU0WSo
StqusL1iU1A++a+nVO/FGcm7h8dGwcg1bYRtK4Vs36Br1OVTgUqw4g3vkr2HRGc6
QakXwcx0Wzf9mMQ1zpAjGGw1s8hYeYpOJUPT8rtWGKW+KdvBgLyhZTMVsH3Qe4yT
0a7aNqXQAHYIT1BNcQ/zkF/QqguUy/uQnt28Xrt/sJNGepXicRfyJanvYPbqSeGf
MkibmxwGacZPa3pEECPhjtpGT2fnpPvqq/gLJ2l+t7fIC26fGBbHA3DxxXKFjaZM
1YOH8ZRnQZCTkLYlb3hbTQmPPlzQvRLOi4DCOi5ttk1dYgJ23GIKUBDq+DKAnAak
vC1iglfHAgMBAAECggEAF6e3HYKIgQeeOEXy0jWgOe1nyAOZq4rhLYrAz8H7LaJ7
p2xBz4/B3kyFlb7Oh+lJJod6a3G+XQibuwQF9xLwMz+427TLfpGDVpf0y4Emf8NJ
5pyJMGNZO0NvNBqqJ2p2ZwfguvKmuB9gWAiKMyY7eFiNJm8XMfujBMj1w7ClyVoC
vEp8Cgbkt459cVDoRS66VPyNv6nKQVI/FT2DVnqeVFI3jCZR/1yA4BcQWoSdirMD
TWIGyD/CapZrrOG3NIkFPeOgrTkZBJR3dlMHwKVfMQKFZJVPYbPKK5ohnbzTvNNT
nDZ7SkpTY1yMb2nHBCCQpswDTghADl6BsyTocKmoEQKBgQD40WEIhYslsjlu8N8y
+Radf1HushjQwL75R0bwpVPMNN+oIWmy2zGr5iPCLW85aPt2J3ZObSLHt3pu5jjM
ep46oql7uKHnuZNbvseVencMimwnKEO3Q229bhcTLcan1rgG+qEVUWUfU68SbNuX
nkqZwZg5GLUxbdzNEW3VXEfY1wKBgQDU2xxpBQ2rwQXkTXbYnev18LRPf8dXKktM
qdJZyj54WtsbCpFCHeGe4/exkkZYBrJ5IDT9obBuhaKRnyyzdFu8X6DpfkrWoegU
uKOG24LWfiBv2vSVSOZRmx+/wjgP7iVZdjQgSkIimjFTb4keYCAPvZV9Hf/EvMYW
3Fe8W8TqkQKBgFTpNyDuWd8CZEEs6C5//KzAz1gS5Q8QR9vP7DChauhsPssko+qK
jPfpsNhKIwPHhND8hI4dBlp7jcecv1NgoPDHo+j5yB7JILWVdIzZXxkjf+cZAYrf
8upLUIqV+445Y1HWY/Rfc4/uQfeauJGUTkcMXwNVIDh/EnPU99NxC3+/AoGAWV8q
fZnmlI/2Jla0KN2d3mTTgHG5RAr5FNZVAOhe9G/JgYAdX3Jmci1rqb4uFPWy6BKy
zS+fgbhQeu4nea3Ier54NLGXQKk4ZcLkvlHajK7mdbCscyXptqf4W65zlZS7T+XG
mywyuo6dWVgCbaOUsqc6Zg87feJ5Fc4sdGTfuFECgYEAgRC94eND/F4Zrilt58sQ
z9cmJB1Nv7NQ81O2goFiWhn8eXCCMYXCSLy4B/O71mXkmhZf7pzWAd6Xkgrbb1Gs
RtRBMklcHu0GIHL20cCAML3jVuazAlVrm3Zm6c/C7q6f9QQG9MB4Vbbk8vTDAlcF
HEO55QHqrIrJokQYy8kwPSQ=
-----END PRIVATE KEY-----
"@

Set-Secret "FIREBASE_PRIVATE_KEY" $privateKey

# Meta
Set-Secret "META_VERIFY_TOKEN" "5K6AIkuSbZqPwrUXoiyW7ECQ1jza4HOLTn3VtBv0cNp9mfGlexgD82YMhdFJRs"

# Stripe (placeholders - el usuario debe cambiarlos por los reales)
Set-Secret "STRIPE_SECRET_KEY" "sk_live_REPLACE_WITH_REAL_KEY"
Set-Secret "STRIPE_WEBHOOK_SECRET" "whsec_REPLACE_WITH_REAL_KEY"

# NextAuth
Set-Secret "NEXTAUTH_SECRET" "autodealers-production-secret-key-change-this"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Secrets configurados exitosamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Actualiza los siguientes secrets con valores reales:" -ForegroundColor Yellow
Write-Host "  - STRIPE_SECRET_KEY (obtener de dashboard.stripe.com)" -ForegroundColor Yellow
Write-Host "  - STRIPE_WEBHOOK_SECRET (obtener de Stripe Webhooks)" -ForegroundColor Yellow
Write-Host "  - NEXTAUTH_SECRET (generar uno seguro)" -ForegroundColor Yellow
