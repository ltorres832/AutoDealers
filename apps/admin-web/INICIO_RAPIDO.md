# 🚀 Inicio Rápido - Admin Web Flutter

## ✅ Configuración Completada

Firebase ya está configurado con los valores del proyecto.

## 🏃 Ejecutar en Desarrollo

### Paso 1: Iniciar Backend Next.js (Terminal 1)

```bash
cd apps/admin
npm run dev
```

Esto iniciará el servidor en `http://localhost:3001`

### Paso 2: Iniciar Flutter Web (Terminal 2)

```bash
cd apps/admin-web
flutter run -d chrome
```

O usar el script del root:
```bash
npm run dev:admin-web
```

## 🔧 Configuración de API

La URL de la API está configurada en `lib/core/config/api_config.dart`:

```dart
static String get baseUrl {
  return 'http://localhost:3001/api';  // Desarrollo
  // return 'https://tu-dominio.com/api';  // Producción
}
```

## 📱 Probar la App

1. Abre `http://localhost:3001` en el navegador (Flutter Web)
2. Inicia sesión con tus credenciales de admin
3. Verás el dashboard con estadísticas

## 🐛 Solución de Problemas

### Error: "API connection failed"
- Verifica que el servidor Next.js esté corriendo en el puerto 3001
- Verifica la URL en `api_config.dart`

### Error: "Firebase not initialized"
- Verifica que `FirebaseConfig.initialize()` se llame en `main()`

### Error: "CORS"
- Las APIs de Next.js deben permitir requests desde Flutter Web
- Si es necesario, agrega headers CORS en las APIs

## 📦 Build para Producción

```bash
flutter build web --release
```

Los archivos se generan en `build/web/` y se pueden deployar a cualquier servidor estático.


