# 🚀 Guía de Despliegue a Producción

## ✅ Checklist Pre-Despliegue

Antes de desplegar, asegúrate de tener:

- [x] ✅ Todas las funcionalidades implementadas y probadas
- [ ] 🔐 Variables de entorno configuradas en producción
- [ ] 🔥 Firebase proyecto configurado
- [ ] 📧 Servicios externos configurados (Stripe, Meta, Email, SMS)
- [ ] 🌐 Dominio propio (opcional pero recomendado)

---

## 📋 Paso 1: Configurar Variables de Entorno en Producción

### Opción A: Firebase Functions (Recomendado para Admin Panel)

Las variables de entorno se configuran automáticamente desde `.env.local` durante el build, pero para producción necesitas:

```bash
# Ver variables actuales
firebase functions:config:get

# Configurar variables (ejemplo)
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set openai.api_key="sk-..."
```

### Opción B: Vercel (Más fácil para Next.js)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Importa tu proyecto
3. Configura las variables de entorno en Settings → Environment Variables

---

## 🔥 Paso 2: Desplegar en Firebase Hosting

### 2.1 Verificar Firebase CLI

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Login
firebase login

# Verificar proyecto
firebase projects:list
firebase use --add  # Seleccionar tu proyecto
```

### 2.2 Desplegar Reglas de Seguridad

```bash
# Desplegar reglas de Firestore
firebase deploy --only firestore:rules

# Desplegar índices de Firestore
firebase deploy --only firestore:indexes

# Desplegar reglas de Storage
firebase deploy --only storage
```

### 2.3 Build y Despliegue de Apps

#### **Admin Panel** (Panel Principal)

```bash
# Build
cd apps/admin
npm run build

# Desplegar
firebase deploy --only hosting:admin-panel

# O usar el script del root
npm run deploy:admin
```

**URL resultante:** `https://[tu-proyecto].web.app/admin` o dominio personalizado

#### **Public Web** (Sitio Público)

```bash
# Build
cd apps/public-web
npm run build

# Desplegar
firebase deploy --only hosting:public-site

# O usar el script del root
npm run deploy:public
```

**URL resultante:** `https://[tu-proyecto].web.app` o dominio personalizado

#### **Dealer Dashboard**

```bash
npm run deploy:dealer
```

#### **Seller Dashboard**

```bash
npm run deploy:seller
```

#### **Advertiser Dashboard**

```bash
npm run deploy:advertiser
```

### 2.4 Desplegar Todo Junto

```bash
# Build todas las apps
npm run build:all

# Preparar archivos de hosting
npm run prepare-hosting

# Desplegar todo
firebase deploy --only hosting
```

---

## 🌐 Paso 3: Configurar Dominio Personalizado

### 3.1 En Firebase Console

1. Ve a **Firebase Console** → **Hosting**
2. Click en **"Agregar dominio personalizado"**
3. Ingresa tu dominio (ej: `autodealers.com`)
4. Firebase te dará registros DNS para configurar

### 3.2 Configurar DNS

Agrega estos registros en tu proveedor de DNS:

```
Tipo: A
Nombre: @
Valor: [IP que Firebase te proporciona]

Tipo: CNAME
Nombre: www
Valor: [tu-proyecto].web.app
```

### 3.3 Configurar Subdominios (Opcional)

Para tener URLs separadas:

```
admin.autodealers.com → Admin Panel
app.autodealers.com → Dealer Dashboard
vendedor.autodealers.com → Seller Dashboard
```

En Firebase Hosting, puedes configurar múltiples sitios y asignarles dominios diferentes.

---

## 🚀 Opción Alternativa: Vercel (Más Fácil)

Vercel es más simple para Next.js y ofrece mejor rendimiento:

### 3.1 Instalar Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Desplegar Admin Panel

```bash
cd apps/admin
vercel --prod
```

### 3.3 Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega todas las variables de `.env.local`

### 3.4 Configurar Dominio en Vercel

1. Settings → Domains
2. Agrega tu dominio personalizado
3. Configura los registros DNS que Vercel te proporciona

