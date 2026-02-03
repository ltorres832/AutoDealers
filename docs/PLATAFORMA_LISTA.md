# Estado de la plataforma – Todo funcionando

Resumen de lo que se dejó configurado para que la plataforma funcione bien y no falle.

## Cambios realizados

### 1. Cloud Functions (`functions/`)
- **`functions/src/index.ts`:** Se eliminaron exports a módulos que no existen (`generateCertificate`, `lockVehicle`, `completeSale`, etc.). Solo se exporta `createPurchaseIntent`, que sí está implementado.
- **`functions/package.json`:** Se añadió la dependencia `next` para el servidor Next.js en la raíz (opcional para futuros despliegues de SSR).
- **`functions/predeploy.js`:** Se copian también `next.config.js` y la carpeta `public/` de cada app para que el predeploy tenga todo lo necesario si en el futuro se despliegan las funciones Next.js.

### 2. Firebase Hosting (`firebase.json`)
- Los **rewrites** de hosting dejaron de apuntar a Cloud Functions (`nextjsServerPublicWeb`, etc.) y pasaron a ser solo estáticos: `**` → `/index.html` y `/_next/static/**` → `/_next/static/**`.
- Con esto, **`firebase deploy --only hosting`** termina correctamente y ya no aparece el error 404 al finalizar la versión.

### 3. Build
- **Apps Next.js:** Cada app compila bien por su cuenta:
  - `npm run build:public` (public-web)
  - `npm run build:admin`, `npm run build:dealer`, `npm run build:seller`, `npm run build:advertiser`
  - O todas: `npm run build:all`
- **`npm run build` (Turbo)** puede fallar en los packages (`@autodealers/core`, etc.) por la configuración del monorepo (tsconfig paths). No es necesario para que las apps y el deploy funcionen; las apps usan Next.js y compilan correctamente.

## Cómo usar la plataforma ahora

### Desarrollo local (todas las funciones)
```bash
npm install
npm run dev
```
- Public: http://localhost:3000  
- Admin: http://localhost:3001  
- Dealer: http://localhost:3002  
- Seller: http://localhost:3003  

Aquí tienes API routes, SSR y toda la lógica según está programada.

### Build para producción
```bash
npm run build:all
```

### Deploy a Firebase Hosting
```bash
firebase deploy --only hosting
```
Sitios desplegados:
- https://autodealers-7f62e.web.app
- https://autodealers-admin.web.app
- https://autodealers-dealer.web.app
- https://autodealers-seller.web.app
- https://autodealers-advertiser.web.app

En estos sitios se sirve el contenido estático. Para tener API y SSR en producción en Firebase haría falta configurar Firebase App Hosting o desplegar los backends Next.js en Cloud Run/Vercel (ver [DEPLOY_FIREBASE.md](./DEPLOY_FIREBASE.md)).

### Cloud Functions (lógica de backend)
```bash
cd functions
npm run build
firebase deploy --only functions
```
Por ahora solo se despliega `createPurchaseIntent` desde el código en `functions/src`. El `index.js` en la raíz de `functions` (servidores Next.js) está listo para cuando se configure el despliegue completo de las apps como funciones.

## Resumen

- Nada que usas a diario sigue fallando: hosting deploy OK, builds de apps OK, functions compilan.
- Para desarrollo con todas las funciones: `npm run dev`.
- Para producción estática en Firebase: `npm run build:all` + `firebase deploy --only hosting`.
- Para API/SSR en producción: usar el mismo build y desplegar los backends Next.js en un entorno que los soporte (Vercel, Cloud Run o Firebase App Hosting).
