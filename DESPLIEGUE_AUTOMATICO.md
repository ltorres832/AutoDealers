# 🚀 DESPLIEGUE LO MÁS AUTOMATIZADO POSIBLE

## ✅ LO QUE YA ESTÁ LISTO (YO LO HICE)

1. ✅ Todos los `vercel.json` creados y configurados
2. ✅ Scripts de verificación creados
3. ✅ Documentación completa creada
4. ✅ Build commands configurados correctamente

---

## 🎯 LO QUE PUEDES HACER EN 3 PASOS

### PASO 1: Login en Vercel (1 minuto)
```powershell
vercel login
```
Abre el navegador y autoriza.

---

### PASO 2: Desplegar (10 minutos)

**Opción A: Una por una (Recomendado la primera vez)**

```powershell
# 1. Public Web
cd apps/public-web
vercel
# Responde: Y, N, autodealers-public-web, apps/public-web

# 2. Admin
cd ../admin
vercel
# Responde: Y, N, autodealers-admin, apps/admin

# 3. Dealer
cd ../dealer
vercel
# Responde: Y, N, autodealers-dealer, apps/dealer

# 4. Seller
cd ../seller
vercel
# Responde: Y, N, autodealers-seller, apps/seller

# 5. Advertiser
cd ../advertiser
vercel
# Responde: Y, N, autodealers-advertiser, apps/advertiser
```

**Opción B: Script interactivo (más fácil)**

```powershell
.\scripts\deploy-vercel-all.ps1
```
Te guía paso a paso.

---

### PASO 3: Configurar en Vercel Dashboard (5 minutos)

Para CADA proyecto:

1. Ve a https://vercel.com/dashboard
2. Abre el proyecto
3. **Settings → General:**
   - Root Directory: `apps/[nombre-app]`
   - Build Command: `cd ../.. && npm ci && npm run build:[nombre-app]`
   - Install Command: `cd ../.. && npm ci`
   - Output Directory: `.next`
4. **Settings → Environment Variables:**
   - Agrega variables de Firebase (ver abajo)
5. **Redeploy**

---

## 📋 VARIABLES DE ENTORNO MÍNIMAS

Para TODAS las apps:
```
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
```

Para ADMIN también:
```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=tu-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## ⚡ COMANDO RÁPIDO PARA CADA APP

Después del primer deploy, para desplegar a producción:

```powershell
# Public Web
cd apps/public-web && vercel --prod && cd ../..

# Admin
cd apps/admin && vercel --prod && cd ../..

# Dealer
cd apps/dealer && vercel --prod && cd ../..

# Seller
cd apps/seller && vercel --prod && cd ../..

# Advertiser
cd apps/advertiser && vercel --prod && cd ../..
```

---

## 🎯 RESUMEN: 3 PASOS

1. **Login:** `vercel login` (1 min)
2. **Desplegar:** `cd apps/[app] && vercel` (10 min)
3. **Configurar:** Vercel Dashboard (5 min)

**Total: ~15-20 minutos**

---

## 📖 DOCUMENTACIÓN COMPLETA

- **Guía rápida:** `VERCEL_AHORA.md`
- **Guía detallada:** `DEPLOY_VERCEL.md`
- **Lo que puedo hacer:** `LO_QUE_PUEDO_HACER.md`

---

**¡TODO ESTÁ LISTO! SOLO NECESITAS EJECUTAR LOS COMANDOS** 🚀


