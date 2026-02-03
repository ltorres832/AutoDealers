# Arquitectura de Tecnologías

## Resumen de Stack Tecnológico

### Backend (API)
- **Node.js** con **Next.js API Routes**
- **Firebase Admin SDK** para operaciones del servidor
- **Firestore** como base de datos principal
- **Firebase Storage** para archivos e imágenes

### Frontend Web
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS** para estilos
- **Firebase Client SDK** para autenticación y datos

### Frontend Móvil
- **Flutter** (iOS y Android)
- **Firebase Flutter SDK**
- **Arquitectura limpia** con separación de capas

## Estructura Completa

```
AutoDealers/
├── apps/
│   ├── admin/          # Next.js - Panel Admin Web
│   ├── dealer/         # Next.js - Dashboard Dealer Web
│   ├── seller/          # Next.js - Dashboard Seller Web
│   ├── public-web/     # Next.js - Webs Públicas
│   └── mobile/          # Flutter - App Móvil (iOS/Android)
├── packages/
│   ├── core/           # TypeScript - Lógica compartida
│   ├── crm/            # TypeScript - Módulo CRM
│   ├── messaging/      # TypeScript - Mensajería
│   ├── inventory/      # TypeScript - Inventario
│   ├── ai/             # TypeScript - IA
│   ├── billing/        # TypeScript - Facturación
│   └── shared/         # TypeScript - Utilidades
└── api/                # Next.js API Routes (Backend)
```

## Comunicación

### Web → Backend
- Next.js API Routes (mismo proyecto)
- Fetch/Axios para llamadas HTTP
- Firebase Client SDK para datos en tiempo real

### Mobile → Backend
- HTTP REST API (Next.js API Routes)
- Firebase Flutter SDK para datos en tiempo real
- WebSockets para notificaciones push

## APIs Compartidas

Todas las aplicaciones (Web y Mobile) consumen las mismas APIs:

- `/api/leads` - Gestión de leads
- `/api/messages` - Mensajería
- `/api/vehicles` - Inventario
- `/api/appointments` - Citas
- `/api/sales` - Ventas
- `/api/subscriptions` - Suscripciones

## Autenticación

- **Firebase Auth** (compartido entre Web y Mobile)
- JWT tokens
- Mismo sistema de roles y permisos

## Base de Datos

- **Firestore** (compartido)
- Mismas reglas de seguridad
- Mismos modelos de datos

## Ventajas de esta Arquitectura

1. **Backend único** - Una sola API para todos los clientes
2. **Código compartido** - Lógica de negocio en packages TypeScript
3. **Consistencia** - Mismos datos y reglas para todos
4. **Escalabilidad** - Cada plataforma escala independientemente
5. **Mantenimiento** - Cambios en backend benefician a todos





