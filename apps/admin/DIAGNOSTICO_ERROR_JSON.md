# 🔍 DIAGNÓSTICO: Error JSON en Communication Templates

## Problema Reportado
"Error: La respuesta del servidor no es válida JSON"

## Endpoint de Prueba Creado

**URL:** `GET /api/admin/communication-templates/test`

Este endpoint verifica:
1. ✅ Autenticación funciona
2. ✅ Firebase está inicializado
3. ✅ Funciones se importan correctamente
4. ✅ Acceso a Firestore funciona

## Cómo Diagnosticar

### Paso 1: Abrir Admin Dashboard
```
http://localhost:3001/admin/communication-templates
```

### Paso 2: Abrir Consola del Navegador
Presiona `F12` para abrir DevTools

### Paso 3: Ejecutar Test
Copia y pega en la consola:

```javascript
fetch('/api/admin/communication-templates/test')
  .then(r => r.json())
  .then(d => console.log('✅ RESULTADO:', d))
  .catch(e => console.error('❌ ERROR:', e))
```

### Paso 4: Verificar Resultado

#### ✅ Si funciona, verás:
```json
{
  "success": true,
  "message": "Test completado",
  "tests": {
    "firebase": "initialized - X templates found",
    "functions": "functions work - X templates found",
    "auth": {
      "userId": "...",
      "role": "admin"
    }
  }
}
```

#### ❌ Si falla, verás:
```json
{
  "error": "Mensaje de error específico",
  "details": "Detalles del error",
  "stack": "..."
}
```

## Causas Posibles del Error

### 1. Firebase No Inicializado
**Síntoma:** `firebase: "error: Firebase not initialized"`

**Solución:**
- Verificar que `apps/admin/.env.local` existe
- Verificar que tiene las variables:
  ```
  FIREBASE_PROJECT_ID=autodealers-7f62e
  FIREBASE_CLIENT_EMAIL=...
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  ```

### 2. Credenciales Incorrectas
**Síntoma:** `firebase: "error: Permission denied"`

**Solución:**
- Verificar que las credenciales de Firebase Admin son correctas
- Descargar nuevas credenciales desde Firebase Console

### 3. Colección No Existe
**Síntoma:** `firebase: "initialized - 0 templates found"`

**Solución:**
- Ejecutar el botón "Inicializar Templates" primero
- Esto creará la colección `communication_templates`

### 4. Funciones No Se Importan
**Síntoma:** `functions: "error: Cannot find module..."`

**Solución:**
- Ejecutar `npm install` en el root del proyecto
- Ejecutar `npm run build` en `packages/core`

## Test Manual del Endpoint Force-Init

En la consola del navegador:

```javascript
fetch('/api/admin/communication-templates/force-init', {
  method: 'POST'
})
.then(async (response) => {
  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log('Body (raw):', text);
  
  try {
    const json = JSON.parse(text);
    console.log('✅ JSON válido:', json);
  } catch (e) {
    console.error('❌ JSON inválido:', e);
    console.error('Primeros 500 chars:', text.substring(0, 500));
  }
})
```

## Verificar Logs del Servidor

Busca en la terminal donde corre `npm run dev`:

```
=== RESPUESTA DEL SERVIDOR ===
Status: 200
Content-Type: application/json
...
```

Si ves HTML en lugar de JSON, el problema está en el servidor.

## Solución Temporal

Si el error persiste, usa el endpoint `initialize` en lugar de `force-init`:

```javascript
fetch('/api/admin/communication-templates/initialize', {
  method: 'POST'
})
.then(r => r.json())
.then(d => console.log(d))
```

## Reporte de Error

Si el problema continúa, proporciona:

1. **Resultado del test:** `/api/admin/communication-templates/test`
2. **Logs de la consola del navegador**
3. **Logs de la terminal del servidor**
4. **Variables de entorno** (sin mostrar keys privadas):
   - ¿Existe `.env.local`?
   - ¿Tiene FIREBASE_PROJECT_ID?
   - ¿Tiene FIREBASE_CLIENT_EMAIL?
   - ¿Tiene FIREBASE_PRIVATE_KEY?

---

## Acciones Inmediatas

1. ✅ Limpiar cache: `.next` eliminado
2. ✅ Error handler robusto implementado
3. ✅ Endpoint de test creado
4. ⏳ Ejecutar test y reportar resultado


