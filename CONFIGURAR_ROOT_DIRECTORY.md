# 🔧 Configurar Root Directory Automáticamente

## Opción 1: Script Automático (Recomendado)

### Paso 1: Obtener tu Token de Vercel
1. Ve a: https://vercel.com/account/tokens
2. Haz clic en "Create Token"
3. Dale un nombre (ej: "AutoDealers Config")
4. Copia el token generado

### Paso 2: Ejecutar el Script

```powershell
cd c:\Users\ltorr\AutoDealers
.\scripts\update-vercel-root-directory.ps1 -Token "tu-token-aqui"
```

El script configurará automáticamente el Root Directory para todas las apps.

---

## Opción 2: Configuración Manual (Más Rápido)

Abre estos 5 links y configura el Root Directory en cada uno:

### 1. Public Web
**Link:** https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/public-web/settings/general
- Busca "Root Directory"
- Haz clic en "Edit"
- Escribe: `apps/public-web`
- Guarda

### 2. Admin
**Link:** https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/auto-dealers-admin/settings/general
- Root Directory: `apps/admin`

### 3. Dealer
**Link:** https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/dealer/settings/general
- Root Directory: `apps/dealer`

### 4. Seller
**Link:** https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/seller/settings/general
- Root Directory: `apps/seller`

### 5. Advertiser
**Link:** https://vercel.com/team_s4AOfFPHOoBv24BTnbgiZKGV/advertiser/settings/general
- Root Directory: `apps/advertiser`

---

## ✅ Después de Configurar

Una vez configurado el Root Directory, puedes desplegar:

```powershell
# Desplegar todas las apps
npm run deploy:all:vercel

# O individualmente
npm run deploy:public:vercel
npm run deploy:admin:vercel
npm run deploy:dealer:vercel
npm run deploy:seller:vercel
npm run deploy:advertiser:vercel
```
