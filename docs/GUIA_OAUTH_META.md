# 🔐 Guía Completa: Obtener Tokens de Acceso para Facebook e Instagram

Esta guía te explica paso a paso cómo obtener los tokens de acceso adicionales mediante OAuth para usar Facebook Pages e Instagram Business.

## 📋 Requisitos Previos

- ✅ Tienes el **App ID** y **App Secret** de Meta configurados
- ✅ Tu aplicación de Meta tiene los productos habilitados:
  - Facebook Login
  - Instagram Graph API
  - Pages (para Facebook)

---

## 🎯 Opción 1: Usar la Interfaz de la Plataforma (Recomendado)

### Paso 1: Acceder a la Página de Integraciones

1. Ve al panel de admin: `/admin/settings/integrations`
2. Busca la sección de **Facebook** o **Instagram**
3. Haz clic en el botón **"Conectar"** o **"Obtener Tokens"**

### Paso 2: Autorizar la Aplicación

1. Serás redirigido a Facebook para autorizar la aplicación
2. Inicia sesión con tu cuenta de Facebook/Instagram Business
3. Autoriza los permisos solicitados:
   - **Para Facebook:** `pages_manage_posts`, `pages_read_engagement`, `pages_manage_metadata`, `pages_messaging`
   - **Para Instagram:** `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `pages_show_list`

### Paso 3: Seleccionar Páginas/Cuentas

- **Facebook:** Selecciona la página que quieres conectar
- **Instagram:** Selecciona la cuenta de Instagram Business asociada a tu página de Facebook

### Paso 4: Confirmar Conexión

Una vez autorizado, serás redirigido de vuelta a la plataforma y los tokens se guardarán automáticamente.

---

## 🛠️ Opción 2: Usar Graph API Explorer (Manual)

### Para Facebook Page Access Token:

1. **Ve a Graph API Explorer:**
   - https://developers.facebook.com/tools/explorer/

2. **Selecciona tu aplicación:**
   - En la esquina superior derecha, selecciona tu aplicación de Meta

3. **Obtén un User Access Token:**
   - Haz clic en "Get Token" → "Get User Access Token"
   - Selecciona los permisos:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `pages_manage_metadata`
     - `pages_messaging`
     - `pages_show_list`
   - Haz clic en "Generate Access Token"
   - Autoriza la aplicación

4. **Obtén tus páginas:**
   - En el campo de consulta, escribe: `/me/accounts`
   - Haz clic en "Submit"
   - Verás una lista de tus páginas con sus IDs y tokens

5. **Obtén el Page Access Token:**
   - Copia el `access_token` de la página que quieres usar
   - Este es tu **Page Access Token** (permanente si configuraste el token de larga duración)

### Para Instagram Business Account ID:

1. **Conecta tu Instagram Business Account a tu Facebook Page:**
   - Ve a tu página de Facebook
   - Settings → Instagram → Connect Account
   - Conecta tu cuenta de Instagram Business

2. **Obtén el Instagram Business Account ID:**
   - En Graph API Explorer, con el User Access Token
   - Consulta: `/me/accounts`
   - Para cada página, consulta: `/{page-id}?fields=instagram_business_account`
   - El `id` dentro de `instagram_business_account` es tu **Instagram Business Account ID**

3. **Obtén el Instagram Access Token:**
   - El mismo Page Access Token funciona para Instagram
   - O puedes obtenerlo específicamente consultando: `/{page-id}?fields=access_token,instagram_business_account{id,username}`

---

## 🔧 Opción 3: Usar Scripts de la Plataforma

### Script para Obtener Page Access Token:

```bash
# El sistema tiene endpoints automáticos en:
POST /api/integrations/connect
# Body: { "platform": "facebook" }
```

### Script para Obtener Instagram Business Account:

```bash
# El sistema tiene endpoints automáticos en:
POST /api/integrations/connect
# Body: { "platform": "instagram" }
```

---

## 📝 Configurar Tokens en la Plataforma

Una vez que tengas los tokens:

### Para Facebook:

1. Ve a `/admin/settings/integrations`
2. En la sección de Facebook, ingresa:
   - **Page Access Token:** El token que obtuviste
   - **Page ID:** El ID de tu página de Facebook

### Para Instagram:

1. Ve a `/admin/settings/integrations`
2. En la sección de Instagram, ingresa:
   - **Instagram Business Account ID:** El ID que obtuviste
   - **Access Token:** El mismo Page Access Token (o uno específico de Instagram)

---

## 🔄 Renovar Tokens

Los tokens de Facebook/Instagram pueden expirar. Para renovarlos:

1. **Tokens de corta duración (60 días):**
   - Ve a Graph API Explorer
   - Obtén un nuevo User Access Token
   - Intercámbialo por un Page Access Token

2. **Tokens de larga duración (60 días, renovables):**
   - Configura tu aplicación para usar tokens de larga duración
   - Los tokens se renuevan automáticamente antes de expirar

3. **Usar la interfaz de la plataforma:**
   - Ve a `/admin/settings/integrations`
   - Haz clic en "Renovar Tokens"
   - Sigue el flujo de OAuth nuevamente

---

## ⚠️ Notas Importantes

1. **Seguridad:**
   - Nunca compartas tus tokens públicamente
   - Los tokens se guardan encriptados en Firestore
   - Rota los tokens periódicamente

2. **Permisos:**
   - Asegúrate de tener los permisos correctos en tu aplicación de Meta
   - Algunos permisos requieren revisión de Meta

3. **Límites:**
   - Los tokens tienen límites de uso
   - Revisa los límites de la Graph API de Meta

4. **Soporte:**
   - Si tienes problemas, revisa los logs en `/admin/settings/integrations`
   - Verifica que tu aplicación tenga los productos correctos habilitados

---

## 🆘 Solución de Problemas

### Error: "Invalid OAuth access token"
- El token expiró o es inválido
- Renueva el token siguiendo los pasos anteriores

### Error: "Insufficient permissions"
- Tu aplicación no tiene los permisos necesarios
- Ve a Meta for Developers → Tu App → Permissions
- Solicita los permisos faltantes

### Error: "Page not found"
- Verifica que la página esté conectada a tu cuenta
- Asegúrate de tener permisos de administrador en la página

### Error: "Instagram Business Account not found"
- Conecta tu cuenta de Instagram Business a tu página de Facebook
- Verifica que la cuenta sea de tipo "Business" o "Creator"

---

## 📚 Recursos Adicionales

- [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

