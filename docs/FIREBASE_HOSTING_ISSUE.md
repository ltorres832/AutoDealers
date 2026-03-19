# Problema con Firebase Hosting y Rewrites a Functions v2

## Problema

Al intentar desplegar Firebase Hosting con un rewrite a una Cloud Function v2, se produce un error 404 al finalizar la versión:

```
Error: Request to https://firebasehosting.googleapis.com/v1beta1/projects/-/sites/autodealers-7f62e/versions/XXX?updateMask=status%2Cconfig had HTTP Error: 404, Requested entity was not found.
```

## Estado Actual

- ✅ Las funciones están desplegadas correctamente (`nextjsServerPublicWeb`)
- ✅ El hosting funciona sin el rewrite (modo SPA estático)
- ❌ El hosting falla al intentar agregar el rewrite a la función

## Soluciones Temporales

### Opción 1: Hosting Estático (Actual)

El sitio funciona en modo SPA estático. Las rutas API funcionan pero el SSR completo no está disponible.

**Configuración actual en `firebase.json`:**
```json
{
  "rewrites": [
    {
      "source": "/_next/static/**",
      "destination": "/_next/static/**"
    },
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

### Opción 2: Usar Firebase App Hosting

Firebase App Hosting está diseñado específicamente para Next.js y maneja SSR automáticamente:

```bash
firebase init apphosting
```

### Opción 3: Usar Vercel (Recomendado para Next.js)

Vercel tiene mejor soporte nativo para Next.js:

```bash
npm i -g vercel
vercel
```

### Opción 4: Esperar Fix de Firebase

Este parece ser un bug conocido. Monitorear actualizaciones de Firebase CLI y Firebase Hosting.

## Referencias

- [Firebase Hosting Rewrites](https://firebase.google.com/docs/hosting/full-config#rewrites)
- [Cloud Functions v2](https://firebase.google.com/docs/functions/2nd-gen)
- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Notas

- El sitio está funcionando en: https://autodealers-7f62e.web.app
- Las funciones están disponibles en: `us-central1`
- Para SSR completo, considerar migrar a Firebase App Hosting o Vercel
