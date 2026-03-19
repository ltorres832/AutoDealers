# AutoDealers Flutter - Plataforma Completa

Aplicación Flutter completa (Mobile + Web) para la plataforma AutoDealers.

## 🏗️ Arquitectura

Arquitectura limpia con separación de capas:

```
lib/
├── core/
│   ├── config/          # Configuración (Firebase, etc.)
│   ├── domain/          # Capa de dominio
│   │   └── models/      # Modelos de datos
│   ├── data/            # Capa de datos
│   │   └── repositories/ # Repositorios
│   └── presentation/    # Capa de presentación
│       ├── pages/       # Páginas/Pantallas
│       ├── providers/   # State Management (Provider)
│       └── routing/     # Navegación (GoRouter)
├── features/            # Módulos de funcionalidades
│   ├── auth/           # Autenticación
│   ├── crm/            # CRM (Leads, Mensajes, Citas)
│   ├── inventory/      # Inventario
│   ├── messaging/      # Mensajería
│   └── ...
└── main.dart
```

## 📦 Módulos

- ✅ **Core**: Configuración base, modelos, repositorios
- ✅ **Auth**: Autenticación completa con Firebase
- 🚧 **CRM**: Gestión de leads, mensajes, citas (en desarrollo)
- 🚧 **Inventory**: Gestión de vehículos (en desarrollo)
- 🚧 **Messaging**: Mensajería omnicanal (en desarrollo)

## 🚀 Desarrollo

```bash
# Instalar dependencias
flutter pub get

# Ejecutar en desarrollo
flutter run

# Build para producción
flutter build apk          # Android
flutter build ios          # iOS
flutter build web          # Web
```

## 🔥 Firebase

Firebase ya está configurado con los valores del proyecto AutoDealers.

## 📱 Plataformas

- ✅ Android
- ✅ iOS
- ✅ Web

## 🔄 Migración de APIs

Las APIs de Next.js se migrarán a Firebase Cloud Functions. Ver `functions/` para las funciones.


