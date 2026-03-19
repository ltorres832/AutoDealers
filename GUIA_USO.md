# 🚀 GUÍA DE USO - AutoDealers Flutter

## 📱 INICIO RÁPIDO

### 1. Configuración Inicial

```bash
# Navegar al proyecto
cd autodealers_flutter

# Instalar dependencias
flutter pub get

# Verificar configuración
flutter doctor
```

### 2. Ejecutar en Desarrollo

```bash
# Ejecutar en dispositivo/emulador
flutter run

# Ejecutar en Chrome (Web)
flutter run -d chrome

# Ejecutar en Android
flutter run -d android

# Ejecutar en iOS
flutter run -d ios
```

### 3. Build para Producción

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release

# Web
flutter build web --release
```

## 🔥 FIREBASE

### Configuración

Firebase ya está configurado con los valores del proyecto AutoDealers. Los valores están en:
- `lib/core/config/firebase_config.dart`

### Cloud Functions

```bash
# Navegar a functions
cd functions

# Instalar dependencias
npm install

# Deploy funciones
firebase deploy --only functions

# Deploy función específica
firebase deploy --only functions:getLeads
```

## 📁 ESTRUCTURA DEL PROYECTO

```
autodealers_flutter/
├── lib/
│   ├── core/                    # Código base compartido
│   │   ├── config/             # Configuración (Firebase)
│   │   ├── domain/models/      # Modelos de datos
│   │   ├── data/               # Capa de datos
│   │   │   ├── repositories/  # Repositorios
│   │   │   └── services/      # Servicios
│   │   └── presentation/       # Capa de presentación
│   │       ├── pages/          # Páginas base
│   │       ├── providers/      # State management
│   │       └── routing/        # Navegación
│   └── features/               # Módulos de funcionalidades
│       ├── crm/               # CRM (Leads)
│       ├── inventory/         # Inventario (Vehículos)
│       └── messaging/         # Mensajería
├── web/                        # Archivos web
├── android/                    # Configuración Android
├── ios/                        # Configuración iOS
└── pubspec.yaml               # Dependencias
```

## 🎯 FUNCIONALIDADES

### CRM (Leads)
- ✅ Listar leads
- ✅ Ver detalle de lead
- ✅ Crear lead
- ✅ Filtrar por estado, fuente, asignado
- ✅ Ver interacciones
- ✅ Agregar interacciones

### Inventory (Vehículos)
- ✅ Listar vehículos
- ✅ Ver detalle de vehículo
- ✅ Filtrar por estado, condición, marca, modelo
- ✅ Marcar como vendido
- ✅ Publicar/ocultar en página pública
- ✅ Ver galería de fotos

### Messaging (Mensajes)
- ✅ Listar mensajes
- ✅ Enviar mensajes
- ✅ Filtrar por lead, canal
- ✅ Chat en tiempo real
- ✅ Múltiples canales (WhatsApp, Email, SMS, etc.)

## 🔄 FLUJO DE NAVEGACIÓN

```
Login → Dashboard
  ├── Leads
  │   ├── Lista
  │   ├── Detalle
  │   └── Crear
  ├── Vehicles
  │   ├── Lista
  │   └── Detalle
  └── Messages
      └── Chat
```

## 🛠️ DESARROLLO

### Agregar Nueva Pantalla

1. Crear página en `lib/features/[modulo]/pages/`
2. Agregar ruta en `lib/core/presentation/routing/app_router.dart`
3. Agregar navegación desde donde corresponda

### Agregar Nuevo Repositorio

1. Crear repositorio en `lib/core/data/repositories/`
2. Implementar métodos CRUD
3. Usar `FirestoreService` para operaciones comunes

### Agregar Nuevo Provider

1. Crear provider en `lib/core/presentation/providers/`
2. Usar repositorio correspondiente
3. Agregar al `MultiProvider` en `main.dart`

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Firebase not initialized"
- Verificar que `FirebaseConfig.initialize()` se llame en `main()`

### Error: "Tenant ID requerido"
- Verificar que el usuario tenga `tenantId` asignado
- Verificar autenticación

### Error: "Cannot find module"
- Ejecutar `flutter pub get`
- Verificar imports

### Error: "Build failed"
- Limpiar build: `flutter clean`
- Reinstalar dependencias: `flutter pub get`
- Rebuild: `flutter build`

## 📚 RECURSOS

- [Flutter Docs](https://docs.flutter.dev/)
- [Firebase Flutter](https://firebase.flutter.dev/)
- [GoRouter](https://pub.dev/packages/go_router)
- [Provider](https://pub.dev/packages/provider)

## ✅ CHECKLIST DE DEPLOYMENT

- [ ] Configurar Firebase Hosting para Web
- [ ] Configurar build para Android/iOS
- [ ] Probar todas las funcionalidades
- [ ] Verificar Cloud Functions deployadas
- [ ] Configurar variables de entorno
- [ ] Probar en dispositivos reales
- [ ] Optimizar imágenes y assets
- [ ] Configurar CI/CD

---

**Última actualización:** Guía completa de uso creada


