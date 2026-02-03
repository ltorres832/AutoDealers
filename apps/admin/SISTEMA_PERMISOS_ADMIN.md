# 👨‍💼 Sistema de Usuarios Admin con Permisos

## ✅ Implementado Completamente

---

## 🎯 Funcionalidades

### 1. **Gestión de Usuarios Admin**
- ✅ Crear nuevos usuarios admin
- ✅ Editar usuarios existentes
- ✅ Eliminar usuarios admin
- ✅ Activar/Desactivar usuarios
- ✅ Ver lista completa de admins
- ✅ Tracking de último acceso

### 2. **Sistema de Roles**

#### 👑 **Super Administrador**
- **Permisos**: TODOS
- **Puede**: Todo sin restricciones
- **Único que puede**: Crear otros Super Admins

#### ⚡ **Administrador**
- **Permisos**: Gestión completa (excepto crear otros admins)
- **Puede**:
  - Gestionar tenants
  - Crear/editar usuarios
  - Gestionar membresías
  - Crear templates
  - Ver reportes
  - Gestionar campañas
  - Ver configuración del sistema
- **No puede**: Crear/editar/eliminar usuarios admin

#### ✓ **Moderador**
- **Permisos**: Ver y moderar contenido
- **Puede**:
  - Ver dashboard
  - Ver tenants y usuarios
  - Editar templates
  - Ver logs y notificaciones
  - Ver reportes
  - Ver campañas e integraciones
- **No puede**: Crear o eliminar contenido

#### 👁️ **Visor**
- **Permisos**: Solo lectura
- **Puede**:
  - Ver dashboard
  - Ver tenants
  - Ver usuarios
  - Ver templates
  - Ver logs
  - Ver reportes
- **No puede**: Editar nada

---

## 📋 Permisos Disponibles (30+)

### Dashboard y Estadísticas
- `view_dashboard` - Ver panel principal
- `view_global_stats` - Ver estadísticas globales

### Tenants
- `view_tenants` - Ver tenants
- `create_tenants` - Crear tenants
- `edit_tenants` - Editar tenants
- `delete_tenants` - Eliminar tenants
- `manage_tenant_memberships` - Gestionar membresías de tenants

### Usuarios
- `view_users` - Ver usuarios
- `create_users` - Crear usuarios
- `edit_users` - Editar usuarios
- `delete_users` - Eliminar usuarios

### Usuarios Admin
- `view_admin_users` - Ver usuarios admin
- `create_admin_users` - Crear usuarios admin
- `edit_admin_users` - Editar usuarios admin
- `delete_admin_users` - Eliminar usuarios admin
- `manage_permissions` - Gestionar permisos

### Templates de Comunicación
- `view_templates` - Ver templates
- `create_templates` - Crear templates
- `edit_templates` - Editar templates
- `delete_templates` - Eliminar templates

### Logs y Notificaciones
- `view_logs` - Ver logs
- `view_notifications` - Ver notificaciones

### Membresías
- `view_memberships` - Ver membresías
- `create_memberships` - Crear membresías
- `edit_memberships` - Editar membresías
- `delete_memberships` - Eliminar membresías

### Reportes
- `view_reports` - Ver reportes
- `export_reports` - Exportar reportes

### Campañas y Promociones
- `view_campaigns` - Ver campañas
- `create_campaigns` - Crear campañas
- `edit_campaigns` - Editar campañas
- `delete_campaigns` - Eliminar campañas

### Integraciones
- `view_integrations` - Ver integraciones
- `manage_integrations` - Gestionar integraciones

### Configuración del Sistema
- `view_system_settings` - Ver configuración
- `edit_system_settings` - Editar configuración

### Super Admin
- `super_admin` - Acceso completo a TODO

---

## 🔐 Seguridad Implementada

### Protecciones
- ✅ **No auto-eliminación**: Un admin no puede eliminarse a sí mismo
- ✅ **No auto-desactivación**: No puede desactivarse a sí mismo
- ✅ **Jerarquía de roles**: Solo Super Admin puede crear otros Super Admins
- ✅ **Verificación de permisos**: Cada acción verifica permisos
- ✅ **Firebase Auth + Firestore**: Doble capa de seguridad
- ✅ **Custom Claims**: Permisos en el token JWT

