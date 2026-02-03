# 🔧 Solución: Error "Could not find a production build in the '.next' directory"

## ❌ Problema

Error en los logs de Cloud Functions:
```
Error: Could not find a production build in the '.next' directory. 
Try building your app with 'next build' before starting the production server.
```

## 🔍 Causa

La Cloud Function no tiene acceso al directorio `.next` local porque:
- Cloud Functions solo incluye archivos dentro de `functions/`
- El build de Next.js está en `apps/public-web/.next/`
- El directorio `.next` no se copia automáticamente al deploy

## ✅ Solución Aplicada

### 1. Agregado `predeploy` en `firebase.json`

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR/../apps/public-web\" run build",
        "mkdir -p \"$RESOURCE_DIR/.next\"",
        "cp -r \"$RESOURCE_DIR/../apps/public-web/.next\" \"$RESOURCE_DIR/\""
      ]
    }
  ]
}
```

**Qué hace:**
1. Ejecuta `npm run build` en `apps/public-web`
2. Crea el directorio `.next` en `functions/`
3. Copia todo el contenido de `.next` a `functions/.next`

### 2. Actualizada ruta en `functions/index.js`

**Antes:**
```javascript
const nextAppPath = path.resolve(__dirname, '..', 'apps', 'public-web');
```

**Después:**
```javascript
const nextAppPath = __dirname; // functions/ ahora contiene .next
```

**Razón:**
- `__dirname` apunta a `functions/` en Cloud Functions
- Ahora `.next` está en `functions/.next/`

## 🚀 Pasos para Aplicar

### 1. Redeploy de Functions

```bash
firebase deploy --only functions
```

El `predeploy` se ejecutará automáticamente:
1. ✅ Build de Next.js
2. ✅ Copia `.next` a `functions/`
3. ✅ Deploy de la función

### 2. Verificar

Revisa los logs:
```bash
firebase functions:log
```

No debería aparecer el error "Could not find a production build".

---

## ⚠️ Nota para Windows

El `predeploy` usa comandos Unix (`cp -r`, `mkdir -p`). En Windows, Cloud Functions ejecuta en un entorno Linux, así que funciona correctamente.

Si necesitas probar localmente en Windows, puedes crear un script:

**`functions/predeploy.js`** (Windows-compatible):
```javascript
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const functionsDir = __dirname;
const nextAppDir = path.resolve(functionsDir, '..', 'apps', 'public-web');
const nextBuildDir = path.resolve(nextAppDir, '.next');
const targetDir = path.resolve(functionsDir, '.next');

// Build Next.js
console.log('Building Next.js...');
execSync('npm run build', { cwd: nextAppDir, stdio: 'inherit' });

// Copy .next
console.log('Copying .next to functions/...');
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.cpSync(nextBuildDir, targetDir, { recursive: true });

console.log('✅ Predeploy complete!');
```

Y cambiar `firebase.json`:
```json
"predeploy": ["node functions/predeploy.js"]
```

---

## ✅ Resultado Esperado

Después del redeploy:

✅ Build de Next.js incluido en Cloud Functions
✅ La función encuentra `.next/` correctamente
✅ No más errores "Could not find a production build"
✅ La URL funciona correctamente: `https://autodealers-7f62e.web.app`

---

## 🔄 Deploys Subsecuentes

Cada vez que hagas deploy:

```bash
firebase deploy --only functions
```

El `predeploy` se ejecuta automáticamente:
1. Rebuild de Next.js (si hay cambios)
2. Copia actualizada de `.next`
3. Deploy de la función actualizada



