# 🔨 Build y Deploy de Todos los Sitios

## ⚠️ Problema Actual

Los dashboards (admin, dealer, seller, advertiser) necesitan builds con `output: 'export'` pero están fallando.

## 📋 Pasos para Build y Deploy

### 1. Build de Admin

```bash
cd apps/admin
npm run build
cd ../..
```

### 2. Build de Dealer

```bash
cd apps/dealer
npm run build
cd ../..
```

### 3. Build de Seller

```bash
cd apps/seller
npm run build
cd ../..
```

### 4. Build de Advertiser

```bash
cd apps/advertiser
npm run build
cd ../..
```

### 5. Deploy de Todos los Sitios

```bash
firebase deploy --only hosting
```

## 🔍 Verificar Builds

Después de cada build, verifica que existe el directorio `out/`:

```bash
# Debe existir:
apps/admin/out/
apps/dealer/out/
apps/seller/out/
apps/advertiser/out/
```

## ❌ Posibles Errores con `output: 'export'`

Si los builds fallan, puede ser por:

1. **Rutas dinámicas sin `generateStaticParams()`**
2. **API routes (incompatible con `output: 'export'`)**
3. **Uso de `useSearchParams()` sin Suspense**
4. **Uso de `cookies()` o `headers()` en Server Components**

## 🚀 URLs Esperadas

Después del deploy exitoso:

- ✅ Public Web: `https://autodealers-7f62e.web.app`
- ⚠️ Admin Panel: `https://autodealers-admin.web.app` (requiere build)
- ⚠️ Dealer Dashboard: `https://autodealers-dealer.web.app` (requiere build)
- ⚠️ Seller Dashboard: `https://autodealers-seller.web.app` (requiere build)
- ⚠️ Advertiser Dashboard: `https://autodealers-advertiser.web.app` (requiere build)



