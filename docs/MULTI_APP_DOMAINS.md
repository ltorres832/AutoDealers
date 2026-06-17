# Dominios por app (subdominios en autodealers-online.com)

Cada panel tiene su **propio subdominio** en el mismo dominio raíz. Los concesionarios/vendedores siguen usando subdominios libres (ej. `midealer.autodealers-online.com`) en **public-web**.

## Mapa de URLs

| App | Backend App Hosting | URL producción |
|-----|---------------------|----------------|
| **Public** (web + marketplace) | `public-web-app` | https://www.autodealers-online.com |
| **Admin** | `admin-app` | https://admin.autodealers-online.com |
| **Dealers** | `dealer-app` | https://dealers.autodealers-online.com |
| **Sellers** | `seller-app` | https://sellers.autodealers-online.com |
| **Advertiser** | `advertiser-app` | https://ads.autodealers-online.com |

Apex `autodealers-online.com` → redirigir a `www` (opcional, en Firebase al conectar el dominio).

Subdominios **reservados** (no se pueden registrar como tenant): `admin`, `dealers`, `sellers`, `ads`, `www`, `api`, `app`, etc. (ver `scripts/platform-domains.mjs`).

---

## Paso 1 — Conectar cada dominio en Firebase

Repite esto **una vez por backend** (5 backends):

1. Abre [App Hosting](https://console.firebase.google.com/project/autodealers-7f62e/apphosting).
2. Entra al backend (ej. `dealer-app`) → **Settings** → **Domains** → **Add custom domain**.
3. Escribe el host (ej. `dealers.autodealers-online.com`).
4. Firebase te muestra registros DNS (CNAME y a veces TXT `_acme-challenge` / `fah-claim`).
5. Añádelos en tu registrador DNS.
6. **Verify records** y espera SSL (minutos a 24 h).

| Backend | Dominio a añadir |
|---------|------------------|
| `public-web-app` | `www.autodealers-online.com` |
| `admin-app` | `admin.autodealers-online.com` |
| `dealer-app` | `dealers.autodealers-online.com` |
| `seller-app` | `sellers.autodealers-online.com` |
| `advertiser-app` | `ads.autodealers-online.com` |

### Public-web también vía Firebase Hosting (opcional)

Si usas `firebase deploy --only hosting`, puedes conectar `www` en [Firebase Hosting](https://console.firebase.google.com/project/autodealers-7f62e/hosting/sites) en lugar de App Hosting directo. El `firebase.json` ya reescribe hacia `public-web-app`.

**No conectes el mismo host dos veces** (Hosting + App Hosting a la vez).

---

## Paso 2 — DNS en tu registrador

Ejemplo (los valores exactos los da Firebase):

| Tipo | Nombre / Host | Apunta a |
|------|---------------|----------|
| CNAME | `www` | (valor Firebase para public-web) |
| CNAME | `admin` | (valor Firebase para admin-app) |
| CNAME | `dealers` | (valor Firebase para dealer-app) |
| CNAME | `sellers` | (valor Firebase para seller-app) |
| CNAME | `ads` | (valor Firebase para advertiser-app) |
| A o CNAME | `@` | apex → `www` o registro que indique Firebase |

Elimina A/CNAME viejos que apunten a otro hosting.

---

## Paso 3 — Firebase Authentication

[Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/autodealers-7f62e/authentication/settings)

Añade **todos** estos hosts (sin `https://`):

```bash
node scripts/print-firebase-auth-domains.mjs
```

Incluye: `www.autodealers-online.com`, `admin.autodealers-online.com`, `dealers.autodealers-online.com`, `sellers.autodealers-online.com`, `ads.autodealers-online.com`, `autodealers-online.com`, más los `*.hosted.app` de respaldo.

---

## Paso 4 — Google Cloud API key (si tiene restricción HTTP referrer)

[Credentials](https://console.cloud.google.com/apis/credentials?project=autodealers-7f62e)

Añade referrers:

```
https://www.autodealers-online.com/*
https://admin.autodealers-online.com/*
https://dealers.autodealers-online.com/*
https://sellers.autodealers-online.com/*
https://ads.autodealers-online.com/*
https://autodealers-online.com/*
```

(Además de los `*.hosted.app/*` que ya uses.)

---

## Paso 5 — Variables en el repo (ya configuradas)

Cada `apps/*/apphosting.yaml` define `NEXT_PUBLIC_*_URL` con las URLs de arriba. Tras cambiar dominios, redeploy:

```bash
npm run deploy:all:firebase
```

O por app:

```bash
npm run deploy:public:firebase
npm run deploy:admin:firebase
npm run deploy:dealer:firebase
npm run deploy:seller:firebase
npm run deploy:advertiser:firebase
```

---

## Paso 6 — Login central en public-web

En `www.autodealers-online.com/login`, tras iniciar sesión el usuario va al panel según su rol:

- Admin → `admin.autodealers-online.com`
- Dealer → `dealers.autodealers-online.com`
- Seller → `sellers.autodealers-online.com`
- Advertiser → `ads.autodealers-online.com`

Eso usa `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_DEALER_URL`, etc. en `apps/public-web/apphosting.yaml`.

---

## Subdominios de clientes (tenants)

Los dealers/vendedores con membresía `customSubdomain` pueden usar:

- `mitienda.autodealers-online.com` → public-web, ruta `/[subdomain]`

No uses nombres reservados (`admin`, `dealers`, `sellers`, `ads`, …).

---

## Comprobar que funciona

1. Cada URL abre su app (login o dashboard).
2. Login en www redirige al subdominio correcto.
3. Enlaces “ver página pública” en dealer/seller apuntan a `www.autodealers-online.com`.
4. Auth no muestra `auth/requests-from-referer-...-are-blocked`.

---

## ¿Dominios totalmente separados?

Si prefieres `dealers.otrodominio.com` en lugar de subdominios:

1. Repite **Add custom domain** en el backend correspondiente con ese FQDN.
2. Cambia la URL en el `apphosting.yaml` de esa app.
3. Añade el host en Auth y API key referrers.
4. Redeploy solo esa app.

El repo está preparado para subdominios bajo `autodealers-online.com`; otros dominios son el mismo flujo con otra URL en YAML.
