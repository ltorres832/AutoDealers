# 🗺️ Rutas Disponibles del Panel Admin

## 📍 Ruta Principal

**http://localhost:3001** → Redirige automáticamente a `/admin/global`

## 🎯 Rutas del Panel Administrativo

Todas las rutas del admin están bajo el prefijo `/admin/`:

### Dashboard y Vista General
- **Vista Global**: http://localhost:3001/admin/global
- **Dashboard** (legacy): http://localhost:3001/dashboard

### Gestión de Usuarios y Tenants
- **Usuarios**: http://localhost:3001/admin/users
- **Tenants**: http://localhost:3001/admin/tenants
- **Membresías**: http://localhost:3001/admin/memberships

### Contenido y Operaciones
- **Todos los Leads**: http://localhost:3001/admin/all-leads
- **Todos los Vehículos**: http://localhost:3001/admin/all-vehicles
- **Todas las Ventas**: http://localhost:3001/admin/all-sales
- **Todas las Campañas**: http://localhost:3001/admin/all-campaigns
- **Todas las Promociones**: http://localhost:3001/admin/all-promotions
- **Todas las Integraciones**: http://localhost:3001/admin/all-integrations

### Configuración
- **Configuración General**: http://localhost:3001/admin/settings
- **Branding (Logo/Favicon)**: http://localhost:3001/admin/settings/branding
- **Logs del Sistema**: http://localhost:3001/admin/logs

## 🔧 Si Ves 404

1. Asegúrate de estar usando las rutas que empiezan con `/admin/`
2. La ruta principal `/` redirige a `/admin/global`
3. Todas las rutas del panel están en `src/app/admin/`

## ✅ Solución

Si estás viendo un 404, intenta acceder directamente a:
**http://localhost:3001/admin/global**





