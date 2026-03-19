# 🚀 SOLUCIÓN RÁPIDA - Vercel con Monorepo

## ⚠️ PROBLEMA ACTUAL:
Vercel no encuentra los paquetes `@autodealers/*` porque son locales del monorepo.

## ✅ SOLUCIÓN (2 opciones):

### Opción 1: Configurar Root Directory en Dashboard (RECOMENDADO)

1. **Ve al Dashboard de Vercel:**
   https://vercel.com/ltorres832s-projects/auto-dealers/settings/general

2. **En "Root Directory":**
   - Haz clic en "Edit"
   - Escribe: `apps/public-web`
   - Guarda

3. **Despliega:**
   ```powershell
   cd c:\Users\ltorr\AutoDealers
   vercel --prod
   ```

### Opción 2: Desplegar desde el subdirectorio (ALTERNATIVA)

```powershell
cd c:\Users\ltorr\AutoDealers\apps\public-web
vercel --prod --cwd ../..
```

## 🔧 Variables de Entorno:

Después del primer despliegue exitoso, agrega en Vercel Dashboard:
- Settings → Environment Variables

Agrega:
- `FIREBASE_PROJECT_ID=autodealers-7f62e`
- `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY` (el valor completo del .env.local)

## 📝 IMPORTANTE:

**La Opción 1 es la mejor** porque Vercel manejará automáticamente:
- Instalación de dependencias del monorepo
- Build desde el directorio correcto
- Despliegue con SSR funcionando
