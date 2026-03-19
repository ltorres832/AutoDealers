# ⚡ VERCEL - DESPLIEGUE INMEDIATO

## ✅ TODO ESTÁ LISTO PARA DESPLEGAR

He creado y corregido todos los archivos necesarios:

- ✅ `apps/public-web/vercel.json` - Configurado
- ✅ `apps/admin/vercel.json` - Configurado  
- ✅ `apps/dealer/vercel.json` - Creado
- ✅ `apps/seller/vercel.json` - Creado
- ✅ `apps/advertiser/vercel.json` - Creado
- ✅ Scripts de despliegue automático creados

---

## 🚀 EMPIEZA AHORA (5 MINUTOS POR APP)

### OPCIÓN 1: Despliegue Manual (Recomendado la primera vez)

#### 1. PUBLIC-WEB
```powershell
cd apps/public-web
vercel
```
**Respuestas:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-public-web**
- Directory? → **apps/public-web** (o Enter)

**Luego en Vercel Dashboard:**
- Settings → General
- Root Directory: `apps/public-web`
- Build Command: `cd ../.. && npm ci && npm run build:public`
- Install Command: `cd ../.. && npm ci`
- Output Directory: `.next`
- Save

**Desplegar a producción:**
```powershell
vercel --prod
```

---

#### 2. ADMIN
```powershell
cd ../admin
vercel
```
**Respuestas:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-admin**
- Directory? → **apps/admin**

**En Vercel Dashboard:**
- Root Directory: `apps/admin`
- Build Command: `cd ../.. && npm ci && npm run build:admin`
- Install Command: `cd ../.. && npm ci`
- Output Directory: `.next`
- Save

**Desplegar:**
```powershell
vercel --prod
```

---

#### 3. DEALER
```powershell
cd ../dealer
vercel
```
**Respuestas:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-dealer**
- Directory? → **apps/dealer**

**En Vercel Dashboard:**
- Root Directory: `apps/dealer`
- Build Command: `cd ../.. && npm ci && npm run build:dealer`
- Install Command: `cd ../.. && npm ci`
- Output Directory: `.next`
- Save

**Desplegar:**
```powershell
vercel --prod
```

---

#### 4. SELLER
```powershell
cd ../seller
vercel
```
**Respuestas:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-seller**
- Directory? → **apps/seller**

**En Vercel Dashboard:**
- Root Directory: `apps/seller`
- Build Command: `cd ../.. && npm ci && npm run build:seller`
- Install Command: `cd ../.. && npm ci`
- Output Directory: `.next`
- Save

**Desplegar:**
```powershell
vercel --prod
```

---

#### 5. ADVERTISER
```powershell
cd ../advertiser
vercel
```
**Respuestas:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-advertiser**
- Directory? → **apps/advertiser**

**En Vercel Dashboard:**
- Root Directory: `apps/advertiser`
- Build Command: `cd ../.. && npm ci && cd apps/advertiser && npm run build`
- Install Command: `cd ../.. && npm ci`
- Output Directory: `.next`
- Save

**Desplegar:**
```powershell
vercel --prod
```

---

### OPCIÓN 2: Script Automático

```powershell
# Desde la raíz del proyecto
.\scripts\deploy-vercel-all.ps1
```

O en Linux/Mac:
```bash
bash scripts/deploy-vercel-all.sh
```

---

## 🔐 CONFIGURAR VARIABLES DE ENTORNO (CRÍTICO)

**Para CADA proyecto en Vercel Dashboard:**

1. Ve a **Settings → Environment Variables**
2. Agrega estas variables (MÍNIMAS):

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

**Para ADMIN también:**
```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=tu-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Si usas Stripe:**
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Selecciona: **Production, Preview, Development** ✅
4. **Save**
5. **Redeploy** el proyecto

---

## ✅ VERIFICAR

Cada app tendrá su URL:
- Public Web: `https://autodealers-public-web.vercel.app`
- Admin: `https://autodealers-admin.vercel.app`
- Dealer: `https://autodealers-dealer.vercel.app`
- Seller: `https://autodealers-seller.vercel.app`
- Advertiser: `https://autodealers-advertiser.vercel.app`

**Abre cada URL y verifica que carga.**

---

## 📋 CHECKLIST RÁPIDO

- [ ] Vercel CLI instalado (`npm i -g vercel`)
- [ ] Cuenta de Vercel creada
- [ ] Public Web desplegado
- [ ] Admin desplegado
- [ ] Dealer desplegado
- [ ] Seller desplegado
- [ ] Advertiser desplegado
- [ ] Variables de entorno configuradas en cada proyecto
- [ ] Redeploy después de variables
- [ ] Verificado que cada app carga correctamente

---

## ⚠️ SI ALGO FALLA

1. **Build falla:**
   - Verifica Root Directory en Vercel Dashboard
   - Verifica Build Command
   - Revisa logs en Vercel Dashboard → Deployments → Build Logs

2. **Error de variables:**
   - Verifica que todas las variables estén en Vercel
   - Verifica que los valores sean correctos
   - Redeploy después de agregar variables

3. **Error de módulos:**
   - Verifica que `npm ci` funcione en la raíz
   - Verifica que todos los packages estén en package.json

---

## 🎯 RESUMEN

**Tiempo estimado:** 15-20 minutos para las 5 apps

**Pasos:**
1. Desplegar cada app con `vercel`
2. Configurar Root Directory y Build Command en Vercel Dashboard
3. Desplegar a producción con `vercel --prod`
4. Configurar variables de entorno
5. Redeploy
6. Verificar URLs

---

## 📖 DOCUMENTACIÓN COMPLETA

Ver `DEPLOY_VERCEL.md` para instrucciones detalladas paso a paso.

---

**¡TODO ESTÁ LISTO! EMPIEZA CON LA PRIMERA APP AHORA MISMO** 🚀


