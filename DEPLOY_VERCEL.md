# 🚀 DESPLIEGUE RÁPIDO EN VERCEL - PASO A PASO

## ⚡ DESPLIEGUE INMEDIATO (5 MINUTOS)

### PREREQUISITOS
1. Tener cuenta en Vercel (gratis): https://vercel.com
2. Tener Vercel CLI instalado: `npm i -g vercel`
3. Estar en la raíz del proyecto: `c:\Users\ltorr\AutoDealers`

---

## 📦 PASO 1: DESPLEGAR PUBLIC-WEB

```powershell
cd apps/public-web
vercel
```

**Cuando pregunte:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-public-web**
- Directory? → **apps/public-web** (o Enter si detecta automático)

**Después del primer deploy:**
1. Ve a https://vercel.com/dashboard
2. Abre el proyecto `autodealers-public-web`
3. Settings → General
4. **Root Directory:** `apps/public-web` ✅
5. **Build Command:** `cd ../.. && npm ci && npm run build:public` ✅
6. **Install Command:** `cd ../.. && npm ci` ✅
7. **Output Directory:** `.next` ✅
8. Save

**Desplegar a producción:**
```powershell
vercel --prod
```

---

## 📦 PASO 2: DESPLEGAR ADMIN

```powershell
cd apps/admin
vercel
```

**Cuando pregunte:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-admin**
- Directory? → **apps/admin**

**En Vercel Dashboard:**
1. Settings → General
2. **Root Directory:** `apps/admin` ✅
3. **Build Command:** `cd ../.. && npm ci && npm run build:admin` ✅
4. **Install Command:** `cd ../.. && npm ci` ✅
5. **Output Directory:** `.next` ✅
6. Save

**Desplegar a producción:**
```powershell
vercel --prod
```

---

## 📦 PASO 3: DESPLEGAR DEALER

```powershell
cd apps/dealer
vercel
```

**Cuando pregunte:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-dealer**
- Directory? → **apps/dealer**

**En Vercel Dashboard:**
1. Settings → General
2. **Root Directory:** `apps/dealer` ✅
3. **Build Command:** `cd ../.. && npm ci && npm run build:dealer` ✅
4. **Install Command:** `cd ../.. && npm ci` ✅
5. **Output Directory:** `.next` ✅
6. Save

**Desplegar a producción:**
```powershell
vercel --prod
```

---

## 📦 PASO 4: DESPLEGAR SELLER

```powershell
cd apps/seller
vercel
```

**Cuando pregunte:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-seller**
- Directory? → **apps/seller**

**En Vercel Dashboard:**
1. Settings → General
2. **Root Directory:** `apps/seller` ✅
3. **Build Command:** `cd ../.. && npm ci && npm run build:seller` ✅
4. **Install Command:** `cd ../.. && npm ci` ✅
5. **Output Directory:** `.next` ✅
6. Save

**Desplegar a producción:**
```powershell
vercel --prod
```

---

## 📦 PASO 5: DESPLEGAR ADVERTISER

```powershell
cd apps/advertiser
vercel
```

**Cuando pregunte:**
- Set up and deploy? → **Y**
- Link to existing project? → **N**
- Project name? → **autodealers-advertiser**
- Directory? → **apps/advertiser**

**En Vercel Dashboard:**
1. Settings → General
2. **Root Directory:** `apps/advertiser` ✅
3. **Build Command:** `cd ../.. && npm ci && cd apps/advertiser && npm run build` ✅
4. **Install Command:** `cd ../.. && npm ci` ✅
5. **Output Directory:** `.next` ✅
6. Save

**Desplegar a producción:**
```powershell
vercel --prod
```

---

## 🔐 PASO 6: CONFIGURAR VARIABLES DE ENTORNO

**Para CADA proyecto en Vercel:**

1. Ve a Settings → Environment Variables
2. Agrega estas variables (MÍNIMAS REQUERIDAS):

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

**Para ADMIN también agrega:**
```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu-private-key\n-----END PRIVATE KEY-----\n"
```

**Si usas Stripe:**
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Selecciona:** Production, Preview, Development ✅
4. **Save**

---

## 🔄 PASO 7: REDEPLOY DESPUÉS DE CONFIGURAR VARIABLES

**Para cada app, después de agregar variables:**

1. Ve a Deployments
2. Click en los 3 puntos del último deploy
3. **Redeploy**
4. Espera a que termine

---

## ✅ VERIFICAR QUE FUNCIONA

Cada app tendrá su URL:
- Public Web: `https://autodealers-public-web.vercel.app`
- Admin: `https://autodealers-admin.vercel.app`
- Dealer: `https://autodealers-dealer.vercel.app`
- Seller: `https://autodealers-seller.vercel.app`
- Advertiser: `https://autodealers-advertiser.vercel.app`

**Abre cada URL y verifica que carga correctamente.**

---

## 🎯 RESUMEN RÁPIDO

```powershell
# 1. Public Web
cd apps/public-web
vercel
# Configurar en dashboard, luego:
vercel --prod

# 2. Admin
cd ../admin
vercel
# Configurar en dashboard, luego:
vercel --prod

# 3. Dealer
cd ../dealer
vercel
# Configurar en dashboard, luego:
vercel --prod

# 4. Seller
cd ../seller
vercel
# Configurar en dashboard, luego:
vercel --prod

# 5. Advertiser
cd ../advertiser
vercel
# Configurar en dashboard, luego:
vercel --prod
```

---

## ⚠️ SI ALGO FALLA

1. **Build falla:**
   - Verifica que el Root Directory esté correcto
   - Verifica que el Build Command sea correcto
   - Revisa los logs en Vercel Dashboard

2. **Error de variables:**
   - Verifica que todas las variables estén en Vercel
   - Verifica que los valores sean correctos
   - Redeploy después de agregar variables

3. **Error de módulos:**
   - Verifica que `npm ci` funcione en la raíz
   - Verifica que todos los packages estén en package.json

---

## 🎉 ¡LISTO!

Una vez completado, todas tus apps estarán en vivo en Vercel con sus propias URLs.

**Tiempo estimado:** 15-20 minutos para las 5 apps.
