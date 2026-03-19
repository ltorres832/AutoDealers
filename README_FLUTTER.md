# 🚀 AutoDealers Flutter - Plataforma Completa

Aplicación Flutter completa (Mobile + Web) para la plataforma AutoDealers.

## ✨ Características

- ✅ **Multi-plataforma**: Android, iOS y Web
- ✅ **Arquitectura limpia**: Domain, Data, Presentation
- ✅ **Firebase integrado**: Firestore, Auth, Storage, Functions
- ✅ **Módulos completos**: CRM, Inventory, Messaging, Appointments, Sales
- ✅ **State Management**: Provider pattern
- ✅ **Navegación**: GoRouter

## 📁 Estructura

```
autodealers_flutter/
├── lib/
│   ├── core/              # Código base
│   └── features/          # Módulos de funcionalidades
├── web/                    # Archivos web
├── android/                # Configuración Android
├── ios/                    # Configuración iOS
└── pubspec.yaml           # Dependencias
```

## 🚀 Inicio Rápido

### Instalación

```bash
# Clonar repositorio
git clone [repo-url]
cd AutoDealers/autodealers_flutter

# Instalar dependencias
flutter pub get
```

### Desarrollo

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

### Build

```bash
# Android APK
flutter build apk --release

# Android App Bundle (Google Play)
flutter build appbundle --release

# iOS
flutter build ios --release

# Web
flutter build web --release
```

## 📱 Módulos

### CRM
- Gestión de leads
- Seguimiento de interacciones
- Clasificación con IA
- Scoring de leads

### Inventory
- Gestión de vehículos
- Galería de fotos
- Publicación en página pública
- Comisiones configurables

### Messaging
- Mensajería omnicanal
- WhatsApp, Email, SMS
- Chat en tiempo real
- Historial de conversaciones

### Appointments
- Gestión de citas
- Recordatorios automáticos
- Diferentes tipos de citas
- Calendario integrado

### Sales
- Registro de ventas
- Cálculo de comisiones
- Información del comprador
- Documentos asociados

## 🔥 Firebase

### Configuración

Firebase ya está configurado. Los valores están en:
- `lib/core/config/firebase_config.dart`

### Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

## 📚 Documentación

- `GUIA_USO.md` - Guía de uso completa
- `DEPLOYMENT_GUIDE.md` - Guía de deployment
- `MIGRACION_COMPLETA_FINAL.md` - Resumen de migración

## 🛠️ Desarrollo

### Agregar Nueva Pantalla

1. Crear en `lib/features/[modulo]/pages/`
2. Agregar ruta en `lib/core/presentation/routing/app_router.dart`
3. Agregar navegación

### Agregar Nuevo Repositorio

1. Crear en `lib/core/data/repositories/`
2. Implementar métodos CRUD
3. Usar `FirestoreService` para operaciones comunes

### Agregar Nuevo Provider

1. Crear en `lib/core/presentation/providers/`
2. Usar repositorio correspondiente
3. Agregar al `MultiProvider` en `main.dart`

## 🐛 Solución de Problemas

Ver `GUIA_USO.md` para solución de problemas comunes.

## 📄 Licencia

[Tu licencia aquí]

---

**Versión:** 1.0.0
**Última actualización:** Migración completa implementada


