# 🚀 Deploy a Firebase Hosting + Cloud Functions

## ✅ Configuración Completada

### Archivos creados:
- `functions/index.js` - Cloud Function para Next.js SSR
- `functions/package.json` - Dependencias de Cloud Functions
- `firebase.json` - Configurado con rewrites a Cloud Functions

---

## 📋 Pasos para Deploy

### 1. Instalar dependencias de Functions

```bash
cd functions
npm install
```

### 2. Build de Next.js

```bash
cd ../apps/public-web
npm run build
```

### 3. Deploy a Firebase

```bash
cd ../..
firebase deploy --only functions,hosting:public-site
```

---

## 🔧 Configuración

### `firebase.json`
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "function": "nextjsServer"
      }
    ]
  },
  "functions": {
    "source": "functions"
  }
}
```

### `functions/index.js`
- Crea Cloud Function que sirve Next.js SSR
- Maneja todas las rutas dinámicas
- Timeout: 540 segundos
- Memoria: 1GB
- Máximo 10 instancias

---

## 💰 Costos

**Plan Spark (Gratis):**
- 2 millones de invocaciones/mes
- 400,000 GB-segundos/mes
- 200,000 CPU-segundos/mes

**Para producción pequeña/media es suficiente y gratis.**

---

## 🚀 Comandos Rápidos

```bash
# Deploy completo
firebase deploy --only functions,hosting:public-site

# Solo functions
firebase deploy --only functions

# Solo hosting
firebase deploy --only hosting:public-site

# Ver logs
firebase functions:log
```

---

## ✅ Ventajas

- ✅ Funciona con todas las rutas dinámicas
- ✅ SSR completo de Next.js
- ✅ Integración total con Firebase
- ✅ Sin límites de rutas dinámicas

---

## ⚠️ Notas

- Primera invocación puede tardar (cold start)
- Tiempo de respuesta: ~500ms - 2s (depende de complejidad)
- CDN de Firebase Hosting cachea contenido estático automáticamente



