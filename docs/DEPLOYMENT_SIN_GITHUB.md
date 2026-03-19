# Guía de Despliegue Sin GitHub

Esta guía cubre todas las opciones para desplegar las aplicaciones sin necesidad de conectar un repositorio de GitHub.

## Opción 1: Firebase App Hosting (Manual con CLI) ⭐ Recomendado

Firebase App Hosting permite desplegar directamente desde tu máquina local usando Firebase CLI, sin necesidad de GitHub.

### Requisitos

- Firebase CLI versión 14.4.0 o superior
- Proyecto Firebase en plan **Blaze (Pay-as-you-go)**
- Node.js 18.0.0 o superior

### Pasos para Desplegar

#### Paso 1: Verificar Requisitos

```bash
# Verificar versión de Firebase CLI (debe ser 14.4.0+)
firebase --version

# Si es menor, actualizar:
npm install -g firebase-tools@latest

# Verificar que estás en el proyecto correcto
firebase projects:list
firebase use autodealers-7f62e  # Tu proyecto
```

#### Paso 2: Inicializar App Hosting (Solo la Primera Vez)

**IMPORTANTE**: Debes ejecutar esto desde el directorio de la app (`apps/admin`), pero el backend necesita acceso a la raíz del monorepo.

```bash
# 1. Ir al directorio de la app
cd apps/admin

# 2. Inicializar App Hosting
firebase init apphosting

# Durante la inicialización, selecciona:
# ? What Firebase project do you want to use?
#   → Selecciona: autodealers-7f62e (o tu proyecto)
#
# ? Do you want to create a new backend or use an existing one?
#   → Si es la primera vez: Create a new backend
#   → Si ya existe: Use an existing backend
#
# ? What do you want to name your backend?
#   → admin-backend (o el nombre que prefieras)
#
# ? In which region do you want to host your backend?
#   → Selecciona una región cercana (ej: us-central1)
#
# ? What is the root directory of your application code?
#   → ../../ (MUY IMPORTANTE: apunta a la raíz del monorepo)
#
# ? What is the build command?
#   → cd ../.. && npm ci && npx turbo run build --filter=@autodealers/admin && cd apps/admin
#
# ? What is the start command?
#   → npm start
```

**Nota**: Si el comando `firebase init apphosting` no está disponible, asegúrate de tener Firebase CLI 14.4.0 o superior.

#### Paso 3: Verificar Configuración

Después de la inicialización, deberías tener:

1. ✅ `apphosting.yaml` en `apps/admin/` (ya lo tienes)
2. ✅ Backend creado en Firebase Console → App Hosting
3. ✅ Configuración vinculada en `.firebaserc` (se actualiza automáticamente)

#### Paso 4: Desplegar

```bash
# Desde apps/admin
cd apps/admin
firebase deploy --only apphosting

# O especificar el backend por ID:
firebase deploy --only apphosting:admin-backend
```

#### Solución de Problemas

Si obtienes el error: `No targets in firebase.json match '--only apphosting'`:

1. **Verifica que ejecutaste `firebase init apphosting`**:
   ```bash
   cd apps/admin
   firebase init apphosting
   ```

