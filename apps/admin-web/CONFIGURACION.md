# Configuración de Flutter Web Admin

## 🔧 Paso 1: Configurar Firebase

### Opción A: Usar flutterfire CLI (Recomendado)

```bash
cd apps/admin-web
flutterfire configure
```

Esto generará `lib/firebase_options.dart` automáticamente.

### Opción B: Configuración Manual

1. Obtén los valores de Firebase de `apps/admin/src/lib/firebase-client.ts` o de tu proyecto Firebase Console
2. Edita `lib/core/config/firebase_config.dart` y reemplaza los valores:
   - `YOUR_API_KEY` → Tu Firebase API Key
   - `YOUR_APP_ID` → Tu Firebase App ID
   - `YOUR_PROJECT_ID` → Tu Firebase Project ID
   - etc.

## 🔧 Paso 2: Configurar URL de API

Edita `lib/core/config/api_config.dart`:

```dart
static String get baseUrl {
  // Desarrollo
  return 'http://localhost:3001/api';
  
  // Producción (cuando despliegues)
  // return 'https://tu-dominio.com/api';
}
```

## 🚀 Paso 3: Ejecutar en Desarrollo

```bash
# Asegúrate de que el servidor Next.js esté corriendo
cd apps/admin
npm run dev  # Puerto 3001

# En otra terminal, ejecuta Flutter Web
cd apps/admin-web
flutter run -d chrome
```

## 📦 Paso 4: Build para Producción

```bash
flutter build web --release
```

Los archivos se generan en `build/web/` y se pueden deployar a:
- Firebase Hosting
- Vercel
- Netlify
- Cualquier servidor estático

## 🔗 Conexión con Backend

Flutter Web consume las APIs REST de Next.js que ya existen:
- `/api/admin/*` - Todas las rutas de admin
- `/api/leads` - Gestión de leads
- `/api/vehicles` - Inventario
- etc.

**IMPORTANTE**: El backend Next.js debe estar corriendo y accesible para que Flutter Web funcione.


