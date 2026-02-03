# Guía de Integraciones

## Integraciones Externas

### 1. Firebase

#### Autenticación
- Firebase Auth para autenticación de usuarios
- JWT tokens para sesiones
- Refresh tokens automáticos

#### Firestore
- Base de datos principal
- Reglas de seguridad por tenant
- Índices optimizados

#### Storage
- Almacenamiento de imágenes de vehículos
- Documentos de ventas
- Logos y branding

### 2. Stripe

#### Configuración
- Webhooks para eventos de suscripción
- Customer Portal para gestión de pagos
- Suscripciones recurrentes

#### Eventos Manejados
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 3. WhatsApp Business API

#### Configuración
- Meta Business Account
- WhatsApp Business API credentials
- Webhook para mensajes entrantes

#### Funcionalidades
- Envío de mensajes
- Recepción de mensajes
- Plantillas de mensajes
- Notificaciones

### 4. Meta Graph API

#### Facebook
- Publicación de posts
- Gestión de páginas
- Messenger API
- Marketplace (asistido)

#### Instagram
- Publicación de posts
- Instagram Messaging API
- Gestión de contenido

### 5. IA (OpenAI / Anthropic)

#### Endpoints Utilizados
- Chat completions para respuestas
- Embeddings para clasificación
- Moderation para contenido

#### Casos de Uso
- Respuestas automáticas
- Clasificación de leads
- Generación de contenido
- Análisis de sentimiento

### 6. Email (SendGrid / Resend)

#### Configuración
- API Key
- Templates
- Dominio verificado

#### Tipos de Email
- Notificaciones de sistema
- Recordatorios de citas
- Recordatorios post-venta
- Confirmaciones

### 7. SMS (Twilio)

#### Configuración
- Account SID
- Auth Token
- Número de teléfono

#### Casos de Uso
- Recordatorios de citas
- Recordatorios post-venta
- Notificaciones urgentes

## Variables de Entorno

```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Meta / WhatsApp
META_APP_ID=
META_APP_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# IA
OPENAI_API_KEY=
# o
ANTHROPIC_API_KEY=

# Email
SENDGRID_API_KEY=
# o
RESEND_API_KEY=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## Seguridad

### Credenciales
- Todas las credenciales encriptadas en Firestore
- Variables de entorno nunca en código
- Rotación periódica de tokens

### Webhooks
- Verificación de firma en todos los webhooks
- Validación de origen
- Rate limiting

### APIs
- Rate limiting por tenant
- Quotas por membresía
- Monitoreo de uso





