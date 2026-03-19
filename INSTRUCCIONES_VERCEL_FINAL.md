# ✅ SOLUCIÓN FINAL PARA VERCEL

## El Problema Real

Vercel necesita que configures el **Root Directory** en el Dashboard para monorepos. Los archivos `vercel.json` están correctos ahora, pero necesitas hacer UNA configuración manual en Vercel Dashboard (solo una vez por proyecto).

## Pasos (5 minutos por app)

### 1. Desplegar cada app (desde la carpeta de la app):

```powershell
cd apps/public-web
vercel --yes
```

Cuando pregunte:
- Set up and deploy? → **Y**
- Link to existing project? → **N** (primera vez) o **Y** (si ya existe)
- Project name? → **autodealers-public-web**
- Directory? → **apps/public-web** o Enter

### 2. Configurar Root Directory en Vercel Dashboard:

**IMPORTANTE:** Después del primer deploy, ve a:
1. https://vercel.com/dashboard
2. Abre el proyecto `autodealers-public-web`
3. **Settings → General**
4. **Root Directory:** Cambia a `apps/public-web`
5. **Build Command:** Debe ser `npm run build` (ya está correcto)
6. **Install Command:** Deja vacío o pon `cd ../.. && npm install`
7. **Output Directory:** `.next`
8. **Save**

### 3. Desplegar a producción:

```powershell
vercel --prod
```

### 4. Repetir para las otras apps:

- `apps/admin` → Root Directory: `apps/admin`
- `apps/dealer` → Root Directory: `apps/dealer`
- `apps/seller` → Root Directory: `apps/seller`
- `apps/advertiser` → Root Directory: `apps/advertiser`

## Por qué esto funciona

- Los `vercel.json` están correctos (mínimos y simples)
- Vercel detecta Next.js automáticamente cuando el Root Directory está bien configurado
- El Install Command desde la raíz instala todas las dependencias del monorepo
- El Build Command ejecuta `npm run build` desde la app específica

## Si sigue fallando

Verifica en Vercel Dashboard → Deployments → Build Logs qué error específico aparece y compártelo.

---

**Los archivos están correctos. Solo necesitas configurar el Root Directory en Vercel Dashboard (una vez por proyecto).**


