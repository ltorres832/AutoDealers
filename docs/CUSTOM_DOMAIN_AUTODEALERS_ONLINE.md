# Dominio personalizado: www.autodealers-online.com

Guía completa: [MULTI_APP_DOMAINS.md](./MULTI_APP_DOMAINS.md) (todas las apps).

Sitio público (`public-web-app`) en producción con dominio **https://www.autodealers-online.com**.

## 1. Firebase Console — conectar dominio

Tienes dos opciones (elige **una**; la más común con este repo es **Hosting**):

### Opción A — Firebase Hosting (recomendada con `firebase.json`)

1. Abre [Firebase Hosting](https://console.firebase.google.com/project/autodealers-7f62e/hosting/sites).
2. En el sitio por defecto → **Add custom domain**.
3. Añade **`www.autodealers-online.com`**.
4. (Opcional) Añade también **`autodealers-online.com`** y marca redirección a `www`.
5. Copia los registros DNS que Firebase te muestre (CNAME o A) en tu registrador del dominio.
6. Pulsa **Verify** y espera el certificado SSL (hasta 24 h).

El `firebase.json` ya reescribe todo el tráfico de Hosting hacia el backend `public-web-app`.

### Opción B — App Hosting directo

1. [App Hosting → public-web-app → Settings → Domains](https://console.firebase.google.com/project/autodealers-7f62e/apphosting).
2. **Add custom domain** → `www.autodealers-online.com`.
3. Configura DNS según el asistente.

## 2. DNS en tu registrador (ejemplo)

Firebase te dará valores exactos. Suele ser:

| Tipo | Nombre | Valor |
|------|--------|--------|
| CNAME | `www` | (dominio que indique Firebase, p. ej. `ghs.googlehosted.com` o `_custom-domain…`) |
| A / CNAME | `@` | para el apex `autodealers-online.com` si lo conectas |

Elimina registros A/CNAME antiguos que apunten a otro hosting.

## 3. Firebase Authentication

Añade en [Authorized domains](https://console.firebase.google.com/project/autodealers-7f62e/authentication/settings):

- `www.autodealers-online.com`
- `autodealers-online.com`

Lista rápida desde el repo:

```bash
node scripts/print-firebase-auth-domains.mjs
```

## 4. Google Cloud — API key (si tiene restricción HTTP referrer)

En [Credentials](https://console.cloud.google.com/apis/credentials?project=autodealers-7f62e), añade:

- `https://www.autodealers-online.com/*`
- `https://autodealers-online.com/*`

## 5. Deploy después de cambios en código

```bash
npm run deploy:public:firebase
npm run deploy:dealer:firebase
npm run deploy:seller:firebase
```

Variables ya configuradas en `apphosting.yaml`:

- `NEXT_PUBLIC_APP_URL` → `https://www.autodealers-online.com` (public-web)
- `NEXT_PUBLIC_PUBLIC_WEB_URL` → `https://www.autodealers-online.com` (dealer/seller)

## 6. Subdominios de tenants

Con el dominio conectado, un tenant con subdominio `demo` puede usarse como:

- `demo.autodealers-online.com`

El middleware de `public-web` enruta esos hosts a `/[subdomain]`.
