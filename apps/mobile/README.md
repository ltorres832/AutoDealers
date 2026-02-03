# AutoDealers Mobile App

Aplicación móvil Flutter para dealers y vendedores de autos.

## Características

- ✅ Autenticación con Firebase
- ✅ Dashboard con estadísticas
- ✅ Gestión de Leads (CRM)
- ✅ Inventario de vehículos
- ✅ Mensajería omnicanal
- ✅ Sistema de citas
- ✅ Notificaciones push
- ✅ Sincronización en tiempo real

## Requisitos

- Flutter SDK 3.0+
- Dart 3.0+
- Firebase project configurado
- iOS: Xcode 14+
- Android: Android Studio con SDK 33+

## Configuración

### 1. Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Agregar apps iOS y Android
3. Descargar archivos de configuración:
   - `google-services.json` (Android) → `android/app/`
   - `GoogleService-Info.plist` (iOS) → `ios/Runner/`

### 2. Instalar dependencias

```bash
cd apps/mobile
flutter pub get
```

### 3. Configurar variables

Editar `lib/core/config/firebase_config.dart` con las configuraciones de tu proyecto.

## Ejecutar

### Desarrollo

```bash
# iOS
flutter run -d ios

# Android
flutter run -d android
```

### Build

```bash
# iOS
flutter build ios

# Android
flutter build apk
# o
flutter build appbundle
```

## Estructura

```
lib/
├── core/
│   ├── config/        # Configuración Firebase
│   ├── routing/       # Navegación
│   └── theme/         # Temas
├── features/
│   ├── auth/         # Autenticación
│   ├── dashboard/     # Dashboard
│   ├── crm/          # CRM y Leads
│   ├── inventory/    # Inventario
│   ├── messaging/    # Mensajería
│   ├── appointments/ # Citas
│   └── settings/      # Configuración
└── shared/           # Widgets y utilidades compartidas
```

## APIs

La app consume las mismas APIs que la versión web:

- Base URL: `https://api.autodealers.com` (configurar en producción)
- Autenticación: Firebase Auth
- Datos: Firestore en tiempo real

## Notificaciones

Las notificaciones push se configuran automáticamente al iniciar la app. El token FCM se guarda en Firestore cuando el usuario se autentica.

## Testing

```bash
flutter test
```

## Troubleshooting

### Error de Firebase
- Verificar que los archivos de configuración estén en su lugar
- Verificar que Firebase esté inicializado correctamente

### Error de build iOS
- Ejecutar `pod install` en `ios/`
- Verificar que Xcode esté actualizado

### Error de build Android
- Verificar `minSdkVersion` en `android/app/build.gradle`
- Verificar que las dependencias estén actualizadas





