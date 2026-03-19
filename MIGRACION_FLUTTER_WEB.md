# MIGRACIÓN A FLUTTER WEB

## ✅ LO QUE SE MANTIENE (Backend)

- ✅ **Node.js + Next.js API Routes** - Sin cambios
- ✅ **Firebase Firestore** - Sin cambios
- ✅ **Firebase Auth** - Sin cambios
- ✅ **Firebase Storage** - Sin cambios
- ✅ **Todas las APIs existentes** - Sin cambios

## 🔄 LO QUE CAMBIA (Solo Frontend)

- ❌ **Next.js Frontend** → ✅ **Flutter Web**
- ❌ **TypeScript** → ✅ **Dart**
- ❌ **React** → ✅ **Flutter Widgets**

---

## 📁 ESTRUCTURA NUEVA

```
apps/
├── admin-web/          # Flutter Web - Admin Panel (NUEVO)
├── public-web-flutter/ # Flutter Web - Public Web (NUEVO)
├── admin/              # Next.js (MANTENER temporalmente para APIs)
├── public-web/         # Next.js (MANTENER temporalmente para APIs)
└── mobile/             # Flutter Mobile (YA EXISTE)
```

---

## 🚀 PLAN DE MIGRACIÓN

### Fase 1: Admin Web (AHORA)
1. ✅ Crear `apps/admin-web` con Flutter Web
2. ✅ Configurar Firebase para Flutter Web
3. ✅ Crear servicio API para consumir Next.js APIs
4. ✅ Migrar pantalla de login
5. ✅ Migrar dashboard principal

### Fase 2: Public Web (Después)
1. Crear `apps/public-web-flutter`
2. Migrar páginas públicas
3. Migrar catálogo de vehículos

### Fase 3: Mobile (Más adelante)
1. Completar `apps/mobile` existente
2. Compartir código con Flutter Web

---

## 🔧 CONFIGURACIÓN

### 1. Variables de Entorno

Crear `apps/admin-web/.env`:
```
API_URL=http://localhost:3001/api
FIREBASE_API_KEY=tu_api_key
FIREBASE_PROJECT_ID=tu_project_id
```

### 2. Firebase para Flutter Web

Flutter Web usa la misma configuración de Firebase que ya tienes.

### 3. APIs

Flutter Web consume las mismas APIs REST que ya existen:
- `/api/admin/*` - APIs de admin
- `/api/leads` - Gestión de leads
- `/api/vehicles` - Inventario
- etc.

---

## 📝 PRÓXIMOS PASOS

1. Configurar Firebase en Flutter Web
2. Migrar más pantallas del admin
3. Configurar deployment de Flutter Web
4. Migrar public-web a Flutter

---

## ✅ VENTAJAS

- ✅ **Sin TypeScript** - Solo Dart
- ✅ **Un solo código** para web y móvil (después)
- ✅ **Backend sin cambios** - Todo sigue igual
- ✅ **Firebase igual** - Misma configuración
- ✅ **APIs iguales** - Consume las existentes


