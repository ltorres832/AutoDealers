# Deploy en Firebase Hosting (solo Firebase, sin coste adicional)

Todo el deploy se hace **solo con Firebase**: Hosting + el plan que ya tengas. No se usa Cloud Run ni Vercel, así que no hay gasto extra por servidor.

## Cómo desplegar

Desde la raíz del repo:

```bash
# 1) Construir todas las apps
npm run build:all

# 2) Generar la carpeta hosting (index.html, estáticos) para cada app
npm run prepare-hosting

# 3) Subir a Firebase Hosting
firebase deploy --only hosting
```

**Todo en un comando:**

```bash
npm run deploy:firebase
```

Eso hace build de todas las apps, ejecuta `prepare-hosting` y luego `firebase deploy --only hosting`.

## Qué tienes en producción

- **Firebase Hosting** sirve archivos estáticos (HTML, JS, CSS, `_next/static`, etc.) desde las carpetas `apps/<app>/hosting/`.
- Cada sitio tiene su URL: public-site, admin-panel, dealer-dashboard, seller-dashboard, advertiser-dashboard (según tu configuración de sitios en Firebase).
- **Sin servidor Node en Firebase:** Hosting solo entrega archivos. Las rutas API y el SSR de Next.js no se ejecutan en el servidor en esas URLs; la app puede mostrar "Cargando..." o depender de lo que funcione solo en el cliente (Firebase Auth, Firestore, etc. desde el navegador).

Para desarrollo completo (SSR, API routes) usa en local:

```bash
npm run dev
```

## Desplegar un solo sitio

```bash
npm run build:admin
npm run prepare-hosting
firebase deploy --only hosting:admin-panel
```

(Equivalente para `build:public`, `build:dealer`, etc. y su target de hosting.)

## Firebase Storage - CORS (imágenes en hosting)

Para que las imágenes de vehículos (Firebase Storage) se carguen correctamente en localhost **y** en hosting sin errores de CORS:

```bash
# Aplicar CORS al bucket de Storage (solo una vez, o si cambias storage.cors.json)
gsutil cors set storage.cors.json gs://autodealers-7f62e.firebasestorage.app
```

Si el bucket usa otro nombre, compruébalo en Firebase Console → Storage.

## Firebase App Hosting (Next.js con SSR)

Para desplegar las apps Next.js (public-web, admin, dealer, seller, advertiser):

```bash
firebase deploy --only apphosting
```

### Credenciales (evitar error UNAUTHENTICATED)

Si ves **"16 UNAUTHENTICATED: Request had invalid authentication credentials"** o **"Tenant no encontrado"** con un subdominio técnico como `t-1593654656---public-web-app-xxx`:

1. **Añade variables de entorno en Firebase Console:**
   - Ve a [Firebase Console](https://console.firebase.google.com) → tu proyecto → **App Hosting** → selecciona el backend (ej. `public-web-app`) → **Settings** → **Environment variables** o **Secrets**.

2. **Configura las credenciales de la service account:**
   - `FIREBASE_PROJECT_ID` = `autodealers-7f62e` (o tu project ID)
   - `FIREBASE_CLIENT_EMAIL` = el `client_email` del JSON de la service account
   - `FIREBASE_PRIVATE_KEY` = el `private_key` del JSON (incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`)

3. **Cómo obtener la service account:**
   - Firebase Console → Project Settings (engranaje) → **Service accounts**
   - "Generate new private key" → descarga el JSON
   - Copia `project_id`, `client_email` y `private_key` a las variables de entorno

4. **Dominio para tenants:** Usa tu dominio personalizado (ej. `autodealers-7f62e.web.app`) o configura uno. Las URLs técnicas de App Hosting (con `---` en el host) se redirigen automáticamente a la página principal.

## Errores frecuentes

- **404 al hacer `firebase deploy --only hosting`:** No suele pasar si los rewrites en `firebase.json` son solo estáticos (`"destination": "/index.html"` y `/_next/static/**`). Si en el futuro añades rewrites a Cloud Functions u otro servicio, asegúrate de que ese servicio exista y esté desplegado.
- **Pantalla en blanco o "Cargando..." en la URL desplegada:** Es esperado si la app depende de SSR o de API routes, porque en este setup Hosting no ejecuta servidor Node. La app funciona al 100% en local con `npm run dev`.
- **Imágenes de vehículos no se ven en hosting:** Verifica CORS en Storage (ver sección anterior) y que las URLs de las fotos sean válidas (Firebase Storage o URLs públicas).
- **Rollout falló / "No se pudo realizar el lanzamiento":**
  - **Static files faltantes:** Next.js standalone no copia `.next/static` ni `public/`. El script `postbuild` en `apps/public-web/package.json` los copia automáticamente.
  1. Revisa los logs del rollout: Firebase Console → App Hosting → public-web-app → click en el rollout fallido → Logs / Build logs.
  2. Si el error es "container failed to start" o similar: suele ser `runCommand` incorrecto. Con monorepo, server.js está en `apps/public-web/server.js` dentro del outputDir `.next/standalone`.
  3. `rootDir` para public-web-app debe ser `apps/public-web` (no `.`) para que use la configuración correcta.
- **UNAUTHENTICATED en App Hosting:** 
  1. Añade las credenciales (ver sección anterior). Si ya están, verifica en Firebase Console → App Hosting → tu backend → Rollouts → Logs que no haya errores al iniciar.
  2. **Bug firebase-tools 14.10.x:** Si falla tras actualizar, prueba `npm i -g firebase-tools@14.9.0` y vuelve a desplegar.
  3. El código ahora usa Application Default Credentials cuando el certificado falla o no está; asegúrate de que la service account `firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com` tenga rol "Cloud Datastore User" o "Firebase Admin SDK Administrator" en la consola de IAM.
- **"Tenant no encontrado" con subdominio t-xxx---public-web-app:** Es una URL técnica de App Hosting. La app ya redirige a `/`. Para ver tenants reales, usa el dominio base (ej. `autodealers-7f62e.web.app`) o un subdominio válido (ej. `demo.autodealers-7f62e.web.app`).

## Resumen

| Qué                | Cómo                          |
|--------------------|--------------------------------|
| Deploy (sin coste extra) | `npm run deploy:firebase`      |
| Solo Firebase      | Sí; Hosting estático          |
| Cloud Run / Vercel | No se usan en este flujo      |
