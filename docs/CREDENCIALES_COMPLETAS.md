# 🔐 Credenciales Completas para AutoDealers

Esta guía lista todas las credenciales necesarias para que la plataforma funcione completamente.

## 📋 Índice

1. [Firebase (OBLIGATORIO)](#1-firebase-obligatorio)
2. [Stripe (OBLIGATORIO para pagos)](#2-stripe-obligatorio-para-pagos)
3. [Firebase Client SDK (OBLIGATORIO)](#3-firebase-client-sdk-obligatorio)
4. [IA - OpenAI/Anthropic (OPCIONAL)](#4-ia---openaianthropic-opcional)
5. [WhatsApp Business API (OPCIONAL)](#5-whatsapp-business-api-opcional)
6. [Meta/Facebook/Instagram (OPCIONAL)](#6-metafacebookinstagram-opcional)
7. [Email - SendGrid/Resend (OPCIONAL)](#7-email---sendgridresend-opcional)
8. [SMS - Twilio (OPCIONAL)](#8-sms---twilio-opcional)
9. [Variables de Entorno Adicionales](#9-variables-de-entorno-adicionales)

---

## 1. Firebase (OBLIGATORIO)

**¿Para qué?** Base de datos, autenticación, almacenamiento de archivos

### Variables Requeridas:

```env
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Firebase Client SDK (Client-side):

```env
# Para apps Next.js (admin, dealer, seller, public-web, advertiser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxx
```

### Cómo Obtenerlas:

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un proyecto o selecciona uno existente
3. **Para Admin SDK:**
   - Ve a **Project Settings** → **Service Accounts**
   - Haz clic en **Generate New Private Key**
   - Descarga el JSON y extrae:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (mantén las comillas y `\n`)
4. **Para Client SDK:**
   - Ve a **Project Settings** → **General**
   - En "Your apps", selecciona o crea una app web
   - Copia los valores de `firebaseConfig`

### Configuración Adicional:

- ✅ Habilita **Authentication** → **Email/Password**
- ✅ Crea una base de datos **Firestore**
- ✅ Habilita **Storage**
- ✅ Despliega las reglas de seguridad (`firestore.rules`)

---

## 2. Stripe (OBLIGATORIO para pagos)

**¿Para qué?** Pagos, suscripciones, facturación, métodos de pago

### Variables Requeridas:

```env
# Stripe Secret Key (Server-side)
STRIPE_SECRET_KEY=sk_test_...  # Desarrollo
# STRIPE_SECRET_KEY=sk_live_...  # Producción

# Stripe Publishable Key (Client-side - OBLIGATORIO para pagos integrados)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Desarrollo
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Producción

# Stripe Webhook Secret (para webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Cómo Obtenerlas:

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. **Secret Key:**
   - Ve a **Developers** → **API keys**
   - Copia la **Secret key** (test o live según el entorno)
   - Empieza con `sk_test_` (desarrollo) o `sk_live_` (producción)
3. **Publishable Key:**
   - En la misma página de **Developers** → **API keys**
   - Copia la **Publishable key** (test o live según el entorno)
   - Empieza con `pk_test_` (desarrollo) o `pk_live_` (producción)
   - Esta key es pública y segura de usar en el frontend
4. **Webhook Secret:**
   - Ve a **Developers** → **Webhooks**
   - Crea un endpoint webhook: `https://tu-dominio.com/api/webhooks/stripe`
   - Copia el **Signing secret** (comienza con `whsec_`)

### Eventos de Webhook Necesarios:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## 3. Firebase Client SDK (OBLIGATORIO)

**Nota:** Ya mencionado en la sección de Firebase, pero necesario para todas las apps Next.js.

---

## 4. IA - OpenAI/Anthropic (OPCIONAL)

**¿Para qué?** Respuestas automáticas, clasificación de leads, generación de contenido, análisis

### Variables Requeridas (Elige uno):

```env
# Opción 1: OpenAI
OPENAI_API_KEY=sk-...

# Opción 2: Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Cómo Obtenerlas:

**OpenAI:**
1. Ve a [OpenAI Platform](https://platform.openai.com)
2. Crea una cuenta o inicia sesión
3. Ve a **API keys**
4. Crea una nueva API key
5. Copia la key (comienza con `sk-`)

**Anthropic:**
1. Ve a [Anthropic Console](https://console.anthropic.com)
2. Crea una cuenta o inicia sesión
3. Ve a **Settings** → **API Keys**
4. Crea una nueva API key
5. Copia la key (comienza con `sk-ant-`)

**Nota:** También puedes configurar estas keys desde el panel de admin en `/admin/settings/ai`

---

## 5. WhatsApp Business API (OPCIONAL)

**¿Para qué?** Envío y recepción de mensajes de WhatsApp, notificaciones

### Variables Requeridas:

```env
# Meta App ID y Secret
META_APP_ID=1234567890123456
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cómo Obtenerlas:

1. Ve a [Meta for Developers](https://developers.facebook.com)
2. Crea una **Meta App** o selecciona una existente
3. Agrega el producto **WhatsApp**
4. **App ID y Secret:**
   - Ve a **Settings** → **Basic**
   - Copia **App ID** y **App Secret**
5. **WhatsApp Phone Number ID:**
   - Ve a **WhatsApp** → **API Setup**
   - Copia el **Phone number ID**
6. **Access Token:**
   - En **WhatsApp** → **API Setup**
   - Genera un **Temporary Access Token** (o configura un token permanente)
   - Copia el token

### Configuración Adicional:

- Configura el webhook: `https://tu-dominio.com/api/webhooks/whatsapp`
- Verifica el token del webhook
- Configura los permisos necesarios

---

## 6. Meta/Facebook/Instagram (OPCIONAL)

**¿Para qué?** Publicación de posts en Facebook e Instagram, Messenger

### Variables Requeridas:

```env
# Meta App (mismo que WhatsApp)
META_APP_ID=1234567890123456
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Facebook Page Access Token (se obtiene mediante OAuth)
FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Instagram Business Account ID (se obtiene mediante OAuth)
INSTAGRAM_BUSINESS_ACCOUNT_ID=12345678901234567
```

### Cómo Obtenerlas:

1. Usa la misma **Meta App** que configuraste para WhatsApp
2. Agrega los productos:
   - **Facebook Login**
   - **Instagram Basic Display** o **Instagram Graph API**
3. **Facebook Page Token:**
   - Configura OAuth para obtener permisos de página
   - Obtén el token de la página desde Graph API Explorer
4. **Instagram Business Account:**
   - Conecta tu cuenta de Instagram Business
   - Obtén el Business Account ID desde Graph API

**Nota:** Estas credenciales se configuran por tenant desde el dashboard en `/settings/integrations`

---

## 7. Email - SendGrid/Resend (OPCIONAL)

**¿Para qué?** Envío de emails, notificaciones, recordatorios

### Variables Requeridas (Elige uno):

```env
# Opción 1: Resend (Recomendado)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Opción 2: SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cómo Obtenerlas:

**Resend:**
1. Ve a [Resend](https://resend.com)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys**
4. Crea una nueva API key
5. Copia la key (comienza con `re_`)

**SendGrid:**
1. Ve a [SendGrid](https://sendgrid.com)
2. Crea una cuenta o inicia sesión
3. Ve a **Settings** → **API Keys**
4. Crea una nueva API key
5. Copia la key (comienza con `SG.`)

### Configuración Adicional:

- Verifica tu dominio de envío
- Configura SPF y DKIM records en tu DNS

---

## 8. SMS - Twilio (OPCIONAL)

**¿Para qué?** Envío de SMS, recordatorios, notificaciones urgentes

### Variables Requeridas:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Cómo Obtenerlas:

1. Ve a [Twilio Console](https://console.twilio.com)
2. Crea una cuenta o inicia sesión
3. **Account SID y Auth Token:**
   - Ve a **Dashboard**
   - Copia **Account SID** (comienza con `AC`)
   - Copia **Auth Token** (haz clic en "View" para verlo)
4. **Phone Number:**
   - Ve a **Phone Numbers** → **Manage** → **Buy a number**
   - Compra un número de teléfono
   - Copia el número completo con código de país

---

## 9. Variables de Entorno Adicionales

### URL de la Aplicación:

```env
# URL base de tu aplicación (para webhooks y redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Desarrollo
# NEXT_PUBLIC_APP_URL=https://tu-dominio.com  # Producción
```

### Modo de Desarrollo (Opcional):

```env
# Para desarrollo sin Firebase (usa datos mock)
SKIP_FIREBASE=true  # Solo para desarrollo local
```

### Firebase Storage (Opcional):

```env
# Si usas un bucket personalizado
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json  # Alternativa al método de variables
```

---

## 📝 Archivo .env.local Completo (Ejemplo)

Crea un archivo `.env.local` en la raíz del proyecto con todas las variables:

```env
# ============================================
# FIREBASE (OBLIGATORIO)
# ============================================
FIREBASE_PROJECT_ID=autodealers-7f62e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@autodealers-7f62e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=autodealers-7f62e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=autodealers-7f62e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=autodealers-7f62e.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=857179023916
NEXT_PUBLIC_FIREBASE_APP_ID=1:857179023916:web:6919fe5ae77f78d3b1bf89

# ============================================
# STRIPE (OBLIGATORIO para pagos)
# ============================================
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# IA (OPCIONAL)
# ============================================
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# ============================================
# WHATSAPP / META (OPCIONAL)
# ============================================
META_APP_ID=1234567890123456
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# EMAIL (OPCIONAL)
# ============================================
RESEND_API_KEY=re_...
# SENDGRID_API_KEY=SG....

# ============================================
# SMS (OPCIONAL)
# ============================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# CONFIGURACIÓN GENERAL
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## ✅ Checklist de Configuración

### Mínimo Requerido (Funcionalidad Básica):
- [ ] Firebase Admin SDK
- [ ] Firebase Client SDK
- [ ] Stripe (si usas pagos)

### Funcionalidad Completa:
- [ ] Firebase (Admin + Client)
- [ ] Stripe
- [ ] OpenAI o Anthropic (para IA)
- [ ] WhatsApp Business API (para mensajería)
- [ ] Resend o SendGrid (para emails)
- [ ] Twilio (para SMS)
- [ ] Meta App (para Facebook/Instagram)

---

## 🔒 Seguridad

### Buenas Prácticas:

1. **Nunca** subas el archivo `.env.local` a Git
2. Usa variables de entorno en producción (Vercel, Firebase Functions, etc.)
3. Rota las credenciales periódicamente
4. Usa diferentes credenciales para desarrollo y producción
5. Limita los permisos de las API keys al mínimo necesario

### En Producción:

- Configura las variables de entorno en tu plataforma de hosting:
  - **Vercel:** Project Settings → Environment Variables
  - **Firebase Functions:** `firebase functions:config:set`
  - **Docker:** Usa secrets o variables de entorno del contenedor

---

## 📚 Recursos Adicionales

- [Firebase Setup Guide](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Resend Documentation](https://resend.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar la plataforma sin todas las credenciales?**
R: Sí, solo Firebase y Stripe son obligatorios. Las demás son opcionales y solo afectan funcionalidades específicas.

**P: ¿Dónde configuro las credenciales por tenant?**
R: Algunas credenciales (como WhatsApp, Facebook, Instagram) se configuran por tenant desde `/settings/integrations` en cada dashboard.

**P: ¿Cómo sé si una credencial está funcionando?**
R: Revisa los logs de la aplicación. Si falta una credencial, verás errores específicos en la consola.

**P: ¿Puedo cambiar de proveedor después?**
R: Sí, puedes cambiar entre OpenAI/Anthropic, Resend/SendGrid, etc. Solo actualiza las variables de entorno.

---

**Última actualización:** 2024

