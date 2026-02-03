# Arquitectura del Sistema

## Visión General

Sistema multi-tenant SaaS con arquitectura modular y escalable, diseñado para activación por fases sin reescritura.

## Stack Tecnológico

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Next.js 14+ (API Routes)
- **Base de Datos:** Firebase Firestore
- **Autenticación:** Firebase Auth
- **Storage:** Firebase Storage (imágenes, documentos)

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **UI:** React 18+
- **Styling:** Tailwind CSS
- **Estado:** Zustand / React Query

### Integraciones
- **Pagos:** Stripe
- **Mensajería:** WhatsApp Business API, Meta Graph API
- **Redes Sociales:** Meta Graph API (Facebook, Instagram)
- **IA:** OpenAI API / Anthropic Claude
- **Email:** SendGrid / Resend
- **SMS:** Twilio

## Arquitectura Multi-Tenant

### Estrategia de Aislamiento

Cada tenant (dealer/vendedor) está aislado lógicamente mediante:
- **Tenant ID** en todas las colecciones de Firestore
- **Row Level Security (RLS)** en Firestore Rules
- **Middleware de autenticación** en todas las rutas API

### Estructura de Datos

```
/tenants/{tenantId}/
  /users/
  /inventory/
  /crm/
    /leads/
    /messages/
    /appointments/
    /sales/
  /settings/
  /integrations/
```

## Módulos del Sistema

### 1. Core (`packages/core`)
- Autenticación y autorización
- Gestión de usuarios y roles
- Multi-tenancy
- Configuración base

### 2. CRM (`packages/crm`)
- Gestión de leads
- Historial de interacciones
- Estados y pipelines
- Reportes básicos

### 3. Messaging (`packages/messaging`)
- WhatsApp Business API
- Facebook Messenger
- Instagram DM
- Email
- SMS
- Unificación de canales

### 4. Inventory (`packages/inventory`)
- Gestión de vehículos
- Fotos y documentos
- Estados (disponible/vendido)
- Sincronización con web pública

### 5. AI (`packages/ai`)
- Respuestas automáticas
- Clasificación de leads
- Generación de contenido
- Análisis y sugerencias

### 6. Billing (`packages/billing`)
- Integración con Stripe
- Gestión de membresías
- Facturación automática
- Webhooks

### 7. Shared (`packages/shared`)
- Utilidades comunes
- Tipos TypeScript
- Constantes
- Helpers

## Aplicaciones

### Admin (`apps/admin`)
Panel administrativo supremo con control total del sistema.

### Dealer (`apps/dealer`)
Dashboard para dealers con gestión de inventario y vendedores.

### Seller (`apps/seller`)
Dashboard para vendedores individuales.

### Public Web (`apps/public-web`)
Aplicación Next.js dinámica que genera webs públicas por subdominio.

## Flujo de Datos

```
Cliente → API Route → Módulo Core → Módulo Específico → Firestore
                                              ↓
                                         Integraciones Externas
```

## Seguridad

### Autenticación
- Firebase Auth con JWT
- Refresh tokens
- Sesiones seguras

### Autorización
- Roles: Admin, Dealer, Seller
- Permisos granulares por módulo
- Validación en cada endpoint

### Auditoría
- Logs de todas las acciones críticas
- Historial de cambios
- Trazabilidad completa

## Escalabilidad

### Horizontal
- Stateless API routes
- Firestore escalable automáticamente
- CDN para assets estáticos

### Vertical
- Caché en Redis (futuro)
- Optimización de queries
- Paginación en todas las listas

## Monitoreo

- Logs centralizados
- Métricas de rendimiento
- Alertas de errores
- Dashboard de salud del sistema





