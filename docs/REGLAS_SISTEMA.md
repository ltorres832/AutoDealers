# Reglas Críticas del Sistema

## Principios Fundamentales

### 1. Todo pasa por el CRM

**Regla absoluta:** Cualquier interacción, lead, mensaje, cita o venta DEBE registrarse en el CRM central.

- ✅ Todos los mensajes entrantes → CRM
- ✅ Todos los leads de cualquier fuente → CRM
- ✅ Todas las citas → CRM
- ✅ Todas las ventas → CRM
- ✅ Todas las interacciones → CRM

**Excepciones:** Ninguna.

### 2. Todo es controlado por el Admin

El Administrador Supremo tiene control total sobre:

- ✅ Creación y gestión de usuarios
- ✅ Creación y modificación de membresías
- ✅ Acceso a todos los CRMs (solo lectura para dealers de sus vendedores)
- ✅ Configuración de integraciones
- ✅ Gestión de templates
- ✅ Configuración de IA
- ✅ Logs y auditoría

**Limitaciones:**
- Dealers NO pueden ver redes sociales privadas de vendedores
- Dealers solo ven CRM de sus vendedores (no configuraciones privadas)

### 3. Nada se ejecuta sin permisos

**Validación obligatoria en cada acción:**

1. Verificar autenticación
2. Verificar rol
3. Verificar permisos específicos
4. Verificar acceso al tenant (si aplica)
5. Registrar en logs de auditoría

**Ejemplo de flujo:**
```
Request → Middleware Auth → Verificar Rol → Verificar Permisos → Verificar Tenant → Ejecutar → Log
```

## Reglas por Módulo

### CRM

1. **Unicidad de leads:** Un contacto puede tener múltiples leads, pero cada lead es único
2. **Historial completo:** Todas las interacciones se registran con timestamp y usuario
3. **Estados válidos:** Solo transiciones de estado permitidas (new → contacted → qualified → ...)
4. **Asignación:** Un lead solo puede estar asignado a un vendedor a la vez

### Mensajería

1. **Unificación:** Todos los canales convergen en el CRM
2. **Respuestas:** Solo desde el CRM, nunca directamente desde APIs externas
3. **IA:** Puede responder automáticamente, pero debe notificar al usuario
4. **Historial:** Todas las conversaciones se guardan permanentemente

### Inventario

1. **Sincronización:** Cambios en inventario se reflejan automáticamente en web pública
2. **Estados:** Solo transiciones válidas (available → reserved → sold)
3. **Fotos:** Máximo 20 fotos por vehículo
4. **Precios:** No pueden ser negativos o cero

### Citas

1. **Disponibilidad:** No se pueden crear citas en horarios ocupados
2. **Notificaciones:** Siempre enviar confirmación al crear/cancelar
3. **Recordatorios:** Enviar 24h y 1h antes de la cita
4. **Asignación:** Debe tener vendedor y vehículo(s) asignados

### Recordatorios Post-Venta

1. **Creación automática:** Se crean al cerrar una venta
2. **Frecuencias:** Respetar frecuencias configuradas
3. **Canales:** Enviar por todos los canales configurados
4. **Historial:** Registrar cada envío

### Membresías

1. **Beneficios automáticos:** Se detectan automáticamente según membresía
2. **Upgrade/Downgrade:** Permitir cambios, aplicar al siguiente ciclo
3. **Límites:** Validar límites antes de permitir acciones (ej: max sellers)
4. **Suspensión:** Automática si pago falla

### Subdominios

1. **Unicidad:** Cada subdominio es único en todo el sistema
2. **Validación:** Solo caracteres alfanuméricos y guiones
3. **Membresía:** Requiere membresía con feature `customSubdomain: true`
4. **Branding:** Logo y colores personalizables según membresía

### IA

1. **Asistencia, no autonomía:** IA asiste, no actúa sin supervisión
2. **Notificaciones:** Siempre notificar cuando IA actúa
3. **Aprobación:** Respuestas críticas requieren aprobación (configurable)
4. **Registro:** Todas las acciones de IA se registran

### Seguridad

1. **Multi-tenant:** Aislamiento estricto por tenantId
2. **Roles:** Validación en cada endpoint
3. **Auditoría:** Todas las acciones críticas se registran
4. **Encriptación:** Credenciales de integraciones encriptadas
5. **Rate limiting:** Por tenant y por usuario

### Facturación

1. **Ciclo:** Cobro automático cada 30 días
2. **Cancelación:** Permitir hasta 7 días antes del próximo cobro
3. **Suspensión:** Automática si pago falla 3 veces consecutivas
4. **Webhooks:** Procesar todos los eventos de Stripe

## Validaciones Obligatorias

### En cada endpoint API:

```typescript
// 1. Autenticación
if (!user) throw new Error('Unauthorized');

// 2. Rol
if (!hasRole(user, requiredRole)) throw new Error('Forbidden');

// 3. Permisos
if (!hasPermission(user.role, permission)) throw new Error('Forbidden');

// 4. Tenant (si aplica)
if (!hasTenantAccess(user, tenantId)) throw new Error('Forbidden');

// 5. Validación de datos
validateInput(data);

// 6. Ejecutar acción
const result = await executeAction(data);

// 7. Log
await logAction(user.id, action, result);
```

## Excepciones y Casos Especiales

### Admin Supremo
- Acceso a TODO sin restricciones de tenant
- Puede ver y modificar cualquier dato
- Logs especiales para acciones de admin

### Dealers y Vendedores
- Acceso solo a su propio tenant
- Dealers pueden ver CRM de vendedores asociados
- Vendedores NO pueden ver datos de otros vendedores

### Integraciones
- Credenciales encriptadas en Firestore
- Rotación periódica de tokens
- Fallbacks si integración falla

## Monitoreo y Alertas

### Eventos que requieren alerta inmediata:

1. Fallo de pago de suscripción
2. Error crítico en integración
3. Intento de acceso no autorizado
4. Error en webhook de Stripe
5. Fallo en envío de mensaje crítico

### Métricas a monitorear:

1. Tasa de conversión de leads
2. Tiempo de respuesta de API
3. Uso de recursos por tenant
4. Errores por módulo
5. Actividad de IA

## Cumplimiento

Estas reglas son **absolutas** y deben cumplirse en:

- ✅ Código backend
- ✅ Validaciones de frontend
- ✅ Reglas de Firestore
- ✅ Middleware
- ✅ Tests

**Ninguna excepción sin aprobación explícita del equipo técnico.**





