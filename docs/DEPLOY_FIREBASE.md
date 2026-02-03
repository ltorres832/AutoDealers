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

## Errores frecuentes

- **404 al hacer `firebase deploy --only hosting`:** No suele pasar si los rewrites en `firebase.json` son solo estáticos (`"destination": "/index.html"` y `/_next/static/**`). Si en el futuro añades rewrites a Cloud Functions u otro servicio, asegúrate de que ese servicio exista y esté desplegado.
- **Pantalla en blanco o "Cargando..." en la URL desplegada:** Es esperado si la app depende de SSR o de API routes, porque en este setup Hosting no ejecuta servidor Node. La app funciona al 100% en local con `npm run dev`.

## Resumen

| Qué                | Cómo                          |
|--------------------|--------------------------------|
| Deploy (sin coste extra) | `npm run deploy:firebase`      |
| Solo Firebase      | Sí; Hosting estático          |
| Cloud Run / Vercel | No se usan en este flujo      |
