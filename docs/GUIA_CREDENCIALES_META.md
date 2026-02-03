# 📘 Guía: Cómo Obtener App ID y App Secret de Meta

Esta guía te ayudará a obtener las credenciales necesarias para conectar tus cuentas de Facebook e Instagram en la plataforma.

## 🎯 ¿Qué necesitas?

- Una cuenta de Facebook
- Una página de Facebook (para Facebook)
- Una cuenta de Instagram Business o Creator (para Instagram)
- Acceso a Meta for Developers

---

## 📝 Paso 1: Crear una Aplicación en Meta for Developers

1. **Ve a Meta for Developers**
   - Abre tu navegador y visita: https://developers.facebook.com
   - Inicia sesión con tu cuenta de Facebook

2. **Crear Nueva Aplicación**
   - Haz clic en **"Mis aplicaciones"** (arriba a la derecha)
   - Selecciona **"Crear aplicación"**
   - Elige el tipo: **"Negocio"** o **"Otro"**
   - Completa:
     - **Nombre de la aplicación**: Ej: "Mi Concesionario" o "Mi Negocio de Autos"
     - **Email de contacto**: Tu email
     - **Propósito**: "Gestionar mi negocio"
   - Haz clic en **"Crear aplicación"**

---

## 🔑 Paso 2: Obtener App ID y App Secret

1. **En el Dashboard de tu Aplicación**
   - Ve a **"Configuración"** → **"Básico"** (menú lateral izquierdo)

2. **App ID**
   - El **App ID** está visible en la parte superior de la página
   - Es un número largo (ej: `1234567890123456`)
   - **Cópialo** - lo necesitarás para la plataforma

3. **App Secret**
   - Busca la sección **"Secreto de aplicación"**
   - Haz clic en **"Mostrar"** (puede pedirte tu contraseña de Facebook)
   - **Copia el App Secret** - es una cadena larga de letras y números
   - ⚠️ **IMPORTANTE**: Guárdalo en un lugar seguro, no lo compartas

---

## 🔧 Paso 3: Configurar Productos de la Aplicación

### Para Facebook:

1. En el dashboard, busca **"Facebook Login"** o **"Página"**
2. Haz clic en **"Configurar"** o **"Agregar producto"**
3. Selecciona **"Facebook Login"** → **"Configurar"**

### Para Instagram:

1. Busca **"Instagram"** en el dashboard
2. Haz clic en **"Configurar"**
3. Sigue las instrucciones para conectar tu cuenta de Instagram Business

---

## 🌐 Paso 4: Configurar URLs de Redirección

1. Ve a **"Configuración"** → **"Básico"**
2. En **"Dominios de la aplicación"**, agrega:
   - Tu dominio (si tienes uno)
   - `localhost` (para pruebas)

3. Ve a **"Configuración"** → **"Facebook Login"** → **"Configuración"**
4. En **"URI de redirección de OAuth válidos"**, agrega:
   ```
   http://localhost:3002/api/settings/integrations/callback
   https://tu-dominio.com/api/settings/integrations/callback
   ```
   (Reemplaza `tu-dominio.com` con tu dominio real si lo tienes)

---

## 🔐 Paso 5: Configurar Permisos

1. Ve a **"Configuración"** → **"Permisos y características"**
2. Solicita estos permisos (según lo que necesites):

   **Para Facebook:**
   - `pages_manage_posts` - Publicar en tu página
   - `pages_read_engagement` - Ver interacciones
   - `pages_messaging` - Gestionar mensajes

   **Para Instagram:**
   - `instagram_basic` - Acceso básico
   - `instagram_content_publish` - Publicar contenido
   - `instagram_manage_messages` - Gestionar mensajes

3. **Nota**: Algunos permisos requieren revisión de Meta (puede tardar días). Para desarrollo, puedes usar el modo de prueba.

---

## 📱 Paso 6: Conectar tu Página de Facebook

1. Ve a tu página de Facebook
2. **Configuración** → **Página** → **Asignar roles**
3. Asigna tu aplicación como administrador de la página

---

## 📸 Paso 7: Conectar Instagram Business

1. Tu cuenta de Instagram debe ser **Business** o **Creator**
2. Conecta tu Instagram a tu página de Facebook:
   - Ve a la configuración de tu página de Facebook
   - **Configuración** → **Instagram**
   - Conecta tu cuenta de Instagram
3. En Meta for Developers, asocia tu Instagram Business Account a la aplicación

---

## ✅ Paso 8: Usar las Credenciales en la Plataforma

1. **Copia tu App ID y App Secret** (del Paso 2)
2. En la plataforma, ve a **Configuración** → **Integraciones**
3. Haz clic en **"Conectar"** en Facebook o Instagram
4. Ingresa:
   - **App ID**: Pega el App ID que copiaste
   - **App Secret**: Pega el App Secret que copiaste
5. Haz clic en **"Continuar"**
6. Serás redirigido a Facebook para autorizar el acceso
7. Selecciona la página que quieres conectar
8. Autoriza los permisos
9. ¡Listo! Tu cuenta está conectada

---

## 🆘 Solución de Problemas

### "App ID no válido"
- Verifica que copiaste el App ID completo
- Asegúrate de que la aplicación esté en modo "Desarrollo" o "Producción"

### "App Secret incorrecto"
- Verifica que copiaste el App Secret completo (sin espacios)
- Asegúrate de que no haya expirado (los secrets pueden expirar)

### "Error al autorizar"
- Verifica que agregaste la URL de redirección correcta
- Asegúrate de que tu aplicación tenga los permisos necesarios
- Verifica que tu página de Facebook esté conectada a la aplicación

### "No puedo ver mi página en la autorización"
- Asegúrate de que tu aplicación tenga acceso a tu página
- Verifica que eres administrador de la página

---

## 🔒 Seguridad

- ⚠️ **NUNCA compartas tu App Secret** con nadie
- ⚠️ **No lo subas a repositorios públicos** (GitHub, etc.)
- ✅ Solo ingrésalo en la plataforma una vez
- ✅ La plataforma lo guarda de forma segura encriptado

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa la documentación oficial: https://developers.facebook.com/docs
2. Verifica que tu aplicación esté configurada correctamente
3. Contacta al soporte de la plataforma

---

## 📋 Resumen Rápido

1. ✅ Crear aplicación en https://developers.facebook.com
2. ✅ Obtener App ID y App Secret en Configuración → Básico
3. ✅ Agregar productos (Facebook Login, Instagram)
4. ✅ Configurar URLs de redirección
5. ✅ Solicitar permisos necesarios
6. ✅ Conectar página de Facebook e Instagram
7. ✅ Ingresar credenciales en la plataforma
8. ✅ Autorizar acceso

¡Listo para conectar tus redes sociales! 🎉


