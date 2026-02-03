# Guía de Deployment Multi-Site - Firebase Hosting

## 🎯 Arquitectura Implementada

### Sites Configurados:
1. **public-site** → `autodealers.com` y subdominios dinámicos (`*.autodealers.com`)
2. **admin-panel** → `admin.autodealers.com`
3. **dealer-dashboard** → `dealers.autodealers.com`
4. **seller-dashboard** → `sellers.autodealers.com`
5. **advertiser-dashboard** → `ads.autodealers.com`

---

## 📋 Pasos para Deploy

### 1. Build de todas las apps

```bash
# Build todas las apps
npm run build:firebase

# O build individual:
npm run build:public    # apps/public-web
npm run build:admin     # apps/admin
npm run build:dealer    # apps/dealer
npm run build:seller    # apps/seller
npm run build:advertiser # apps/advertiser
```

### 2. Deploy a Firebase Hosting

```bash
# Deploy todas las apps
firebase deploy --only hosting

# O deploy individual:
npm run deploy:public    # Solo public-site
npm run deploy:admin     # Solo admin-panel
npm run deploy:dealer    # Solo dealer-dashboard
npm run deploy:seller    # Solo seller-dashboard
npm run deploy:advertiser # Solo advertiser-dashboard
```

---

## 🌐 Configuración de Dominios

### En Firebase Console:

1. Ve a **Firebase Console** → **Hosting**
2. Para cada site, configura el dominio:

**public-site:**
- Dominio principal: `autodealers.com`
- Dominios adicionales: `www.autodealers.com`

**admin-panel:**
- Dominio: `admin.autodealers.com`

**dealer-dashboard:**
- Dominio: `dealers.autodealers.com`

**seller-dashboard:**
- Dominio: `sellers.autodealers.com`

**advertiser-dashboard:**
- Dominio: `ads.autodealers.com`

### Configuración DNS:

Configura los siguientes registros DNS en tu proveedor:

```
A Record o CNAME:
- autodealers.com → (IP de Firebase Hosting)
- www.autodealers.com → autodealers.com
- admin.autodealers.com → autodealers.com
- dealers.autodealers.com → autodealers.com
- sellers.autodealers.com → autodealers.com
- ads.autodealers.com → autodealers.com

Para subdominios dinámicos:
- *.autodealers.com → autodealers.com (wildcard CNAME)
```

**Nota:** Firebase te dará las IPs y valores exactos después del primer deploy.

---

## 🔄 Subdominios Dinámicos

### Funcionamiento:

Los subdominios dinámicos (ej: `vendedor1.autodealers.com`) funcionan así:

1. **DNS:** Wildcard `*.autodealers.com` apunta a `autodealers.com`
2. **Firebase Hosting:** Todas las requests a `*.autodealers.com` van a `public-site`
3. **React App:** El middleware detecta el subdominio desde `window.location.hostname`
4. **Firestore:** La app consulta `getTenantBySubdomain(subdomain)` para cargar datos

### Ejemplo:
```
Usuario accede a: vendedor1.autodealers.com
  ↓
Firebase Hosting sirve: apps/public-web/out/index.html
  ↓
React detecta: subdomain = "vendedor1"
  ↓
Carga datos desde Firestore: tenants.where('subdomain', '==', 'vendedor1')
  ↓
Renderiza perfil dinámico del vendedor
```

---

## ✅ Verificación Post-Deploy

### 1. Verificar Sites en Firebase Console:
```
Firebase Console → Hosting → Verificar que los 5 sites aparezcan
```

### 2. Verificar Dominios:
```
Cada site debe tener su dominio configurado
```

### 3. Probar Accesos:
```
✅ autodealers.com → public-site
✅ admin.autodealers.com → admin-panel
✅ dealers.autodealers.com → dealer-dashboard
✅ sellers.autodealers.com → seller-dashboard
✅ ads.autodealers.com → advertiser-dashboard
✅ vendedor1.autodealers.com → public-site (perfil dinámico)
```

---

## 🚀 Comandos Rápidos

### Build y Deploy Todo:
```bash
npm run build:firebase
firebase deploy --only hosting
```

### Build y Deploy Individual:
```bash
npm run deploy:public
npm run deploy:admin
npm run deploy:dealer
npm run deploy:seller
npm run deploy:advertiser
```

### Solo Build (sin deploy):
```bash
npm run build:all
```

---

## 📝 Notas Importantes

1. **Public-Web sin `output: 'export'`**: 
   - Eliminado para permitir routing dinámico client-side
   - Los subdominios dinámicos funcionan como SPA

2. **Otras Apps con `output: 'export'`**:
   - Admin, Dealer, Seller, Advertiser usan export estático
   - No necesitan routing dinámico

3. **API Routes**:
   - Las API routes están en `../../api-routes-backup`
   - Si las necesitas, debes moverlas a Cloud Functions

4. **Build Time**:
   - Cada app genera su carpeta `out/`
   - Firebase Hosting sirve desde esas carpetas

---

## 🔍 Troubleshooting

### Error: "Target not found"
```bash
# Verificar targets configurados
firebase target:apply hosting public-site autodealers-7f62e
firebase target:apply hosting admin-panel autodealers-7f62e
firebase target:apply hosting dealer-dashboard autodealers-7f62e
firebase target:apply hosting seller-dashboard autodealers-7f62e
firebase target:apply hosting advertiser-dashboard autodealers-7f62e
```

### Error: "Directory 'out' does not exist"
```bash
# Asegúrate de hacer build primero
cd apps/[app-name]
npm run build
# Debe generar carpeta 'out'
```

### Subdominios dinámicos no funcionan
- Verificar DNS wildcard: `*.autodealers.com`
- Verificar que `public-site` esté configurado como default
- Verificar middleware en `apps/public-web/src/middleware.ts`



