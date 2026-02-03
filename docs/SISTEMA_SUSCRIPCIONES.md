# Sistema de Gestión de Suscripciones y Facturación Automática

## Descripción

Sistema completo para gestionar suscripciones, facturación automática, suspensión por falta de pago y comunicaciones automáticas.

## Características Principales

### 📋 Gestión de Suscripciones
- Vista completa de todas las suscripciones con estados
- Filtros por estado (activa, atrasada, suspendida, cancelada)
- Estadísticas en tiempo real
- Detalles de cada suscripción

### 💳 Facturación Automática
- Cobro automático cada 30 días mediante Stripe
- Webhooks para manejar eventos de pago
- Actualización automática de estados

### ⏸️ Suspensión Automática
- Si el pago pasa de 7 días, la cuenta se suspende automáticamente
- El tenant se marca como `suspended`
- Notificaciones automáticas al usuario

### 🔄 Reactivación Automática
- Cuando se procesa un pago exitoso, la cuenta se reactiva automáticamente
- El tenant vuelve a estado `active`
- Notificación de reactivación al usuario

### 📧 Sistema de Templates de Comunicación
- Templates editables para Email, SMS y WhatsApp
- Templates por defecto del sistema
- Variables dinámicas ({{userName}}, {{amount}}, etc.)
- Envío automático según eventos

## Estados de Suscripción

- **active**: Suscripción activa y pagada
- **past_due**: Pago vencido pero aún no suspendido
- **suspended**: Cuenta suspendida por falta de pago (>7 días)
- **cancelled**: Suscripción cancelada
- **trialing**: Período de prueba
- **unpaid**: Sin pagar
- **incomplete**: Pago incompleto
- **incomplete_expired**: Pago incompleto expirado

## Flujo de Facturación

1. **Cobro Automático (Día 0)**
   - Stripe intenta cobrar automáticamente
   - Si es exitoso: Estado `active`, notificación de pago exitoso
   - Si falla: Estado `past_due`, notificación de pago fallido

2. **Recordatorios (Días 3 y 5)**
   - Si sigue en `past_due`, se envían recordatorios
   - SMS y WhatsApp automáticos

3. **Suspensión (Día 7+)**
   - Si pasan más de 7 días sin pago, se suspende automáticamente
   - Estado cambia a `suspended`
   - Tenant se marca como suspendido
   - Notificación de suspensión

4. **Reactivación (Al pagar)**
   - Cuando se procesa un pago exitoso
   - Estado vuelve a `active`
   - Tenant se reactiva automáticamente
   - Notificación de reactivación

## Sistema de Templates

### Eventos Disponibles
- `subscription_created` - Suscripción creada
- `payment_success` - Pago exitoso
- `payment_failed` - Pago fallido
- `payment_reminder_3days` - Recordatorio a los 3 días
- `payment_reminder_5days` - Recordatorio a los 5 días
- `account_suspended` - Cuenta suspendida
- `account_reactivated` - Cuenta reactivada
- `subscription_cancelled` - Suscripción cancelada
- `trial_ending` - Prueba terminando
- `invoice_generated` - Factura generada
- `custom` - Personalizado

### Variables Disponibles
- `{{userName}}` - Nombre del usuario
- `{{userEmail}}` - Email del usuario
- `{{tenantName}}` - Nombre del tenant
- `{{membershipName}}` - Nombre de la membresía
- `{{amount}}` - Monto del pago
- `{{currency}}` - Moneda
- `{{periodStart}}` - Inicio del período
- `{{periodEnd}}` - Fin del período
- `{{daysPastDue}}` - Días de atraso
- `{{days}}` - Días (para recordatorios)

## Uso

### Ver Suscripciones
1. Ve a `/admin/subscriptions`
2. Usa los filtros para ver suscripciones por estado
3. Revisa las estadísticas en la parte superior

### Gestionar Templates
1. Ve a `/admin/communication-templates`
2. Haz clic en "Inicializar Templates por Defecto" para crear los templates básicos
3. Crea nuevos templates o edita los existentes
4. Los templates se usarán automáticamente según el evento

### Procesar Suscripciones Vencidas
- Ejecuta manualmente: `POST /api/admin/cron/process-overdue`
- O configura un cron job para ejecutarlo diariamente

### Webhooks de Stripe
- Configura el webhook en Stripe apuntando a: `/api/webhooks/stripe`
- Eventos manejados:
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## Configuración

### Variables de Entorno
```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=tu_secret_para_cron
```

### Cron Job (Opcional)
Configura un cron job diario para procesar suscripciones vencidas:
```bash
# Ejecutar diariamente a las 2 AM
0 2 * * * curl -X POST https://tu-dominio.com/api/admin/cron/process-overdue -H "Authorization: Bearer $CRON_SECRET"
```

## Notas Importantes

- Las suscripciones se cobran automáticamente cada 30 días
- Después de 7 días sin pago, la cuenta se suspende automáticamente
- Al pagar, la cuenta se reactiva automáticamente
- Los templates se envían automáticamente según el evento
- Todos los envíos se registran en `communication_logs` para auditoría





