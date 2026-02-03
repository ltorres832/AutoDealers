# 🔍 Diagnóstico del Servidor

## Problema Identificado

El servidor está escuchando en el puerto 3001 pero no responde a las peticiones HTTP.

## Soluciones a Probar

### 1. Verificar Errores de Compilación

Ejecuta el servidor en modo foreground para ver los errores:

```bash
cd apps/admin
npm run dev
```

### 2. Verificar Variables de Entorno

Crea el archivo `.env.local` en `apps/admin/`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_dominio
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 3. Limpiar y Reinstalar

```bash
cd apps/admin
rm -rf .next node_modules
cd ../..
npm install
cd apps/admin
npm run dev
```

### 4. Verificar Configuración de Firebase

Asegúrate de que `packages/core/src/firebase.ts` tenga la configuración correcta.

### 5. Probar con otro Puerto

Cambia el puerto en `package.json`:

```json
"dev": "next dev -p 3002"
```

## Estado Actual

- ✅ Puerto 3001: Escuchando (PID: 27436)
- ❌ Respuesta HTTP: Timeout
- ⚠️ Posible problema: Errores de compilación o configuración

## Próximos Pasos

1. Ejecuta `npm run dev` en foreground para ver los errores
2. Revisa la consola para mensajes de error
3. Verifica que todas las dependencias estén instaladas
4. Asegúrate de que las variables de entorno estén configuradas





