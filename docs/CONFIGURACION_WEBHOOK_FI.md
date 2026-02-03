# Configuración de Webhook para Emails F&I

Esta guía te ayudará a configurar el webhook para recibir respuestas de emails externos en el módulo F&I.

## 📋 Requisitos Previos

1. Tener una cuenta activa en Resend o SendGrid
2. Tener un dominio verificado en tu proveedor de email
3. Tener acceso al panel de administración de tu proveedor

## 🔧 Configuración en Resend

### Paso 1: Acceder a Webhooks
1. Inicia sesión en [Resend Dashboard](https://resend.com/dashboard)
2. Ve a **Settings** → **Webhooks**
3. Haz clic en **Add Webhook**

### Paso 2: Configurar el Webhook
- **Name**: `FI Email Replies`
- **URL**: `https://tudominio.com/api/fi/email-reply`
  - Reemplaza `tudominio.com` con tu dominio real
- **Events**: Selecciona:
  - ✅ `email.replied` (Respuestas a emails)
  - ✅ `email.bounced` (Emails rebotados)
  - ✅ `email.delivered` (Opcional, para tracking)

### Paso 3: Guardar y Verificar
1. Haz clic en **Save**
2. Copia el **Signing Secret** (lo necesitarás para verificación)
3. Verifica que el webhook esté activo (status: Active)

### Paso 4: Configurar Dominio para Respuestas
1. Ve a **Domains** en Resend
2. Asegúrate de tener un dominio verificado
3. El sistema usará emails con formato: `fi-{requestId}-{token}@tudominio.com`

## 🔧 Configuración en SendGrid

### Paso 1: Acceder a Webhooks
1. Inicia sesión en [SendGrid Dashboard](https://app.sendgrid.com)
2. Ve a **Settings** → **Mail Settings** → **Event Webhook**
3. Haz clic en **Create New Webhook**

### Paso 2: Configurar el Webhook
- **Name**: `FI Email Replies`
- **HTTP POST URL**: `https://tudominio.com/api/fi/email-reply`
- **Events**: Selecciona:
  - ✅ `inbound` (Emails entrantes)
  - ✅ `bounce` (Emails rebotados)
  - ✅ `delivered` (Opcional)

### Paso 3: Configurar Inbound Parse
1. Ve a **Settings** → **Inbound Parse**
2. Crea una nueva configuración:
   - **Subdomain**: `fi-replies` (o el que prefieras)
   - **Domain**: Tu dominio verificado
   - **Destination URL**: `https://tudominio.com/api/fi/email-reply`
   - **Spam Check**: Activado (recomendado)

## ✅ Verificación del Webhook

### Opción 1: Usar el Endpoint de Verificación
```bash
curl https://tudominio.com/api/fi/email-reply
```

Deberías recibir:
```json
{
  "status": "ok",
  "message": "FI Email Reply Webhook está activo",
  "endpoint": "/api/fi/email-reply"
}
```

### Opción 2: Probar con un Email de Prueba
1. Envía un email externo desde el panel F&I
2. Responde a ese email desde la cuenta externa
3. Verifica que la respuesta aparezca en la solicitud F&I

## 🔍 Troubleshooting

### El webhook no recibe respuestas
1. Verifica que la URL sea accesible públicamente
2. Verifica que el dominio esté correctamente configurado
3. Revisa los logs del webhook en Resend/SendGrid
4. Verifica que el formato del email de respuesta sea correcto

### Errores 404 o 500
1. Verifica que la ruta `/api/fi/email-reply` exista
2. Revisa los logs del servidor
3. Verifica que Firestore esté correctamente configurado

### Emails no se procesan
1. Verifica que el token en el email de respuesta sea válido
2. Revisa la colección `fi_email_replies` en Firestore
3. Verifica que la solicitud F&I exista

## 📝 Variables de Entorno Necesarias

Asegúrate de tener configuradas estas variables:

```env
# Email Provider
RESEND_API_KEY=re_xxxxx
# o
SENDGRID_API_KEY=SG.xxxxx

# Email Domain (para respuestas)
EMAIL_DOMAIN=autodealers.com

# Public URL
NEXT_PUBLIC_PUBLIC_WEB_URL=https://tudominio.com
```

## 🎯 Próximos Pasos

Una vez configurado:
1. Prueba enviando un email externo desde el panel F&I
2. Responde a ese email
3. Verifica que la respuesta aparezca en la solicitud F&I
4. Revisa las notificaciones del gerente F&I

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Revisa los logs del webhook en Resend/SendGrid
3. Verifica la configuración de Firestore
4. Contacta al equipo de desarrollo



