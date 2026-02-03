# 🚀 Instrucciones para Ejecutar el Panel Admin

## Requisitos Previos

1. **Node.js** versión 18 o superior
2. **npm**, **yarn** o **pnpm**
3. **Firebase** configurado con credenciales

## Pasos para Ejecutar

### 1. Instalar Dependencias

Desde la raíz del proyecto:

```bash
npm install
```

O si prefieres instalar solo las del admin:

```bash
cd apps/admin
npm install
```

### 2. Configurar Variables de Entorno

Crea el archivo `.env.local` en `apps/admin/`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_dominio_aqui
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id_aqui
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket_aqui
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id_aqui
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id_aqui
```

### 3. Ejecutar el Servidor de Desarrollo

```bash
cd apps/admin
npm run dev
```

O desde la raíz:

```bash
npm run dev
```

### 4. Acceder al Panel

Abre tu navegador en:
**http://localhost:3001**

## 🔐 Autenticación

Para acceder al panel admin, necesitas:

1. Un usuario con rol `admin` en Firebase Auth
2. Credenciales válidas en Firestore

### Crear Usuario Admin (si no existe)

Ejecuta el script de inicialización:

```bash
node scripts/init-admin.js
```

O crea manualmente un usuario en Firebase Console con:
- Email: admin@autodealers.com
- Password: (el que configures)
- Custom Claims: `{ role: "admin" }`

## 🐛 Solución de Problemas

### Error: "npm no se reconoce"
- Asegúrate de tener Node.js instalado
- Verifica que npm esté en tu PATH
- En Windows, reinicia la terminal después de instalar Node.js

### Error: "Cannot find module"
- Ejecuta `npm install` desde la raíz del proyecto
- Verifica que todas las dependencias estén instaladas

### Error: "Firebase not initialized"
- Verifica las variables de entorno
- Asegúrate de tener las credenciales de Firebase Admin configuradas

### Puerto 3001 ocupado
- Cambia el puerto en `package.json`: `"dev": "next dev -p 3002"`
- O mata el proceso que está usando el puerto

## 📝 Notas

- El panel se recarga automáticamente al hacer cambios (hot reload)
- Los logs aparecen en la consola del terminal
- Para producción, ejecuta `npm run build` y luego `npm start`

## 🎨 Personalización

Una vez que el panel esté corriendo:

1. Ve a `/admin/settings/branding`
2. Sube tu logo y favicon personalizados
3. Los cambios se aplicarán inmediatamente





