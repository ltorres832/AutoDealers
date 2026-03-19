# Solución Rápida - Desplegar Admin Panel

## Problema
Firebase App Hosting no funciona bien con Next.js en monorepos.

## Solución: Usar Vercel (5 minutos)

Vercel maneja Next.js y monorepos automáticamente.

### Paso 1: Instalar Vercel CLI
```bash
npm i -g vercel
```

### Paso 2: Desplegar
```bash
cd apps/admin
vercel
```

Cuando te pregunte:
- **Root Directory**: Deja vacío o pon `.` (estás en apps/admin)
- **Build Command**: Deja vacío (Vercel lo detecta automáticamente)
- **Output Directory**: `.next`

### Paso 3: Configurar Monorepo (si es necesario)

Si Vercel no detecta el monorepo automáticamente:
1. Ve a vercel.com → Tu proyecto → Settings
2. En "Root Directory" pon: `apps/admin`
3. En "Build Command" pon: `cd ../.. && npm ci && npm run build:admin`
4. En "Output Directory" pon: `.next`

**Listo.** Tu app estará en una URL de Vercel (ej: `tu-app.vercel.app`)

---

## Alternativa: Arreglar Firebase Hosting

Si prefieres Firebase Hosting tradicional:

1. **Arreglar el error de build primero:**
   - El problema está en `packages/core/tsconfig.json`
   - Está compilando archivos .d.ts que ya existen
   - Necesitas cambiar `outDir` en tsconfig.json

2. **Luego hacer build:**
   ```bash
   npm run build:admin
   node scripts/prepare-hosting.js
   firebase deploy --only hosting:admin-panel
   ```

---

## Recomendación

**Usa Vercel.** Es más fácil, más rápido, y maneja Next.js perfectamente. Firebase App Hosting no está diseñado para esto.
