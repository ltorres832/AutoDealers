# Vercel — Pasos exactos (último intento)

## Primera app (public-web)

### 1. En la terminal (desde la carpeta del proyecto)

Abre PowerShell o CMD y ejecuta:

```powershell
cd c:\Users\ltorr\AutoDealers
vercel
```

### 2. Lo que te preguntará Vercel

- **Set up and deploy?** → **Y** (Yes)
- **Which scope?** → Tu cuenta (Enter)
- **Link to existing project?** → **N** (No)
- **What’s your project’s name?** → **autodealers-public-web** (o el nombre que quieras)
- **In which directory is your code located?** → **./** (punto barra, Enter)

Espera a que suba y haga el primer deploy. Puede fallar el build la primera vez (porque aún no hemos dicho que la app está en `apps/public-web`).

### 3. En el navegador (Vercel)

1. Entra en **https://vercel.com/dashboard**
2. Abre el proyecto **autodealers-public-web**
3. Arriba: **Settings** → **General**
4. Busca **Root Directory** → **Edit**
5. Marca **Include source files outside of the Root Directory in the Build Step** (que esté activado)
6. En **Root Directory** escribe: **apps/public-web**
7. **Save**

### 4. Build desde la raíz del repo (monorepo)

En la misma página de **Settings** → **General**:

- **Build Command** → **Edit** → pon: **cd ../.. && npm run build:public**  
  (así instala y construye desde la raíz del monorepo.)
- **Install Command** → **Edit** → pon: **npm install**  
  (y asegúrate de que no tenga un `cd` que lo limite a una subcarpeta; si está vacío, Vercel usa el de la raíz.)
- **Save**

Si **Build Command** por defecto ya hace el build bien, no hace falta cambiarlo. Si el build falla, usa el de arriba.

### 5. Volver a desplegar

En la terminal:

```powershell
cd c:\Users\ltorr\AutoDealers
vercel --prod
```

O en la web: en el proyecto → **Deployments** → los tres puntos del último deploy → **Redeploy**.

---

## Repetir para las otras 4 apps

Para **admin**, **dealer**, **seller** y **advertiser**:

1. En la terminal: `cd c:\Users\ltorr\AutoDealers` y luego **vercel**
2. Cuando pregunte **Link to existing project?** → **N**
3. Nombre del proyecto: **autodealers-admin** (o dealer, seller, advertiser)
4. En Vercel → Settings → **Root Directory**:  
   - admin → **apps/admin**  
   - dealer → **apps/dealer**  
   - seller → **apps/seller**  
   - advertiser → **apps/advertiser**
5. **Build Command** (si hace falta):  
   - admin: **cd ../.. && npm run build:admin**  
   - dealer: **cd ../.. && npm run build:dealer**  
   - seller: **cd ../.. && npm run build:seller**  
   - advertiser: **cd ../.. && npm run build:advertiser**
6. **Save** y luego **vercel --prod** (o Redeploy desde la web).

---

## Resumen

| App        | Nombre proyecto (ejemplo)   | Root Directory   |
|-----------|----------------------------|------------------|
| Public web| autodealers-public-web     | apps/public-web  |
| Admin     | autodealers-admin          | apps/admin       |
| Dealer    | autodealers-dealer         | apps/dealer      |
| Seller    | autodealers-seller         | apps/seller      |
| Advertiser| autodealers-advertiser     | apps/advertiser  |

Si en el primer deploy el build falla, copia el error de la pestaña **Building** en Vercel y lo vemos.