2. **Verifica que el backend existe en Firebase Console**:
   - Ve a [Firebase Console](https://console.firebase.google.com)
   - Selecciona tu proyecto
   - Ve a "App Hosting" en el menú lateral
   - Deberías ver tu backend listado

3. **Si el backend existe pero no se vincula**:
   ```bash
   # Listar backends disponibles
   firebase apphosting:backends:list
   
   # Vincular manualmente (si es necesario)
   firebase use --add
   ```

4. **Verifica que estás en el directorio correcto**:
   ```bash
   # Debe ejecutarse desde apps/admin
   cd apps/admin
   firebase deploy --only apphosting
   ```

### Ventajas

- ✅ No requiere GitHub
- ✅ Despliegue directo desde tu máquina
- ✅ Escalado automático con Cloud Run
- ✅ CDN integrado
- ✅ Variables de entorno desde Firebase Console

### Configuración de Variables de Entorno

1. Ve a Firebase Console → App Hosting → Tu Backend
2. Configura las variables de entorno necesarias
3. Las variables estarán disponibles en tiempo de ejecución

---

## Opción 2: Firebase Hosting (Estático)

Para aplicaciones Next.js con exportación estática. Ya tienes configuración en `firebase.json`.

### Pasos

```bash
# 1. Build de la aplicación
cd apps/admin
npm run build:firebase

# Esto ejecuta: next build
# Y prepara los archivos en apps/admin/hosting/

# 2. Desplegar
firebase deploy --only hosting:admin-panel
```

### Limitaciones

- Solo funciona para sitios estáticos (SSG)
- No soporta SSR/API routes de Next.js
- No tiene escalado automático de servidor

---

## Opción 3: Vercel (Sin GitHub)

Vercel permite desplegar directamente desde tu máquina local.

### Pasos

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Desplegar desde el directorio de la app
cd apps/admin
vercel

# Seguir las instrucciones interactivas:
# - Link a proyecto existente o crear nuevo
# - Configurar variables de entorno
# - Confirmar configuración

# 4. Para producción
vercel --prod
```

### Configurar Variables de Entorno

```bash
# Desde CLI
vercel env add VARIABLE_NAME

# O desde el dashboard de Vercel
```

### Ventajas

- ✅ Excelente para Next.js
- ✅ Despliegue instantáneo
- ✅ Preview deployments automáticos
- ✅ No requiere GitHub

---

## Opción 4: Railway

Railway permite desplegar desde tu máquina local o desde un archivo comprimido.

### Pasos

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Inicializar proyecto
cd apps/admin
railway init

# 4. Desplegar
railway up

# O desde la raíz del monorepo con configuración:
railway link
railway up
```

### Configuración

Crear `railway.json` en la raíz:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd apps/admin && npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "cd apps/admin && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Opción 5: Render

Render permite desplegar desde Git (incluyendo GitLab, Bitbucket) o desde archivo comprimido.

### Pasos Manuales

1. Ir a [render.com](https://render.com)
2. Crear nuevo "Web Service"
3. Conectar repositorio O subir código manualmente
4. Configurar:
   - Build Command: `cd apps/admin && npm ci && npm run build`
   - Start Command: `cd apps/admin && npm start`
   - Environment: Node

### Desde CLI

```bash
# Instalar Render CLI
npm install -g render-cli

# Login
render login

# Desplegar
render deploy
```

---

## Opción 6: Cloud Run (Google Cloud)

Despliegue directo a Cloud Run usando Docker o buildpacks.

### Con Dockerfile

Crear `apps/admin/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package*.json ./
COPY ../../package*.json ../../
RUN npm ci

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY ../../ .
RUN npm run build --filter=@autodealers/admin

# Production
FROM base AS runner
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### Desplegar

```bash
# 1. Configurar proyecto GCP
gcloud config set project YOUR_PROJECT_ID

# 2. Build y deploy
gcloud run deploy admin-panel \
  --source apps/admin \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Comparación de Opciones

| Opción | Dificultad | Costo | Escalado | Mejor Para |
|--------|-----------|-------|----------|------------|
| **Firebase App Hosting** | Media | Pay-as-you-go | Automático | Apps Next.js con SSR |
| **Firebase Hosting** | Baja | Gratis/Pago | Limitado | Sitios estáticos |
| **Vercel** | Baja | Gratis/Pago | Automático | Next.js (óptimo) |
| **Railway** | Media | Pay-as-you-go | Automático | Apps full-stack |
| **Render** | Media | Gratis/Pago | Automático | Apps generales |
| **Cloud Run** | Alta | Pay-as-you-go | Automático | Control total |

---

## Recomendación para tu Proyecto

Para **apps/admin** (Next.js con SSR):

1. **Primera opción**: Firebase App Hosting (manual CLI)
   - Ya tienes `apphosting.yaml` configurado
   - Integración perfecta con Firebase
   - Solo necesitas ejecutar `firebase deploy --only apphosting`

2. **Segunda opción**: Vercel
   - Mejor experiencia para Next.js
   - Despliegue muy rápido
   - Excelente para desarrollo

---

## Scripts de Despliegue Rápido

Agregar a `package.json` en la raíz:

```json
{
  "scripts": {
    "deploy:admin:apphosting": "cd apps/admin && firebase deploy --only apphosting",
    "deploy:admin:vercel": "cd apps/admin && vercel --prod",
    "deploy:admin:hosting": "cd apps/admin && npm run build:firebase && firebase deploy --only hosting:admin-panel"
  }
}
```

Uso:

```bash
npm run deploy:admin:apphosting
npm run deploy:admin:vercel
npm run deploy:admin:hosting
```

---

## Notas Importantes

### Variables de Entorno

Todas las plataformas requieren configurar variables de entorno:

- Firebase App Hosting: Firebase Console → App Hosting → Variables
- Vercel: Dashboard → Settings → Environment Variables
- Railway: Dashboard → Variables
- Render: Dashboard → Environment

### Monorepo Considerations

Para monorepos, asegúrate de:

1. Instalar dependencias desde la raíz: `npm ci` en la raíz
2. Build con turbo: `npx turbo run build --filter=@autodealers/admin`
3. Ejecutar desde el directorio correcto: `cd apps/admin && npm start`

### Archivos a Excluir

Todas las plataformas respetan `.gitignore`, pero puedes crear `.firebaserc` o `.vercelignore` para control adicional.
