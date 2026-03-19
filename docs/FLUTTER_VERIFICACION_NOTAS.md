# Verificación de notas (Flutter + Admin + Advertiser)

## 1. Advertiser en producción – URL base

- **Dónde:** `autodealers_flutter/lib/core/config/api_config.dart`
- **Variable:** `kAdvertiserApiBaseUrl` usa `String.fromEnvironment('ADVERTISER_API_BASE_URL', defaultValue: 'http://localhost:3001')`.
- **Producción:** Al compilar/buildear la app Flutter, hay que pasar la URL de la app Next.js de advertiser:
  ```bash
  flutter build web --dart-define=ADVERTISER_API_BASE_URL=https://tu-dominio-advertiser.com
  ```
  O en un script/CI:
  ```bash
  flutter build apk --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.ejemplo.com
  ```
- **Desarrollo:** Por defecto se usa `http://localhost:3001`. Ajusta el puerto si tu app advertiser corre en otro (por ejemplo 3002).

---

## 2. Next.js Advertiser – Token Firebase en Authorization: Bearer

- **Dónde:** `apps/advertiser/src/lib/auth.ts`
- **Comportamiento:** `verifyAuth()` ya:
  1. Lee el header `Authorization` y quita el prefijo `Bearer `.
  2. Si no hay header, usa la cookie `authToken`.
  3. Primero intenta verificar el token como **Firebase ID token** con `admin.auth().verifyIdToken(token)`.
  4. Si falla, intenta decodificar un token de sesión base64 (login propio del advertiser).
- **Conclusión:** La app Next.js de advertiser **ya acepta** el token de Firebase en `Authorization: Bearer <idToken>`. No hace falta cambio para que Flutter (que envía ese header) funcione.

---

## 3. Cloud Function `updateMembership` (Admin – edición de membresías)

- **Antes:** No existía la función `updateMembership` en Firebase; la edición de membresías desde Flutter Admin fallaba.
- **Ahora:** Añadida en `functions/src/billing/subscriptions.ts`:
  - Solo usuarios con **rol admin** (`auth.token.role === 'admin'`) pueden llamarla.
  - Recibe `membershipId` y `updates`.
  - Llama a `updateMembership` de `@autodealers/billing` y a `syncMembershipFeaturesToTenants` de `@autodealers/core`.
  - Devuelve la membresía actualizada.
- **Despliegue:** Tras el cambio hay que desplegar de nuevo las Cloud Functions:
  ```bash
  cd functions && npm run deploy
  # o el comando que use el proyecto (firebase deploy --only functions, etc.)
  ```

---

## 4. Flutter analyze

- Se ejecutó `flutter analyze --no-fatal-infos` en el proyecto Flutter y **terminó sin errores**.

---

## 5. Acciones de despliegue (resumen)

### 5.1 Cloud Functions (Firebase)

- Para que la **edición de membresías** (Admin) funcione desde Flutter, la Cloud Function `updateMembership` debe estar desplegada:
  ```bash
  cd functions && npm run deploy
  # o: firebase deploy --only functions
  ```
- Cuando exista la Cloud Function o API para **solicitudes multi-dealer**, desplegarla para que la pantalla Admin pueda cargar solicitudes.

### 5.2 Flutter – compilación para producción

- **URL del backend Advertiser** (crear/ver anuncios, facturación):
  ```bash
  flutter build web --dart-define=ADVERTISER_API_BASE_URL=https://tu-dominio-advertiser.com
  ```
- **URL del backend Admin** (crear usuario, tenant, membresía vía REST):
  ```bash
  flutter build web --dart-define=ADMIN_API_BASE_URL=https://tu-dominio-admin.com
  ```
- **Contacto público** (WhatsApp y teléfono en la web):
  ```bash
  flutter build web \
    --dart-define=CONTACT_PHONE=34600000000 \
    --dart-define=CONTACT_WHATSAPP=34600000000
  ```
- Ejemplo combinado:
  ```bash
  flutter build web \
    --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.ejemplo.com \
    --dart-define=ADMIN_API_BASE_URL=https://admin.ejemplo.com \
    --dart-define=CONTACT_PHONE=34600000000 \
    --dart-define=CONTACT_WHATSAPP=34600000000
  ```


