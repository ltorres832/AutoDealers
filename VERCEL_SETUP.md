# ⚡ Configuración Rápida de Vercel para Monorepo

## ✅ Lo que ya está hecho:
- ✅ Proyecto vinculado desde la raíz: `auto-dealers`
- ✅ Archivo `vercel.json` configurado en la raíz

## 🔧 Configuración IMPORTANTE en Vercel Dashboard:

1. Ve a: https://vercel.com/ltorres832s-projects/auto-dealers/settings

2. En **Settings → General → Root Directory**:
   - Cambia a: `apps/public-web`
   - Guarda

3. En **Settings → General → Build & Development Settings**:
   - Framework Preset: **Next.js**
   - Build Command: `npm install && npm run build` (o deja default)
   - Output Directory: `.next` (o deja default)
   - Install Command: `npm install` (o deja default)

4. En **Settings → Environment Variables**:
   - Agrega todas las variables de `apps/public-web/.env.local`:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
     - Cualquier otra variable que necesites

## 🚀 Desplegar:

```powershell
cd c:\Users\ltorr\AutoDealers
vercel --prod
```

## 📝 Nota sobre Monorepos:

Vercel necesita saber que el proyecto Next.js está en `apps/public-web`. Esto se configura en el dashboard de Vercel en **Settings → General → Root Directory**.

Una vez configurado el `rootDirectory` en el dashboard, Vercel automáticamente:
- Instalará dependencias desde la raíz (para los workspaces)
- Construirá desde `apps/public-web`
- Desplegará correctamente

## 🔍 Verificar despliegue:

```powershell
vercel ls
vercel inspect [url-del-deployment]
```
