# Dominios autorizados para Firebase Authentication (`autodealers-7f62e`)

Si ves errores del tipo `auth/requests-from-referer-https://...-are-blocked`, hay que **añadir el host** en la consola de Firebase (y, si aplica, en la **API key** de Google Cloud).

## 1. Firebase Console → Authentication → Authorized domains

Abre: [Authentication – Settings – Authorized domains](https://console.firebase.google.com/project/autodealers-7f62e/authentication/settings)

Añade **cada dominio sin `https://`** (solo el host). Los de App Hosting en `us-central` siguen el patrón del `firebase.json` del repo:

| App | Dominio a añadir |
|-----|------------------|
| Public web | `public-web-app--autodealers-7f62e.us-central1.hosted.app` |
| Admin | `admin-app--autodealers-7f62e.us-central1.hosted.app` |
| Dealer | `dealer-app--autodealers-7f62e.us-central1.hosted.app` |
| Seller | `seller-app--autodealers-7f62e.us-central1.hosted.app` |
| Advertiser | `advertiser-app--autodealers-7f62e.us-central1.hosted.app` |

**Hosting clásico del mismo proyecto** (si lo usáis para login o enlaces):

- `autodealers-7f62e.web.app`
- `autodealers-7f62e.firebaseapp.com`

**Desarrollo local** (suelen estar ya por defecto):

- `localhost`
- `127.0.0.1`

**Dominios de negocio personalizados** (cuando los tengáis en DNS y en Hosting/App Hosting): añadid también el host raíz, por ejemplo `www.tudominio.com` y `tudominio.com`.

## 2. Google Cloud → API key (solo si restringiste por HTTP referrer)

Si la **Browser key** usada en `NEXT_PUBLIC_FIREBASE_API_KEY` tiene restricción **HTTP referrers**, en [Credentials](https://console.cloud.google.com/apis/credentials?project=autodealers-7f62e) añade referrers como:

- `https://public-web-app--autodealers-7f62e.us-central1.hosted.app/*`
- `https://admin-app--autodealers-7f62e.us-central1.hosted.app/*`
- `https://dealer-app--autodealers-7f62e.us-central1.hosted.app/*`
- `https://seller-app--autodealers-7f62e.us-central1.hosted.app/*`
- `https://advertiser-app--autodealers-7f62e.us-central1.hosted.app/*`
- `https://autodealers-7f62e.web.app/*`
- `https://autodealers-7f62e.firebaseapp.com/*`
- `http://localhost:*/*` (desarrollo)

O un patrón más amplio **solo si lo aceptáis a nivel de seguridad**, por ejemplo:

- `https://*.hosted.app/*`

## 3. Lista rápida desde el repo

En la raíz del monorepo:

```bash
node scripts/print-firebase-auth-domains.mjs
```

Copia la salida a la consola de Firebase (dominios) y, si toca, a la API key (referrers con `https://.../*`).

## 4. Canales preview de App Hosting

Las URLs de **preview** pueden tener otro subdominio. Si Auth falla solo en preview, añade ese host concreto en **Authorized domains** cuando aparezca el error (mismo flujo que arriba).
