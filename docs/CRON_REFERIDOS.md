# Cron de referidos (3:00 AM)

Automatiza el otorgamiento de recompensas tras 14 días.

## Resumen

| Componente | Rol |
|------------|-----|
| `confirmReferralRewardsDaily` | Cloud Function programada (3:00 America/Puerto_Rico) |
| `POST /api/admin/cron/confirm-referrals` | Endpoint en admin-app (procesa tareas) |
| `CRON_SECRET` | Mismo valor en **admin-app** y **Functions** |
| `ADMIN_APP_URL` | URL del admin (opcional; hay valor por defecto) |

## Paso 1 — Generar el secreto

En PowerShell:

```powershell
# Genera 32 bytes en base64 (guárdalo en un gestor de contraseñas)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copia el resultado (ej. `K7x9mP2...`). Ese valor es tu **CRON_SECRET**.

## Paso 2 — Secreto en admin-app (App Hosting)

1. Abre [Firebase Console](https://console.firebase.google.com/) → proyecto **autodealers-7f62e**.
2. **App Hosting** → backend **admin-app** → **Environment variables** / **Secrets**.
3. Crea o edita el secreto **`CRON_SECRET`** con el valor del paso 1.
4. Redespliega admin-app:

```powershell
cd C:\Users\ltorr\AutoDealers
firebase deploy --only apphosting:admin-app
```

## Paso 3 — Secreto en Cloud Functions

En la raíz del repo, con Firebase CLI logueado (`firebase login`):

```powershell
cd C:\Users\ltorr\AutoDealers

# Te pedirá pegar el valor (mismo CRON_SECRET del paso 1)
firebase functions:secrets:set CRON_SECRET
```

Opcional — URL del admin (solo si cambia):

```powershell
firebase functions:secrets:set ADMIN_APP_URL
# Valor: https://admin-app--autodealers-7f62e.us-central1.hosted.app
```

> `ADMIN_APP_URL` usa `defineString` con valor por defecto; no es obligatorio si usas la URL de App Hosting del admin.

## Paso 4 — Compilar y desplegar la función

```powershell
cd C:\Users\ltorr\AutoDealers\functions
npm run build
cd ..

firebase deploy --only functions:confirmReferralRewardsDaily
```

Si el filtro falla, despliega todas las functions:

```powershell
firebase deploy --only functions
```

La primera vez, Firebase puede pedir habilitar **Cloud Scheduler** y **Secret Manager** en el proyecto (acepta en consola o con el enlace que muestre la CLI).

## Paso 5 — Verificar

### A) Logs de la función (después de las 3:00 AM o una ejecución manual)

```powershell
firebase functions:log --only confirmReferralRewardsDaily
```

### B) Probar el endpoint con el secreto (PowerShell)

```powershell
$secret = "TU_CRON_SECRET_AQUI"
$headers = @{ Authorization = "Bearer $secret" }
Invoke-RestMethod `
  -Uri "https://admin-app--autodealers-7f62e.us-central1.hosted.app/api/admin/cron/confirm-referrals" `
  -Method POST `
  -Headers $headers
```

Respuesta esperada: `success: true`, `processed`, `skipped`, `errors`.

### C) Sin terminal — panel admin

**Admin → Gestión de Referidos →** botón **Procesar recompensas (14 días)** (usa tu sesión admin, no requiere `CRON_SECRET`).

## Alternativa: Cloud Scheduler (sin Cloud Function)

Si prefieres no usar `confirmReferralRewardsDaily`:

```powershell
$env:CRON_SECRET = "TU_CRON_SECRET_AQUI"
$env:ADMIN_APP_URL = "https://admin-app--autodealers-7f62e.us-central1.hosted.app"
node scripts/setup-referral-confirmation-cron.mjs
```

(Requiere `gcloud` instalado y autenticado.)

## Problemas frecuentes

| Error | Solución |
|-------|----------|
| `No function matches the filter` | `cd functions && npm run build` y luego `firebase deploy --only functions:confirmReferralRewardsDaily` |
| `CRON_SECRET no configurado` | `firebase functions:secrets:set CRON_SECRET` y volver a desplegar la función |
| HTTP 401 en el cron | El secreto de Functions y admin-app no coinciden |
| `curl -X` en PowerShell | Usa `Invoke-RestMethod` (ver paso 5B) |
