# Firebase App Hosting — Pasos

Para tener cada app al 100% en su propio enlace usando solo Firebase.

## Requisito

- Proyecto en **plan Blaze** (pago por uso). En Firebase Console: Project settings → Billing.

## Una app = un backend

Cada backend tiene su propia URL. Tienes 5 apps, así que puedes crear 5 backends (o solo los que quieras).

---

## Por cada app (repite 5 veces si quieres las 5)

1. **Abrir App Hosting**
   - [Firebase Console](https://console.firebase.google.com) → tu proyecto.
   - Menú **Build** → **App Hosting** (o [directo](https://console.firebase.google.com/project/_/apphosting)).

2. **Crear backend**
   - **Get started** o **Create backend**.

3. **Conectar GitHub**
   - Conecta la cuenta/repo donde está este monorepo (el que tiene `apps/`, `packages/`, `turbo.json`).

4. **Raíz de la app (importante)**
   - Donde pide **Root directory** (o “App’s root directory”), pon **solo** una de estas rutas, según la app:
   - Public web: `apps/public-web`
   - Admin: `apps/admin`
   - Dealer: `apps/dealer`
   - Seller: `apps/seller`
   - Advertiser: `apps/advertiser`  
   - No dejes vacío ni pongas la raíz del repo; en monorepos hay que indicar la carpeta de cada app.

5. **Rama y nombre**
   - Rama en vivo: por ejemplo `main`.
   - Nombre del backend: el que quieras (ej. `public-web`, `admin-panel`).
   - Activa rollouts automáticos si quieres que cada push a esa rama despliegue.

6. **Crear y desplegar**
   - **Finish and deploy**. La primera vez puede tardar unos minutos.

7. **URL**
   - Te dará una URL tipo:  
     `https://<backend-id>--<project-id>.us-central1.hosted.app`  
   - Ahí la app corre al 100% (SSR, API routes, etc.).

---

## Resumen por app

| App        | Root directory   |
|-----------|------------------|
| Public web| `apps/public-web` |
| Admin     | `apps/admin`     |
| Dealer    | `apps/dealer`    |
| Seller    | `apps/seller`    |
| Advertiser| `apps/advertiser`|

Un backend por fila = un enlace propio por app.

---

## Opcional: configuración por app

Si quieres ajustar CPU, memoria o variables de entorno, en la raíz de cada app puedes añadir un `apphosting.yaml`. No es obligatorio para que funcione.

Ejemplo en `apps/public-web/apphosting.yaml`:

```yaml
runConfig:
  cpu: 1
  memoryMiB: 512
  maxInstances: 10
env:
  - variable: NODE_ENV
    value: production
```

Puedes copiar y adaptar en `apps/admin`, `apps/dealer`, etc. si lo necesitas.
