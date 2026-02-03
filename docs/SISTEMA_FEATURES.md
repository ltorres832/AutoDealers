# Sistema de Features Ejecutables

## Descripción

El sistema de features es completamente ejecutable, sincronizable y editable desde el panel admin. Cada feature puede ser activada/desactivada y configurada para cada membresía, y se sincroniza automáticamente con todos los tenants que la usan.

## Features Disponibles

### Límites Numéricos
- `maxSellers`: Máximo de vendedores
- `maxInventory`: Máximo de vehículos en inventario
- `maxCampaigns`: Máximo de campañas
- `maxPromotions`: Máximo de promociones
- `maxLeadsPerMonth`: Máximo de leads por mes
- `maxAppointmentsPerMonth`: Máximo de citas por mes
- `maxStorageGB`: Almacenamiento máximo en GB
- `maxApiCallsPerMonth`: Llamadas API máximas por mes

### Features Booleanas

#### Dominios y Branding
- `customSubdomain`: Subdominio personalizado
- `customDomain`: Dominio propio (ej: midealer.com)
- `whiteLabel`: Sin branding AutoDealers
- `customBranding`: Branding completamente personalizado

#### Inteligencia Artificial
- `aiEnabled`: IA habilitada
- `aiAutoResponses`: Respuestas automáticas con IA
- `aiContentGeneration`: Generación de contenido con IA
- `aiLeadClassification`: Clasificación automática de leads

#### Redes Sociales
- `socialMediaEnabled`: Integración con redes sociales
- `socialMediaScheduling`: Programar posts
- `socialMediaAnalytics`: Analytics de redes sociales

#### Marketplace
- `marketplaceEnabled`: Acceso al marketplace
- `marketplaceFeatured`: Destacado en marketplace

#### Reportes y Analytics
- `advancedReports`: Reportes avanzados
- `customReports`: Reportes personalizados
- `exportData`: Exportar datos (CSV, Excel, PDF)
- `analyticsAdvanced`: Analytics avanzados
- `aBTesting`: Pruebas A/B

#### API e Integraciones
- `apiAccess`: Acceso a API REST
- `webhooks`: Webhooks personalizados
- `integrationsUnlimited`: Integraciones ilimitadas
- `customIntegrations`: Integraciones personalizadas

#### Marketing
- `emailMarketing`: Marketing por email
- `smsMarketing`: Marketing por SMS
- `whatsappMarketing`: Marketing por WhatsApp

#### CRM y Leads
- `crmAdvanced`: CRM avanzado con pipelines
- `leadScoring`: Scoring automático de leads
- `automationWorkflows`: Workflows automatizados

#### Contenido y Multimedia
- `videoUploads`: Subir videos
- `virtualTours`: Tours virtuales 360°
- `customTemplates`: Templates personalizados

#### Servicios Adicionales
- `liveChat`: Chat en vivo
- `appointmentScheduling`: Sistema de citas
- `paymentProcessing`: Procesamiento de pagos
- `inventorySync`: Sincronización de inventario
- `ssoEnabled`: Single Sign-On (SSO)
- `multiLanguage`: Múltiples idiomas
- `mobileApp`: App móvil
- `offlineMode`: Modo offline
- `dataBackup`: Backup automático
- `complianceTools`: Herramientas de cumplimiento
- `seoTools`: Herramientas SEO

#### Soporte
- `prioritySupport`: Soporte prioritario
- `dedicatedManager`: Gerente de cuenta dedicado
- `trainingSessions`: Sesiones de entrenamiento

## Uso del Sistema

### 1. Editar Features desde Admin

1. Ir a `/admin/memberships`
2. Hacer clic en "Editar Features" en la membresía deseada
3. Configurar todas las features (límites numéricos y features booleanas)
4. Guardar - las features se sincronizan automáticamente

### 2. Validar Features en Código

```typescript
import { canExecuteFeature } from '@autodealers/core';

// Verificar si puede ejecutar una acción
const check = await canExecuteFeature(tenantId, 'addVehicle');

if (!check.allowed) {
  return { error: check.reason };
}

// Proceder con la acción
```

### 3. Usar Middleware en Rutas API

```typescript
import { withFeatureValidation } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export const POST = withFeatureValidation(
  async (request: NextRequest) => {
    // Tu lógica aquí
    return NextResponse.json({ success: true });
  },
  'addVehicle', // Feature a validar
  verifyAuth // Función de autenticación
);
```

**Nota:** La forma más simple es validar manualmente:

```typescript
import { canExecuteFeature } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const check = await canExecuteFeature(auth.tenantId, 'addVehicle');
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  // Tu lógica aquí
  return NextResponse.json({ success: true });
}
```

### 4. Obtener Resumen de Features

```typescript
import { getTenantFeatureSummary } from '@autodealers/core';

const summary = await getTenantFeatureSummary(tenantId);
console.log(summary.features); // Todas las features
console.log(summary.usage); // Uso actual vs límites
```

## Sincronización Automática

Cuando se actualiza una membresía:

1. Se actualiza el documento de la membresía en Firestore
2. Se incrementa `syncVersion` para invalidar cachés
3. Se sincronizan las features con todos los tenants que usan esa membresía
4. Se actualiza el caché de features en cada tenant
5. Las nuevas features se aplican inmediatamente

## Caché de Features

El sistema usa caché para mejorar el rendimiento:

- Las features se cachean en el tenant por 1 hora
- Si la caché está desactualizada, se obtiene desde la membresía
- La caché se invalida automáticamente cuando se actualiza la membresía

## Registro de Uso

Todas las acciones se registran en `feature_usage` para:

- Tracking de uso
- Análisis de límites
- Auditoría
- Optimización de features

## Ejemplos de Validación

### Crear Vendedor
```typescript
const check = await canExecuteFeature(tenantId, 'createSeller');
if (!check.allowed) {
  // Mostrar: "Límite de vendedores alcanzado (10)"
}
```

### Subir Video
```typescript
const check = await canExecuteFeature(tenantId, 'uploadVideo');
if (!check.allowed) {
  // Mostrar: "La feature 'videoUploads' no está incluida en su membresía"
}
```

### Usar IA
```typescript
const check = await canExecuteFeature(tenantId, 'useAI');
if (!check.allowed) {
  // Mostrar: "La feature 'aiEnabled' no está incluida en su membresía"
}
```

## Notas Importantes

1. **Límites ilimitados**: Deja el campo vacío o `undefined` para ilimitado
2. **Sincronización en tiempo real**: Los cambios se aplican inmediatamente
3. **Validación automática**: El sistema valida antes de cada acción
4. **Tracking completo**: Todas las acciones se registran
5. **Caché inteligente**: Mejora el rendimiento sin sacrificar actualización

