# Dominios autorizados — Firebase Auth y API key

Producción usa **autodealers-online.com**. Fuente única en código: `packages/shared/src/platform-urls.ts` y `scripts/platform-domains.mjs`.

## Mapa de URLs

| App | URL |
|-----|-----|
| Public | https://www.autodealers-online.com |
| Admin | https://admin.autodealers-online.com |
| Dealer | https://dealer.autodealers-online.com |
| Seller | https://seller.autodealers-online.com |
| Advertiser | https://advertiser.autodealers-online.com |

## Firebase Auth — Authorized domains

En [Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/autodealers-7f62e/authentication/settings):

```
www.autodealers-online.com
admin.autodealers-online.com
dealer.autodealers-online.com
seller.autodealers-online.com
advertiser.autodealers-online.com
autodealers-online.com
localhost
```

(Opcional: mantener `*.hosted.app` y `autodealers-7f62e.web.app` como respaldo.)

Lista completa: `node scripts/print-firebase-auth-domains.mjs`

## Google Cloud API key — HTTP referrers

```
https://www.autodealers-online.com/*
https://admin.autodealers-online.com/*
https://dealer.autodealers-online.com/*
https://seller.autodealers-online.com/*
https://advertiser.autodealers-online.com/*
http://localhost:*/*
```

Ver también `listCustomAuthReferrers()` en `scripts/platform-domains.mjs`.
