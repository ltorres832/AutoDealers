# ✅ Checklist de Verificación para Producción

## 📋 Estado Actual de la Plataforma

**Última verificación:** 7 de febrero de 2026

---

## 🔴 PROBLEMAS CRÍTICOS DETECTADOS

### 1. ⚠️ Firebase Hosting - Función no existente
**Problema:** En `firebase.json`, la app `public-site` tiene un rewrite a una función `nextjsServerPublicWeb` que no existe.

**Ubicación:** `firebase.json` línea 25

**Solución:** 
- Opción A: Cambiar a hosting estático (recomendado para empezar)
- Opción B: Crear la función Cloud Function correspondiente

**Estado:** 🔴 **REQUIERE ACCIÓN**

---

## ✅ CHECKLIST DE CONFIGURACIÓN

### 1. Variables de Entorno

#### Variables Requeridas para Producción:

```env
# Firebase (OBLIGATORIO)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (OBLIGATORIO)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# URLs de Producción (OBLIGATORIO)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_ADMIN_URL=https://admin.tu-dominio.com

# Stripe (OBLIGATORIO para billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Meta/WhatsApp (OPCIONAL - solo si usas mensajería)
META_APP_ID=
META_APP_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
FACEBOOK_VERIFY_TOKEN=

# IA (OPCIONAL)
OPENAI_API_KEY=
# o
ANTHROPIC_API_KEY=

# Email (OPCIONAL)
SENDGRID_API_KEY=
# o
RESEND_API_KEY=

# SMS (OPCIONAL)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Seguridad (RECOMENDADO)
CRON_SECRET=tu-secreto-aleatorio-aqui
SCHEDULER_SECRET=tu-secreto-aleatorio-aqui
```

**Estado:** ⚠️ **VERIFICAR EN CADA PLATAFORMA**

---

### 2. Firebase - Configuración Base

#### ✅ Firestore
- [ ] Proyecto Firebase creado
- [ ] Firestore Database habilitado
- [ ] Reglas de seguridad desplegadas (`firebase deploy --only firestore:rules`)
- [ ] Índices creados (`firebase deploy --only firestore:indexes`)

#### ✅ Storage
- [ ] Firebase Storage habilitado
- [ ] Reglas de Storage desplegadas (`firebase deploy --only storage`)

#### ✅ Authentication
- [ ] Authentication habilitado
- [ ] Métodos de autenticación configurados (Email/Password mínimo)
- [ ] Usuario administrador creado

#### ✅ Hosting
- [ ] Hosting configurado en Firebase Console
- [ ] Dominios personalizados configurados (opcional)

**Estado:** ⚠️ **VERIFICAR**

---

### 3. Builds y Compilación

#### Verificar que los builds funcionen:

```bash
# Build de todas las apps
npm run build:all

# Verificar cada app individualmente
cd apps/public-web && npm run build
cd apps/admin && npm run build
cd apps/dealer && npm run build
cd apps/seller && npm run build
cd apps/advertiser && npm run build
```

**Estado:** ✅ **SCRIPTS DISPONIBLES**

---

### 4. Opciones de Despliegue

#### Opción A: Firebase Hosting (Estático) ⚠️ LIMITADO

**Pros:**
- Gratis para contenido estático
- CDN incluido
- SSL automático

**Contras:**
- ❌ No soporta API Routes de Next.js
- ❌ No soporta SSR (Server-Side Rendering)
- Solo funciona para contenido estático

**Comandos:**
```bash
npm run build:all
npm run prepare-hosting
firebase deploy --only hosting
```

**Estado:** 🟡 **FUNCIONAL PERO LIMITADO** (solo frontend estático)

---

#### Opción B: Firebase App Hosting ✅ RECOMENDADO

**Pros:**
- ✅ Soporta Next.js completo (SSR + API Routes)
- ✅ Escalado automático
- ✅ SSL automático
- ✅ Integración con Firebase

**Contras:**
- Requiere plan Blaze (pago por uso)
- Configuración más compleja

