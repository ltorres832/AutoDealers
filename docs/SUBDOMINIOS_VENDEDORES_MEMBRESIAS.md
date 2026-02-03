# Subdominios para Vendedores y Sistema de Membresías

## ✅ Implementación Completa

### 1. Subdominios para Vendedores Creados por Dealers

**Funcionalidad:** Los dealers ahora pueden crear vendedores con su propio tenant y subdominio.

#### Características:
- ✅ **Opción al crear vendedor:** El dealer puede elegir si el vendedor comparte el tenant o tiene su propio tenant
- ✅ **Subdominio propio:** Si se selecciona, el vendedor obtiene su propio subdominio (ej: `vendedor1.autodealers.com`)
- ✅ **Validación automática:** 
  - Verifica que la membresía del dealer permita crear subdominios (`customSubdomain: true`)
  - Valida que el subdominio no esté en uso
  - Valida formato del subdominio (solo letras minúsculas, números y guiones)
- ✅ **Página web propia:** El vendedor con tenant propio tiene su propia página web pública
- ✅ **Gestión unificada:** El dealer puede ver y gestionar todos sus vendedores (con o sin tenant propio)

#### Cómo funciona:
1. El dealer va a "Vendedores" en su dashboard
2. Hace clic en "Agregar Vendedor"
3. Completa el formulario y marca la opción "Crear tenant propio con subdominio"
4. Ingresa el subdominio deseado
5. El sistema valida automáticamente:
   - Si la membresía permite subdominios
   - Si el subdominio está disponible
   - Si el formato es válido
6. Si todo es correcto, se crea:
   - Un nuevo tenant para el vendedor
   - Un usuario con acceso a ese tenant
   - Una página web pública en el subdominio

### 2. Sistema de Membresías Completo

**Funcionalidad:** Sistema completo de gestión de membresías con validación automática de features.

#### Características Implementadas:

##### A. Gestión desde Admin Panel
- ✅ **Crear membresías:** El admin puede crear nuevas membresías con todas las features
- ✅ **Editar membresías:** El admin puede editar cualquier aspecto de una membresía
- ✅ **Ver todas las membresías:** Lista completa con contador de tenants usando cada plan
- ✅ **Configurar features:** 
  - Subdominio personalizado
  - IA habilitada
  - Redes sociales
  - Marketplace
  - Reportes avanzados
  - Límites de vendedores
  - Límites de inventario

##### B. Validación Automática de Features
El sistema detecta automáticamente qué features tiene cada membresía y valida antes de permitir acciones:

- ✅ **Crear vendedores:** Valida límite `maxSellers`
- ✅ **Agregar vehículos:** Valida límite `maxInventory`
- ✅ **Usar subdominios:** Valida feature `customSubdomain`
- ✅ **Usar IA:** Valida feature `aiEnabled`
- ✅ **Usar redes sociales:** Valida feature `socialMediaEnabled`
- ✅ **Usar marketplace:** Valida feature `marketplaceEnabled`
- ✅ **Ver reportes avanzados:** Valida feature `advancedReports`

##### C. Sincronización en Tiempo Real
- ✅ **Cambios inmediatos:** Cuando el admin modifica una membresía, los cambios se reflejan inmediatamente
- ✅ **Validación en cada acción:** Cada vez que un usuario intenta realizar una acción, el sistema valida su membresía
- ✅ **Mensajes claros:** Si una acción no está permitida, se muestra un mensaje explicando por qué

#### Funciones de Validación:

```typescript
// Verificar si un tenant tiene una feature
await tenantHasFeature(tenantId, 'customSubdomain');

// Verificar si puede realizar una acción
const validation = await canPerformAction(tenantId, 'createSeller');
if (!validation.allowed) {
  // Mostrar error: validation.reason
}

// Obtener todas las features disponibles
const features = await getTenantFeatures(tenantId);
```

#### Integración en APIs:

Todas las APIs relevantes ahora validan automáticamente:

