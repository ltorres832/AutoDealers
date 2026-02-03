# ✅ Panel Administrativo - Servidor Activo

## 🎉 Estado: SERVIDOR INICIADO

El servidor de desarrollo del Panel Administrativo está **corriendo**.

## 🌐 Acceso al Panel

Abre tu navegador y ve a:

### **http://localhost:3001**

## 🎯 Rutas Principales del Panel

### Dashboard y Administración
- **Vista Global**: http://localhost:3001/admin/global
- **Dashboard**: http://localhost:3001/dashboard

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

### Configuración
- **Configuración General**: http://localhost:3001/admin/settings
- **Branding (Logo/Favicon)**: http://localhost:3001/admin/settings/branding
- **Integraciones**: http://localhost:3001/admin/all-integrations
- **Logs del Sistema**: http://localhost:3001/admin/logs

## 🎨 Características Disponibles

✅ **Sidebar Profesional**
- Logo personalizable
- Navegación con 12 secciones
- Colapsable/Expandible
- Estados activos visuales

✅ **Vista Global**
- Estadísticas en tiempo real
- Cards con métricas clave
- Acciones rápidas

✅ **Branding Personalizado**
- Subir logo personalizado
- Subir favicon personalizado
- Vista previa antes de guardar

✅ **Diseño Responsive**
- Adaptable a todos los dispositivos
- Scrollbars personalizados
- Animaciones suaves

## 🔐 Autenticación

Para acceder al panel, necesitas:
1. Un usuario con rol `admin` en Firebase
2. Credenciales válidas

### Si no tienes usuario admin:
Ejecuta el script de inicialización desde la raíz:
```bash
node scripts/init-admin.js
```

## 📊 Funcionalidades

- ✅ Gestión completa de usuarios
- ✅ Gestión de tenants (dealers/vendedores)
- ✅ Gestión de membresías y planes
- ✅ Vista global de leads, vehículos y ventas
- ✅ Gestión de campañas y promociones
- ✅ Configuración de integraciones
- ✅ Logs y auditoría del sistema
- ✅ Branding personalizable

## 🛠️ Comandos Útiles

### Detener el servidor
Presiona `Ctrl+C` en la terminal donde está corriendo

### Reiniciar el servidor
```bash
cd apps/admin
npm run dev
```

### Ver logs
Los logs aparecen en la terminal donde ejecutaste `npm run dev`

## 📝 Notas

- El servidor se recarga automáticamente al hacer cambios (Hot Reload)
- Los cambios se reflejan inmediatamente en el navegador
- El puerto 3001 debe estar libre para que funcione

## 🎉 ¡Listo para Usar!

El panel está completamente funcional y listo para:
1. Explorar todas las secciones
2. Personalizar el branding
3. Gestionar usuarios, tenants y membresías
4. Ver estadísticas globales
5. Configurar integraciones

---

**¡Disfruta del Panel Administrativo!** 🚀