**Ventajas de Vercel:**
- ✅ Despliegue automático desde Git
- ✅ SSL automático
- ✅ CDN global
- ✅ Preview deployments
- ✅ Analytics integrado

---

## 📊 Paso 4: Verificar Despliegue

### Checklist Post-Despliegue

- [ ] ✅ Admin Panel accesible en `/admin`
- [ ] ✅ Login funciona correctamente
- [ ] ✅ Dashboard carga datos reales
- [ ] ✅ Notificaciones funcionan
- [ ] ✅ Chat/Mensajería funciona
- [ ] ✅ Calendario de citas funciona
- [ ] ✅ Reportes generan gráficos
- [ ] ✅ Crear leads funciona
- [ ] ✅ Variables de entorno funcionan

### URLs de Prueba

```
Admin Panel: https://[tu-dominio]/admin
Public Web: https://[tu-dominio]
Dashboard: https://[tu-dominio]/dashboard
Leads: https://[tu-dominio]/leads
Mensajes: https://[tu-dominio]/messages
Citas: https://[tu-dominio]/appointments
Reportes: https://[tu-dominio]/reports
```

---

## 🔧 Configuración Adicional

### Firebase App Hosting (Para Backend Next.js)

Si necesitas funciones server-side más complejas:

```bash
cd apps/admin
firebase init apphosting
firebase deploy --only apphosting
```

### Monitoreo y Logs

```bash
# Ver logs de Firebase Functions
firebase functions:log

# Ver logs de hosting
firebase hosting:channel:list
```

### Rollback si algo sale mal

```bash
# Ver releases anteriores
firebase hosting:channel:list

# Hacer rollback
firebase hosting:clone [release-id] [canal-actual]
```

---

## 🎯 Comandos Rápidos de Referencia

```bash
# Desarrollo local
npm run dev

# Build todas las apps
npm run build:all

# Desplegar Admin Panel
npm run deploy:admin

# Desplegar Public Web
npm run deploy:public

# Desplegar todo en Firebase
firebase deploy --only hosting

# Desplegar reglas de seguridad
firebase deploy --only firestore:rules,storage

# Desplegar en Vercel (Admin)
cd apps/admin && vercel --prod

# Ver estado del proyecto
firebase projects:list
firebase use
```

---

## ⚠️ Notas Importantes

1. **Variables de Entorno:** Asegúrate de que todas las variables estén configuradas en producción
2. **Reglas de Firestore:** Despliega las reglas ANTES de hacer público
3. **Índices:** Crea los índices necesarios en Firestore antes de desplegar
4. **SSL:** Firebase y Vercel proporcionan SSL automático
5. **Backups:** Configura backups automáticos de Firestore
6. **Monitoreo:** Configura alertas para errores críticos

---

## 🆘 Solución de Problemas

### Error: "Build failed"
- Verifica que todas las dependencias estén instaladas
- Revisa los logs de build para errores específicos

### Error: "Hosting target not found"
- Verifica que `.firebaserc` tenga el proyecto correcto
- Ejecuta `firebase use --add` para seleccionar proyecto

### Error: "Environment variables missing"
- Verifica que todas las variables estén en `.env.local`
- Para producción, configura en Firebase Functions o Vercel

### Error: "Firestore rules denied"
- Revisa `firestore.rules` y despliega nuevamente
- Verifica que el usuario tenga los permisos correctos

---

## ✅ Estado Actual

**Funcionalidades Listas para Producción:**
- ✅ Sistema de Notificaciones en Tiempo Real
- ✅ Chat/Mensajería Unificada
- ✅ Calendario de Citas con Drag & Drop
- ✅ Dashboard con Gráficos en Tiempo Real
- ✅ Reportes con Visualizaciones Interactivas
- ✅ Gestión de Leads (CRM)
- ✅ Gestión de Usuarios
- ✅ Tracking de Último Acceso

**Listo para desplegar:** ✅ SÍ

---

## 🎉 ¡Listo para Producción!

Tu aplicación está lista para estar **LIVE** con su propio dominio. 

**Recomendación:** Empieza con Vercel para el Admin Panel (más fácil) y Firebase Hosting para el sitio público.

¿Necesitas ayuda con algún paso específico?