- **Crear vendedor:** Valida límite de vendedores
- **Crear vehículo:** Valida límite de inventario
- **Crear campaña:** Valida feature de redes sociales
- **Usar subdominio:** Valida feature de subdominio

### 3. Estructura de Datos

#### Membresía (Membership):
```typescript
{
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    maxSellers?: number;        // Límite de vendedores (undefined = sin límite)
    maxInventory?: number;       // Límite de inventario (undefined = sin límite)
    customSubdomain: boolean;    // Permite subdominio personalizado
    aiEnabled: boolean;          // Permite usar IA
    socialMediaEnabled: boolean; // Permite redes sociales
    marketplaceEnabled: boolean;  // Permite marketplace
    advancedReports: boolean;    // Permite reportes avanzados
  };
  stripePriceId: string;
  isActive: boolean;
  createdAt: Date;
}
```

#### Tenant:
```typescript
{
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  subdomain?: string;
  membershipId?: string;  // ID de la membresía activa
  status: 'active' | 'suspended' | 'cancelled';
  // ... otros campos
}
```

### 4. Flujo de Validación

```
Usuario intenta acción
    ↓
Sistema obtiene tenant del usuario
    ↓
Sistema obtiene membresía del tenant
    ↓
Sistema valida feature/límite requerido
    ↓
¿Permitido?
    ├─ Sí → Ejecuta acción
    └─ No → Retorna error con razón
```

### 5. Ejemplos de Uso

#### Ejemplo 1: Dealer crea vendedor con subdominio
```typescript
// El dealer marca "createOwnTenant: true" y proporciona "subdomain"
const seller = await createSubUser(dealerTenantId, dealerUserId, {
  email: 'vendedor@example.com',
  password: 'password123',
  name: 'Juan Vendedor',
  role: 'assistant',
  createOwnTenant: true,
  subdomain: 'juan-vendedor'
});

// Resultado:
// - Se crea un nuevo tenant para el vendedor
// - El vendedor tiene acceso a: juan-vendedor.autodealers.com
// - El dealer puede ver y gestionar este vendedor
```

#### Ejemplo 2: Validación automática al crear vehículo
```typescript
// En la API de crear vehículo
const validation = await canPerformAction(tenantId, 'addVehicle');
if (!validation.allowed) {
  return NextResponse.json(
    { error: validation.reason }, // "Límite de inventario alcanzado (50)"
    { status: 403 }
  );
}
// Continuar con la creación...
```

### 6. Archivos Modificados/Creados

#### Nuevos Archivos:
- `packages/core/src/membership-validation.ts` - Validación automática de membresías
- `apps/dealer/src/app/api/sellers/check-permissions/route.ts` - Verificar permisos de subdominio
- `apps/admin/src/app/api/admin/memberships/[id]/route.ts` - API para editar membresías

#### Archivos Modificados:
- `packages/core/src/sub-users.ts` - Soporte para crear vendedores con tenant propio
- `packages/core/src/tenants.ts` - Soporte para `membershipId` y `status`
- `packages/core/src/types.ts` - Actualizado `Tenant` interface
- `packages/billing/src/memberships.ts` - Agregada función `getMemberships()`
- `apps/dealer/src/app/sellers/page.tsx` - UI para crear vendedores con subdominio
- `apps/dealer/src/app/api/sellers/route.ts` - Validación de límites y subdominios
- `apps/dealer/src/app/api/vehicles/route.ts` - Validación de límite de inventario
- `apps/dealer/src/app/api/campaigns/route.ts` - Validación de feature de redes sociales
- `apps/admin/src/app/admin/memberships/page.tsx` - UI completa para gestionar membresías
- `apps/admin/src/app/api/admin/memberships/route.ts` - API completa para membresías

### 7. Próximos Pasos (Opcional)

- [ ] Implementar sincronización en tiempo real con Firestore listeners
- [ ] Agregar notificaciones cuando se alcanzan límites
- [ ] Dashboard de uso de features para dealers
- [ ] Historial de cambios de membresías
- [ ] Upgrade/downgrade automático de membresías