**Pasos:**
1. Activar plan Blaze en Firebase Console
2. Ir a Build → App Hosting
3. Crear backend para cada app:
   - `apps/public-web` → Root directory: `apps/public-web`
   - `apps/admin` → Root directory: `apps/admin`
   - `apps/dealer` → Root directory: `apps/dealer`
   - `apps/seller` → Root directory: `apps/seller`
   - `apps/advertiser` → Root directory: `apps/advertiser`
4. Configurar variables de entorno en cada backend
5. Conectar repositorio GitHub
6. Desplegar

**Estado:** ✅ **CONFIGURACIÓN LISTA** (ver `docs/FIREBASE_APP_HOSTING.md`)

---

#### Opción C: Vercel ✅ RECOMENDADO

**Pros:**
- ✅ Soporta Next.js completo
- ✅ Deploy automático desde Git
- ✅ SSL automático
- ✅ CDN global
- ✅ Plan gratuito disponible

**Contras:**
- Requiere configuración de monorepo
- Variables de entorno por proyecto

**Pasos:**
1. Instalar Vercel CLI: `npm i -g vercel`
2. Para cada app:
   ```bash
   cd apps/admin
   vercel
   # Configurar Root Directory: apps/admin
   # Configurar Build Command: cd ../.. && npm run build:admin
   ```
3. Repetir para cada app
4. Configurar variables de entorno en Vercel Dashboard

**Estado:** ✅ **DOCUMENTACIÓN LISTA** (ver `docs/VERCEL_PASOS.md`)

---

### 5. Configuración de Dominios

#### Dominios Personalizados

**Para cada app necesitas:**

1. **Public Web:**
   - Dominio principal: `autodealers.com` (o tu dominio)
   - Subdominios dinámicos: `*.autodealers.com` (wildcard DNS)

2. **Admin Panel:**
   - `admin.autodealers.com` o `admin.tu-dominio.com`

3. **Dealer Dashboard:**
   - `app.autodealers.com` o `dealer.tu-dominio.com`

4. **Seller Dashboard:**
   - `seller.autodealers.com` o `vendedor.tu-dominio.com`

5. **Advertiser Dashboard:**
   - `advertiser.autodealers.com` o `anunciante.tu-dominio.com`

**Configuración DNS:**
```
# Para Firebase Hosting
CNAME admin → tu-proyecto.web.app
CNAME app → tu-proyecto.web.app

# Para Vercel
CNAME admin → cname.vercel-dns.com
CNAME app → cname.vercel-dns.com
```

**Estado:** ⚠️ **CONFIGURAR SEGÚN PLATAFORMA**

---

### 6. Seguridad

#### Checklist de Seguridad:

- [ ] Variables de entorno configuradas (nunca en código)
- [ ] Reglas de Firestore desplegadas y probadas
- [ ] Reglas de Storage desplegadas y probadas
- [ ] HTTPS habilitado (automático en Firebase/Vercel)
- [ ] CORS configurado correctamente
- [ ] Webhooks verificados (Stripe, WhatsApp, etc.)
- [ ] Secrets de cron/scheduler configurados
- [ ] Rate limiting implementado (si aplica)

**Estado:** ⚠️ **VERIFICAR CADA ITEM**

---

### 7. Integraciones Externas

#### Stripe
- [ ] Cuenta Stripe creada
- [ ] API Keys de producción configuradas
- [ ] Webhook configurado en Stripe Dashboard
- [ ] Webhook secret configurado en variables de entorno

#### Meta/WhatsApp (si aplica)
- [ ] App de Facebook creada
- [ ] WhatsApp Business API configurada
- [ ] Tokens de acceso configurados
- [ ] Webhooks configurados

#### Email (si aplica)
- [ ] Cuenta SendGrid o Resend creada
- [ ] API Key configurada
- [ ] Dominio verificado

#### SMS (si aplica)
- [ ] Cuenta Twilio creada
- [ ] Credenciales configuradas
- [ ] Número de teléfono verificado

**Estado:** ⚠️ **CONFIGURAR SEGÚN NECESIDADES**

---

### 8. Base de Datos

