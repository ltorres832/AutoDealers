# Guía de Despliegue en Firebase Hosting

## 📋 Pasos para Desplegar

### 1. Build de Next.js (Export Estático)

```bash
cd apps/public-web
npm run build
```

Esto generará la carpeta `out/` con los archivos estáticos.

### 2. Desplegar a Firebase Hosting

Desde la raíz del proyecto:

```bash
firebase deploy --only hosting
```

O desplegar todo (Firestore, Storage, Hosting):

```bash
firebase deploy
```

### 3. Obtener el Link Web

Después del despliegue, Firebase te dará un link como:
- `https://autodealers-7f62e.web.app`
- `https://autodealers-7f62e.firebaseapp.com`

## ⚙️ Configuración

### Firebase Hosting está configurado en `firebase.json`:

```json
{
  "hosting": {
    "public": "apps/public-web/out",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Next.js está configurado para export estático:

- `output: 'export'` en `next.config.js`
- `images.unoptimized: true` (necesario para export estático)

## ⚠️ Limitaciones del Export Estático

1. **No API Routes**: Las rutas `/api/*` no funcionarán (necesitarías Firebase Functions)
2. **No SSR**: Solo páginas estáticas (SSG)
3. **No ISR**: Incremental Static Regeneration no disponible

## 🔄 Flujo de Despliegue Completo

```bash
# 1. Build de Next.js
cd apps/public-web
npm run build

# 2. Volver a la raíz
cd ../..

# 3. Desplegar a Firebase
firebase deploy --only hosting
```

## 📝 Notas

- El build genera la carpeta `apps/public-web/out/`
- Firebase Hosting sirve desde esa carpeta
- Los cambios requieren rebuild antes de deploy
- El link web aparecerá después del despliegue exitoso



