# 🚀 Guía de Deploy a Producción

## ✅ Build Completado

El build de `apps/public-web` está listo para producción.

## 🌐 Opciones de Deploy

### Opción 1: Vercel (Recomendado - Soporte Nativo Next.js)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd apps/public-web
vercel --prod
```

**Ventajas:**
- ✅ Soporte nativo para Next.js SSR
- ✅ CDN global automático
- ✅ Preview deployments
- ✅ Sin configuración adicional

---

### Opción 2: Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
cd apps/public-web
netlify deploy --prod
```

**Ventajas:**
- ✅ Soporte para Next.js
- ✅ CDN global
- ✅ Formularios y funciones serverless incluidas

---

### Opción 3: Firebase Hosting + Cloud Functions

**Nota:** Firebase Hosting estático NO soporta SSR. Necesitas Cloud Functions.

#### Pasos:

1. **Crear Cloud Function para Next.js:**
```bash
cd functions
npm init
npm install next react react-dom
```

2. **Configurar `firebase.json` para Cloud Functions:**
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "function": "nextjsServer"
      }
    ]
  }
}
```

3. **Deploy:**
```bash
firebase deploy --only functions,hosting:public-site
```

**Ventajas:**
- ✅ Integración con Firebase
- ❌ Requiere configuración adicional de Cloud Functions
- ❌ Costos por invocaciones de functions

---

### Opción 4: Desarrollo Local

```bash
cd apps/public-web
npm run build
npm run start
```

Abre: `http://localhost:3000`

---

## 📋 Recomendación Final

**Para producción con Next.js SSR:**
1. **Vercel** - La opción más fácil y rápida
2. **Netlify** - Alternativa sólida
3. **Firebase + Cloud Functions** - Solo si necesitas integración completa con Firebase

---

## ✅ Checklist Pre-Deploy

- [x] Build exitoso (`npm run build`)
- [x] Variables de entorno configuradas
- [x] Firebase configurado (si usas Firebase)
- [x] Dominios configurados
- [x] SSL/HTTPS habilitado

---

## 🔗 Links de Deploy

Después del deploy, los links aparecerán en la consola o en el dashboard de la plataforma elegida.