### Validaciones API
- ✅ Token de autenticación requerido
- ✅ Rol admin requerido
- ✅ Permisos específicos verificados por acción
- ✅ Errores descriptivos (403 si no tiene permiso)

---

## 📍 Ubicación en el Sistema

### En el Menú Lateral:
```
📊 Vista Global
📈 Reportes
👥 Usuarios
👨‍💼 Usuarios Admin  ← NUEVO
🏢 Tenants
💳 Membresías
...
```

### URL Directa:
```
http://localhost:3001/admin/admin-users
```

---

## 🚀 Cómo Usar

### 1. **Crear un Usuario Admin**
1. Ve a "👨‍💼 Usuarios Admin" en el menú
2. Click en "➕ Crear Usuario Admin"
3. Llena el formulario:
   - Nombre completo
   - Email
   - Contraseña (mín 8 caracteres)
   - Rol
4. Click en "Crear Usuario"

### 2. **Editar un Usuario**
1. En la lista de usuarios, click en "Editar"
2. Modifica:
   - Nombre
   - Rol
   - Estado (activo/inactivo)
3. Click en "Guardar Cambios"

### 3. **Desactivar un Usuario**
1. Click en el badge de estado (✓ Activo / ✗ Inactivo)
2. Confirma la acción
3. El usuario no podrá iniciar sesión

### 4. **Eliminar un Usuario**
1. Click en "Eliminar" (botón rojo)
2. Confirma la acción
3. El usuario se elimina de Firebase Auth y Firestore

---

## 📊 Datos Mostrados

Por cada usuario:
- **Nombre y Email**
- **Rol** (con ícono y color distintivo)
- **Estado** (Activo/Inactivo) - clickeable para cambiar
- **Último Acceso** (fecha y hora)
- **Cantidad de Permisos**
- **Acciones** (Editar / Eliminar)

---

## 🔮 Próximas Mejoras (Opcionales)

### 1. **Permisos Personalizados**
```typescript
// Permitir agregar permisos adicionales a un rol
customPermissions: ['view_special_reports', 'export_sensitive_data']
```

### 2. **Historial de Acciones**
```typescript
// Log de todas las acciones realizadas por cada admin
{
  action: 'deleted_tenant',
  userId: 'admin123',
  timestamp: '2024-12-27T...',
  details: { tenantId: 'xyz' }
}
```

### 3. **Notificaciones de Seguridad**
```typescript
// Alertar cuando:
- Se crea un nuevo Super Admin
- Se cambian permisos críticos
- Múltiples intentos de acceso fallidos
```

### 4. **Autenticación de Dos Factores (2FA)**
```typescript
// Requerir 2FA para Super Admins
- Google Authenticator
- SMS
- Email
```

### 5. **Sesiones Activas**
```typescript
// Ver y gestionar sesiones abiertas
- Listar dispositivos/IPs activas
- Cerrar sesiones remotamente
- Limitar sesiones concurrentes
```

---

## 🛠️ Archivos Creados

### Backend (packages/core)
- `admin-permissions.ts` - Definición de permisos y roles
- `admin-users-management.ts` - CRUD de usuarios admin

### API Routes (apps/admin)
- `/api/admin/admin-users/route.ts` - GET (listar) y POST (crear)
- `/api/admin/admin-users/[id]/route.ts` - GET, PUT, DELETE

### Frontend (apps/admin)
- `/admin/admin-users/page.tsx` - Interfaz completa
- Modales: CreateUserModal, EditUserModal

### Documentación
- `SISTEMA_PERMISOS_ADMIN.md` - Este archivo

---

## ✅ Estado

**COMPLETADO E IMPLEMENTADO**

Puedes empezar a usar el sistema inmediatamente:
1. Inicia sesión como admin
2. Ve a "Usuarios Admin" en el menú
3. Crea tu primer usuario admin con permisos específicos

---

## 📞 Soporte

Si necesitas:
- Agregar más permisos
- Crear nuevos roles
- Implementar las mejoras opcionales
- Personalizar el sistema

Solo avisa y lo implemento de inmediato.


