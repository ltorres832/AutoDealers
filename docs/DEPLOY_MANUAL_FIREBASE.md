# 🚀 Guía Manual de Deploy a Firebase Hosting + Cloud Functions

## ✅ Pre-requisitos Completados

- ✅ Cloud Function configurada (`functions/index.js`)
- ✅ Dependencias instaladas (`functions/package.json`)
- ✅ Build de Next.js exitoso (`apps/public-web/.next/`)
- ✅ Target de hosting configurado (`public-site` -> `autodealers-7f62e`)
- ✅ `firebase.json` configurado con rewrites a Cloud Function

---

## 📋 Pasos para Deploy Manual

### 1. Verificar Build de Next.js

```bash
cd apps/public-web
npm run build
```

**Resultado esperado:** `✓ Compiled successfully`

---

### 2. Verificar Target de Hosting

```bash
cd ../..
firebase target:apply hosting public-site autodealers-7f62e
```

**Resultado esperado:** `Updated: public-site (autodealers-7f62e)`

---

### 3. Ejecutar Deploy

```bash
firebase deploy --only "functions,hosting:public-site"
```

**Nota:** En PowerShell, usa comillas alrededor de la lista:
```powershell
firebase deploy --only "functions,hosting:public-site"
```

---

## ⏱️ Tiempos Estimados

- **Primera vez:** 5-10 minutos
  - Habilitación de APIs de Google Cloud
  - Compilación de Cloud Function
  - Upload de archivos
  
- **Siguientes deploys:** 2-5 minutos
  - Solo cambios incrementales

---

## 📊 Progreso del Deploy

Durante el deploy verás:

1. **Preparación:**
   ```
   i  deploying functions, hosting
   i  functions: preparing codebase default for deployment
   ```

2. **Habilitación de APIs (primera vez):**
   ```
   i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
   +  functions: required API cloudfunctions.googleapis.com is enabled
   ```

3. **Packaging:**
   ```
   i  functions: packaged C:\Users\ltorr\AutoDealers\functions (XX KB) for uploading
   ```

4. **Deploy de Functions:**
   ```
   ✓  functions[nextjsServer]: Successful update operation.
   ```

5. **Deploy de Hosting:**
   ```
   ✓  hosting[public-site]: files uploaded successfully
   ```

6. **URLs del Deploy:**
   ```
   ✓  Deploy complete!

   Console: https://console.firebase.google.com/project/autodealers-7f62e/overview
   Hosting URL: https://autodealers-7f62e.web.app
   Function URL: https://us-central1-autodealers-7f62e.cloudfunctions.net/nextjsServer
   ```

---

## 🔍 Verificar Deploy

### 1. Revisar Hosting

Abre en el navegador:
```
https://autodealers-7f62e.web.app
```

### 2. Ver Logs de Functions

```bash
firebase functions:log --only nextjsServer
```

### 3. Probar Función Directamente

```bash
curl https://us-central1-autodealers-7f62e.cloudfunctions.net/nextjsServer
```

---

## ⚠️ Solución de Problemas

### Error: "Runtime Node.js 18 was decommissioned"

**Solución:** Ya corregido. `functions/package.json` usa Node.js 20.

### Error: "Hosting target public-site is linked to multiple sites"

**Solución:**
```bash
firebase target:clear hosting public-site
firebase target:apply hosting public-site autodealers-7f62e
```

### Error: "functions predeploy error: Command terminated"

**Solución:** Ya corregido. `predeploy` removido de `firebase.json`.

### Error: "missing required API"

**Solución:** Normal la primera vez. Firebase habilita automáticamente las APIs necesarias.

---

## 💰 Costos

**Plan Spark (Gratis):**
- 2 millones de invocaciones/mes
- 400,000 GB-segundos/mes
- 200,000 CPU-segundos/mes
- 10 GB storage

**Para producción pequeña/media es suficiente y GRATIS.**

---

## 🔄 Deploys Subsecuentes

Para actualizar después de cambios:

```bash
# 1. Build de Next.js
cd apps/public-web
npm run build

# 2. Deploy
cd ../..
firebase deploy --only "functions,hosting:public-site"
```

---

## 📝 Archivos Importantes

### `firebase.json`
```json
{
  "hosting": [
    {
      "target": "public-site",
      "public": "apps/public-web/.next/static",
      "rewrites": [
        {
          "source": "/_next/static/**",
          "destination": "/_next/static/**"
        },
        {
          "source": "**",
          "function": "nextjsServer"
        }
      ]
    }
  ],
  "functions": [
    {
      "source": "functions",
      "codebase": "default"
    }
  ]
}
```

### `functions/index.js`
- Cloud Function para Next.js SSR
- Runtime: Node.js 20
- Memoria: 1GB
- Timeout: 540 segundos
- Máximo: 10 instancias

### `functions/package.json`
- `firebase-functions`: ^4.5.0
- `next`: ^14.0.0
- `node`: 20

---

## ✅ Checklist Pre-Deploy

- [ ] Build de Next.js exitoso (`apps/public-web/.next/` existe)
- [ ] Target de hosting configurado correctamente
- [ ] No hay errores en `firebase.json`
- [ ] `functions/node_modules/` instalado
- [ ] Credenciales de Firebase configuradas (`firebase login`)

---

## 🎯 Resultado Final

Una vez completado el deploy:

✅ **Hosting:** https://autodealers-7f62e.web.app
✅ **Function:** https://us-central1-autodealers-7f62e.cloudfunctions.net/nextjsServer
✅ **Todas las rutas dinámicas funcionando**
✅ **SSR completo de Next.js**
✅ **Integración total con Firebase**

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs: `firebase functions:log`
2. Verifica la configuración: `firebase hosting:sites:list`
3. Revisa el estado: Firebase Console → Functions / Hosting



