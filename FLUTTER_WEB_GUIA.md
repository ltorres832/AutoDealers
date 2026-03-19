# 🚀 GUÍA COMPLETA: Migración a Flutter Web

## ✅ LO QUE YA ESTÁ LISTO

1. ✅ **Estructura base creada** (`apps/admin-web/`)
2. ✅ **Servicio API** para consumir Next.js APIs
3. ✅ **Autenticación** con Firebase Auth
4. ✅ **Login page** funcional
5. ✅ **Dashboard básico** conectado a APIs

## 📋 PRÓXIMOS PASOS

### 1. Configurar Firebase

```bash
cd apps/admin-web
flutterfire configure
```

O edita manualmente `lib/core/config/firebase_config.dart` con tus valores de Firebase.

### 2. Probar en Desarrollo

```bash
# Terminal 1: Iniciar backend Next.js
cd apps/admin
npm run dev  # Puerto 3001

# Terminal 2: Iniciar Flutter Web
cd apps/admin-web
flutter run -d chrome
```

### 3. Migrar Más Pantallas

Las siguientes pantallas están pendientes de migrar:
- [ ] Gestión de Usuarios (`/admin/users`)
- [ ] Gestión de Leads (`/admin/all-leads`)
- [ ] Gestión de Vehículos
- [ ] Reportes
- [ ] Configuración

### 4. Build y Deploy

```bash
# Build
flutter build web --release

# Los archivos están en build/web/
# Deploy a Firebase Hosting, Vercel, etc.
```

---

## 🔄 ARQUITECTURA

```
┌─────────────────┐
│  Flutter Web    │  ← Frontend (NUEVO)
│  (admin-web)    │
└────────┬────────┘
         │ HTTP REST
         │ (Bearer Token)
         ▼
┌─────────────────┐
│  Next.js APIs   │  ← Backend (SIN CAMBIOS)
│  (apps/admin)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Firebase      │  ← Servicios (SIN CAMBIOS)
│  (Firestore,    │
│   Auth, etc.)   │
└─────────────────┘
```

---

## 📝 ESTRUCTURA DE CÓDIGO

```
apps/admin-web/
├── lib/
│   ├── core/
│   │   ├── config/          # Firebase, API config
│   │   ├── routing/         # GoRouter
│   │   └── services/        # API service, Firestore
│   ├── features/
│   │   ├── auth/           # Login, AuthProvider
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── leads/          # Gestión de leads (PENDIENTE)
│   │   └── users/          # Gestión de usuarios (PENDIENTE)
│   └── main.dart
├── web/                     # HTML, assets
└── pubspec.yaml            # Dependencias
```

---

## 🔌 CONSUMIENDO APIs

Ejemplo de cómo consumir una API:

```dart
import 'package:admin_web/core/services/api_service.dart';

final apiService = ApiService();

// GET
final response = await apiService.get('/admin/users');

// POST
await apiService.post('/admin/users', {
  'email': 'user@example.com',
  'name': 'John Doe',
});
```

---

## ✅ VENTAJAS DE FLUTTER WEB

1. ✅ **Sin TypeScript** - Solo Dart
2. ✅ **Un solo código** para web y móvil (después)
3. ✅ **Backend sin cambios** - Todo sigue igual
4. ✅ **Firebase igual** - Misma configuración
5. ✅ **APIs iguales** - Consume las existentes
6. ✅ **UI moderna** - Material Design 3

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Cannot find module"
- Ejecuta `flutter pub get`

### Error: "Firebase not initialized"
- Verifica que `FirebaseConfig.initialize()` se llame en `main()`

### Error: "API connection failed"
- Verifica que el servidor Next.js esté corriendo
- Verifica la URL en `api_config.dart`

### Error: "CORS"
- Asegúrate de que Next.js permita requests desde Flutter Web
- Agrega headers CORS en las APIs de Next.js si es necesario

---

## 📚 RECURSOS

- [Flutter Web Docs](https://docs.flutter.dev/platform-integration/web)
- [Firebase Flutter](https://firebase.flutter.dev/)
- [GoRouter](https://pub.dev/packages/go_router)


