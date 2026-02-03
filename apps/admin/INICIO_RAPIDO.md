# 🚀 Inicio Rápido - Panel Admin

## Estado del Servidor

El panel administrativo está **listo para ejecutarse**. 

## ⚡ Inicio Rápido

### Opción 1: Script Automático (Windows)
Doble clic en: **`start.bat`**

### Opción 2: Manual
```bash
# 1. Instalar dependencias (si no están instaladas)
npm install

# 2. Iniciar servidor
npm run dev
```

### Opción 3: Desde la raíz del proyecto
```bash
# Desde la raíz del monorepo
npm install
npm run dev
```

## 🌐 Acceso

Una vez iniciado, abre tu navegador en:
**http://localhost:3001**

## 📋 Requisitos

- ✅ Node.js 18+ instalado
- ✅ npm, yarn o pnpm disponible
- ✅ Variables de entorno configuradas (`.env.local`)

## 🔧 Si npm no está disponible

1. **Instala Node.js** desde: https://nodejs.org/
2. **Reinicia** tu terminal después de instalar
3. **Verifica** con: `node --version` y `npm --version`

## 📝 Variables de Entorno

Crea `apps/admin/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_dominio
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

## ✅ Verificación

El servidor está corriendo cuando ves:
```
✓ Ready in X seconds
○ Local: http://localhost:3001
```

## 🎨 Características del Panel

- ✅ Sidebar profesional con navegación completa
- ✅ Logo y favicon personalizables
- ✅ 12 secciones de administración
- ✅ Diseño responsive
- ✅ Vista Global con estadísticas
- ✅ Gestión completa de usuarios, tenants, membresías

## 🐛 Problemas Comunes

### "npm no se reconoce"
→ Instala Node.js y reinicia la terminal

### "Puerto 3001 en uso"
→ Cambia el puerto en `package.json` o cierra el proceso

### "Cannot find module"
→ Ejecuta `npm install` desde la raíz del proyecto

### "Firebase not initialized"
→ Verifica las variables de entorno en `.env.local`

## 📞 Siguiente Paso

Una vez que el servidor esté corriendo:
1. Abre http://localhost:3001
2. Inicia sesión con credenciales de admin
3. Explora el panel y personaliza el branding en `/admin/settings/branding`





