# 🔧 Solución: Error "Forbidden" en Cloud Functions

## ❌ Problema

Error al acceder a la URL:
```
Error: Forbidden
Your client does not have permission to get URL / from this server.
```

## ✅ Solución Aplicada

### Cambios en `functions/index.js`

1. **Agregado `invoker: 'public'` en `setGlobalOptions`:**
   ```javascript
   setGlobalOptions({
     maxInstances: 10,
     memory: '1GiB',
     timeoutSeconds: 540,
     invoker: 'public', // ← NUEVO: Permite invocación pública
   });
   ```

2. **Agregado `invoker: 'public'` en `onRequest`:**
   ```javascript
   exports.nextjsServer = onRequest({
     invoker: 'public', // ← NUEVO: Permite invocación desde Hosting
   }, async (req, res) => {
     await nextApp.prepare();
     return handle(req, res);
   });
   ```

3. **Corregida ruta al proyecto Next.js:**
   ```javascript
   const nextAppPath = path.resolve(__dirname, '..', 'apps', 'public-web');
   ```

## 🚀 Pasos para Aplicar

### 1. Redeploy de Functions

```bash
firebase deploy --only functions
```

### 2. Esperar Actualización (1-2 minutos)

Los permisos IAM pueden tardar en actualizarse después del deploy.

### 3. Verificar

Abre en el navegador:
```
https://autodealers-7f62e.web.app
```

---

## 🔍 Verificar Logs

Si el error persiste, revisa los logs:

```bash
firebase functions:log --only nextjsServer --limit 10
```

---

## ⚠️ Notas

- **`invoker: 'public'`** permite que Firebase Hosting invoque la función sin autenticación
- **`invoker: 'private'`** (por defecto) requiere autenticación IAM
- Para producción, considera restringir acceso usando Cloud IAM directamente en lugar de `public`

---

## 🎯 Verificación de Permisos IAM

Si el error persiste después del deploy:

1. Ve a [Firebase Console](https://console.firebase.google.com/project/autodealers-7f62e/functions)
2. Click en "nextjsServer"
3. Verifica que el **"Invoker"** sea **"All users"** o **"Public"**
4. Si no, cambia a "Public" manualmente

---

## ✅ Resultado Esperado

Después del redeploy y actualización de permisos:

✅ La función es accesible desde Firebase Hosting
✅ No más errores "Forbidden"
✅ La URL https://autodealers-7f62e.web.app funciona correctamente