#### Firestore
- [ ] Estructura de colecciones creada
- [ ] Índices compuestos creados (si aplica)
- [ ] Datos de prueba creados (opcional)
- [ ] Backup automático configurado

**Estado:** ⚠️ **VERIFICAR**

---

### 9. Testing Pre-Producción

#### Checklist de Pruebas:

- [ ] Login/Logout funciona
- [ ] Creación de usuarios funciona
- [ ] Dashboard carga correctamente
- [ ] CRUD de leads funciona
- [ ] CRUD de vehículos funciona
- [ ] Subida de imágenes funciona
- [ ] Pagos con Stripe funcionan (modo test)
- [ ] Webhooks responden correctamente
- [ ] APIs responden correctamente
- [ ] Errores se manejan correctamente

**Estado:** ⚠️ **EJECUTAR PRUEBAS**

---

## 🚀 PLAN DE ACCIÓN PARA IR A PRODUCCIÓN

### Paso 1: Corregir Problemas Críticos
1. ✅ Corregir `firebase.json` (eliminar referencia a función inexistente)
2. ⚠️ Configurar todas las variables de entorno

### Paso 2: Elegir Plataforma de Despliegue
- **Recomendado:** Vercel (más fácil) o Firebase App Hosting (más integrado)
- **Alternativa:** Firebase Hosting (solo si no necesitas API Routes)

### Paso 3: Configurar Dominios
- Configurar DNS según plataforma elegida
- Verificar SSL automático

### Paso 4: Desplegar
- Desplegar cada app por separado
- Verificar que cada app funciona en su URL

### Paso 5: Testing en Producción
- Probar todas las funcionalidades críticas
- Verificar que los webhooks funcionan
- Monitorear logs de errores

---

## 📊 RESUMEN DE ESTADO

| Componente | Estado | Notas |
|------------|--------|-------|
| **Arquitectura** | ✅ Lista | Monorepo configurado correctamente |
| **Builds** | ✅ Funcionan | Scripts de build disponibles |
| **Firebase Config** | 🟡 Parcial | Requiere corrección en firebase.json |
| **Variables Entorno** | ⚠️ Pendiente | Configurar en cada plataforma |
| **Firestore Rules** | ⚠️ Verificar | Desplegar antes de producción |
| **Storage Rules** | ⚠️ Verificar | Desplegar antes de producción |
| **Despliegue Firebase** | 🟡 Limitado | Solo estático, sin API Routes |
| **Despliegue Vercel** | ✅ Listo | Documentación completa |
| **Despliegue App Hosting** | ✅ Listo | Requiere plan Blaze |
| **Dominios** | ⚠️ Pendiente | Configurar DNS |
| **Integraciones** | ⚠️ Pendiente | Configurar según necesidades |
| **Seguridad** | ⚠️ Verificar | Revisar checklist completo |
| **Testing** | ⚠️ Pendiente | Ejecutar pruebas antes de producción |

---

## ⚠️ ADVERTENCIAS IMPORTANTES

1. **Firebase Hosting estático NO soporta:**
   - API Routes de Next.js (`/api/*`)
   - Server-Side Rendering (SSR)
   - Server Components dinámicos
   
   **Solución:** Usar Firebase App Hosting o Vercel

2. **Variables de entorno:**
   - Nunca commitees archivos `.env` al repositorio
   - Configura variables en cada plataforma de despliegue
   - Usa diferentes valores para desarrollo y producción

3. **Reglas de seguridad:**
   - Despliega reglas de Firestore y Storage ANTES de producción
   - Prueba las reglas en modo emulador primero
   - No uses reglas permisivas en producción

4. **Webhooks:**
   - Configura URLs de producción en servicios externos (Stripe, Meta, etc.)
   - Verifica que los secrets coincidan
   - Prueba los webhooks después del despliegue

---

## 📞 PRÓXIMOS PASOS

1. **Inmediato:** Corregir `firebase.json`
2. **Corto plazo:** Elegir plataforma de despliegue y configurar
3. **Medio plazo:** Configurar dominios y SSL
4. **Antes de producción:** Ejecutar todas las pruebas y verificar seguridad

---

**Última actualización:** 7 de febrero de 2026


