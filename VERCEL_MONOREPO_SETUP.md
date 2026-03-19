# 🚀 Configuración Completa de Vercel para Monorepo

## 📋 Apps que necesitan desplegarse:

1. **public-web** - Webs públicas dinámicas
2. **admin** - Panel administrativo
3. **dealer** - Dashboard para dealers
4. **seller** - Dashboard para vendedores
5. **advertiser** - Dashboard para anunciantes

## ✅ Solución: Proyectos Separados en Vercel

Cada app necesita su propio proyecto en Vercel con su propio `Root Directory`.

---

## 🔧 Configuración por App

### 1. Public Web (`apps/public-web`)

```powershell
cd apps\public-web
vercel link
# Selecciona: Create new project
# Nombre: autodealers-public-web
# Root Directory: (deja vacío, Vercel lo detectará)
vercel --prod
```

**En Vercel Dashboard:**
- Settings → General → Root Directory: `apps/public-web`
- Framework: Next.js

---

### 2. Admin (`apps/admin`)

```powershell
cd apps\admin
vercel link
# Selecciona: Create new project
# Nombre: autodealers-admin
vercel --prod
```

**En Vercel Dashboard:**
- Settings → General → Root Directory: `apps/admin`
- Framework: Next.js

---

### 3. Dealer (`apps/dealer`)

```powershell
cd apps\dealer
vercel link
# Selecciona: Create new project
# Nombre: autodealers-dealer
vercel --prod
```

**En Vercel Dashboard:**
- Settings → General → Root Directory: `apps/dealer`
- Framework: Next.js

---

### 4. Seller (`apps/seller`)

```powershell
cd apps\seller
vercel link
# Selecciona: Create new project
# Nombre: autodealers-seller
vercel --prod
```

**En Vercel Dashboard:**
- Settings → General → Root Directory: `apps/seller`
- Framework: Next.js

---

### 5. Advertiser (`apps/advertiser`)

```powershell
cd apps\advertiser
vercel link
# Selecciona: Create new project
# Nombre: autodealers-advertiser
vercel --prod
```

**En Vercel Dashboard:**
- Settings → General → Root Directory: `apps/advertiser`
- Framework: Next.js

---

## 📝 Variables de Entorno

Para cada proyecto, agrega en **Settings → Environment Variables**:

- `FIREBASE_PROJECT_ID=autodealers-7f62e`
- `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY` (valor completo del .env.local)

Y cualquier otra variable específica de cada app.

---

## 🎯 Scripts de Despliegue Rápido

Agrega estos scripts a `package.json`:

```json
{
  "scripts": {
    "deploy:public:vercel": "cd apps/public-web && vercel --prod",
    "deploy:admin:vercel": "cd apps/admin && vercel --prod",
    "deploy:dealer:vercel": "cd apps/dealer && vercel --prod",
    "deploy:seller:vercel": "cd apps/seller && vercel --prod",
    "deploy:advertiser:vercel": "cd apps/advertiser && vercel --prod",
    "deploy:all:vercel": "npm run deploy:public:vercel && npm run deploy:admin:vercel && npm run deploy:dealer:vercel && npm run deploy:seller:vercel && npm run deploy:advertiser:vercel"
  }
}
```

---

## ⚠️ IMPORTANTE: Root Directory

**Para cada proyecto en Vercel Dashboard**, configura:
- **Root Directory**: `apps/[nombre-de-la-app]`

Esto le dice a Vercel:
1. Instalar dependencias desde la raíz del monorepo (para workspaces)
2. Construir desde el directorio específico de la app
3. Desplegar correctamente

---

## 🔍 Verificar Despliegues

```powershell
# Ver todos los proyectos
vercel projects ls

# Ver despliegues de un proyecto específico
cd apps/public-web
vercel ls
```

---

## 🚨 Si hay errores de build:

1. Verifica que el Root Directory esté configurado correctamente
2. Verifica que las variables de entorno estén configuradas
3. Revisa los logs: `vercel inspect [url] --logs`
