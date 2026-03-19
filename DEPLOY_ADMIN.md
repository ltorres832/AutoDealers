# Desplegar Admin Panel - Solución Práctica

## Opción 1: Firebase Hosting (Recomendado - Ya configurado)

### Paso 1: Build de la app
```bash
# Desde la raíz del proyecto
npm run build:admin
```

### Paso 2: Preparar archivos estáticos
```bash
node scripts/prepare-hosting.js
```

### Paso 3: Desplegar a Firebase Hosting
```bash
firebase deploy --only hosting:admin-panel
```

**Listo.** Tu app estará en la URL de Firebase Hosting.

---

## Opción 2: Vercel (Más fácil para Next.js)

### Paso 1: Instalar Vercel CLI
```bash
npm i -g vercel
```

### Paso 2: Desplegar
```bash
cd apps/admin
vercel
```

Sigue las instrucciones:
- Root Directory: `apps/admin`
- Build Command: `npm run build` (o deja vacío, Vercel lo detecta)
- Output Directory: `.next`

**Listo.** Vercel maneja Next.js y monorepos automáticamente.

---

## ¿Por qué Firebase App Hosting falla?

Firebase App Hosting está diseñado para backends/serverless, no para Next.js SSR completo en monorepos. Firebase Hosting tradicional es mejor para apps Next.js estáticas/SSG.
