# 🔄 Rebuild y Redeploy Manual

## 📋 Pasos para Aplicar Cambios

### 1. Build de Next.js

```bash
cd apps/public-web
npm run build
```

**Resultado esperado:**
```
✓ Compiled successfully
✓ Generating static pages
✓ Finalizing page optimization
```

---

### 2. Regresar a la Raíz

```bash
cd ../..
```

---

### 3. Deploy de Functions

```bash
firebase deploy --only functions
```

**Nota:** El `predeploy` script ejecutará automáticamente:
- ✅ Build de Next.js (si no lo hiciste en paso 1)
- ✅ Copia de `.next` a `functions/`

---

## ⏱️ Tiempo Estimado

- **Build:** 1-2 minutos
- **Deploy:** 2-3 minutos
- **Total:** 3-5 minutos

---

## ✅ Verificación

Después del deploy:

1. **Espera 1-2 minutos** para que la función esté lista
2. **Prueba la URL:**
   ```
   https://autodealers-7f62e.web.app
   ```

---

## 🔍 Verificar Logs (si hay problemas)

```bash
firebase functions:log
```

---

## 📝 Cambios Aplicados

- ✅ Timeout de 10 segundos en `fetchTenantData()`
- ✅ Mejor manejo de errores para timeouts
- ✅ Mensaje de error claro si la solicitud tarda demasiado

---

## 🎯 Resultado Esperado

Después del deploy:
- ✅ No más "Cargando datos del concesionario..." infinito
- ✅ Timeout después de 10 segundos con mensaje de error
- ✅ Mejor experiencia de usuario



