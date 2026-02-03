# Permisos de Vendedores Creados por Dealers

## Resumen

Los vendedores creados por dealers son **usuarios subordinados (sub-users)** que comparten el tenant del dealer. **NO tienen su propio tenant ni subdominio**.

## Tipos de Vendedores

### 1. Vendedores Independientes
- Tienen su **propio tenant** y **subdominio** (si la membresía lo permite)
- Se registran directamente en la plataforma
- Tienen acceso completo a su propio dashboard y CRM
- Pueden tener su propia página web pública

### 2. Vendedores Creados por Dealers (Sub-Users)
- **Comparten el tenant del dealer**
- **NO tienen subdominio propio** (usan el del dealer)
- Se crean desde el dashboard del dealer
- Tienen permisos limitados según su rol

## Roles y Permisos de Sub-Users

### Manager (Gerente)
**Permisos:**
- ✅ Gestionar Leads
- ✅ Gestionar Inventario
- ✅ Gestionar Campañas
- ✅ Gestionar Mensajes
- ✅ Ver Reportes
- ❌ Gestionar Configuraciones

**Uso:** Para vendedores de confianza que necesitan acceso amplio pero no pueden cambiar configuraciones del sistema.

### Assistant (Asistente) - Por Defecto
**Permisos:**
- ✅ Gestionar Leads
- ✅ Gestionar Mensajes
- ✅ Ver Reportes
- ❌ Gestionar Inventario
- ❌ Gestionar Campañas
- ❌ Gestionar Configuraciones

**Uso:** Para vendedores regulares que necesitan trabajar con leads y comunicarse con clientes.

### Viewer (Solo Lectura)
**Permisos:**
- ✅ Ver Reportes
- ❌ Gestionar Leads
- ❌ Gestionar Inventario
- ❌ Gestionar Campañas
- ❌ Gestionar Mensajes
- ❌ Gestionar Configuraciones

**Uso:** Para personal que solo necesita ver estadísticas y reportes.

## Funcionalidades Disponibles

### Dashboard
- Ver estadísticas personales (sus leads, sus ventas)
- Ver citas asignadas
- Ver mensajes de sus leads

### CRM
- Ver y gestionar **solo los leads asignados a ellos**
- Actualizar estado de leads
- Agregar notas e interacciones
- Ver historial completo de leads

### Mensajería
- Responder mensajes de **sus leads asignados**
- Ver conversaciones de leads asignados
- Enviar mensajes por WhatsApp, Email, SMS

### Citas
- Ver **solo las citas asignadas a ellos**
- Actualizar estado de citas
- Ver detalles de citas

### Reportes
- Ver reportes personales (sus ventas, conversión)
- Ver estadísticas de sus leads
- Exportar reportes

### Ventas
- Registrar ventas de vehículos
- Ver historial de sus ventas
- Ver revenue generado

## Limitaciones

### ❌ NO Pueden:
1. **Gestionar Inventario** (a menos que sean Manager)
   - No pueden agregar, editar o eliminar vehículos
   - Solo pueden ver vehículos disponibles

2. **Gestionar Campañas** (a menos que sean Manager)
   - No pueden crear o editar campañas de publicidad
   - Solo pueden ver campañas activas

3. **Gestionar Configuraciones**
   - No pueden cambiar configuraciones del sistema
   - No pueden gestionar integraciones
   - No pueden cambiar auto-respuestas o FAQs

4. **Crear Otros Vendedores**
   - Solo el dealer puede crear vendedores

5. **Acceder a Datos de Otros Vendedores**
   - Solo ven sus propios leads, citas y ventas
   - El dealer puede ver todo

6. **Tener Subdominio Propio**
   - Comparten el subdominio del dealer
   - No tienen página web pública propia

## Gestión por el Dealer

El dealer puede:
- ✅ Crear vendedores con diferentes roles
- ✅ Activar/desactivar vendedores
- ✅ Ver estadísticas de todos los vendedores
- ✅ Ver todos los leads, citas y ventas
- ✅ Asignar leads a vendedores
- ✅ Ver reportes consolidados de todos los vendedores

## Sincronización

- Todos los datos se sincronizan en **tiempo real**
- Los leads asignados a un vendedor aparecen inmediatamente en su dashboard
- Las ventas registradas por un vendedor se reflejan en el dashboard del dealer
- Los mensajes se sincronizan automáticamente





