# Admin Web - Flutter Web

Panel administrativo migrado a Flutter Web.

## 🚀 Desarrollo

```bash
# Instalar dependencias
flutter pub get

# Ejecutar en desarrollo
flutter run -d chrome

# O usar el script del root
npm run dev:admin-web
```

## 🏗️ Build

```bash
# Build para producción
flutter build web --release

# O usar el script del root
npm run build:admin-web
```

## 📁 Estructura

```
lib/
├── core/
│   ├── config/          # Configuración (Firebase, API)
│   ├── routing/         # GoRouter
│   └── services/        # Servicios (API, Firestore)
├── features/
│   ├── auth/           # Autenticación
│   ├── dashboard/      # Dashboard
│   ├── leads/          # Gestión de leads
│   └── users/          # Gestión de usuarios
```

## 🔌 APIs

Consume las APIs existentes de Next.js:
- Base URL: `http://localhost:3001/api` (desarrollo)
- Todas las rutas `/api/admin/*` están disponibles

## 🔥 Firebase

Usa la misma configuración de Firebase que el resto del proyecto.

## 📦 Deployment

El build genera archivos estáticos en `build/web/` que se pueden deployar a:
- Firebase Hosting
- Vercel
- Netlify
- Cualquier servidor estático


