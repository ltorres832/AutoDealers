# Registro de Vendedores Independientes

## ✅ Implementación Completa

### Funcionalidad

Los vendedores independientes ahora pueden registrarse directamente en la plataforma sin necesidad de ser creados por un dealer.

## Características Implementadas

### 1. Página de Registro Público

**Ubicación:** `/register`

**Características:**
- ✅ **Selección de membresía:** El vendedor puede elegir entre los planes disponibles
- ✅ **Información clara:** Se muestran todas las features de cada membresía
- ✅ **Validación de subdominio:** Si la membresía permite subdominio, se solicita durante el registro
- ✅ **Validación en tiempo real:** Se valida formato y disponibilidad del subdominio
- ✅ **Diseño responsive:** Funciona perfectamente en móvil y desktop

### 2. Proceso de Registro

#### Paso 1: Selección de Membresía
- El vendedor ve todas las membresías disponibles (tipo 'seller')
- Puede ver las features de cada plan:
  - Subdominio personalizado
  - IA habilitada
  - Redes sociales
  - Reportes avanzados
  - Límites de inventario
- Selecciona el plan que mejor se adapte a sus necesidades

#### Paso 2: Información Personal
- Nombre completo
- Email
- Teléfono
- Contraseña y confirmación
- Subdominio (si la membresía lo permite)
  - Se valida formato automáticamente
  - Se verifica disponibilidad
  - Vista previa: `subdominio.autodealers.com`

### 3. Validaciones Automáticas

El sistema valida automáticamente:

- ✅ **Email único:** No se puede registrar con un email ya existente
- ✅ **Subdominio único:** Si se proporciona subdominio, debe estar disponible
- ✅ **Formato de subdominio:** Solo letras minúsculas, números y guiones
- ✅ **Contraseña segura:** Mínimo 6 caracteres
- ✅ **Membresía válida:** Solo se aceptan membresías tipo 'seller' y activas
- ✅ **Feature de subdominio:** Si se proporciona subdominio, la membresía debe permitirlo

### 4. Creación Automática

Cuando un vendedor se registra exitosamente, el sistema crea automáticamente:

1. **Tenant (Tenant):**
   - Tipo: 'seller'
   - Subdominio (si aplica)
   - Membresía asociada
   - Estado: 'active'
   - Branding por defecto

2. **Usuario (User):**
   - Rol: 'seller'
   - Tenant ID asociado
   - Membresía asociada
   - Estado: 'active'
   - Credenciales de acceso

3. **Página Web Pública:**
   - Si tiene subdominio, automáticamente tiene su página web en `subdominio.autodealers.com`
   - Puede personalizar branding desde su dashboard

### 5. Flujo Completo

```
Vendedor accede a /register
    ↓
Ve lista de membresías disponibles
    ↓
Selecciona membresía
    ↓
Completa formulario (con subdominio si aplica)
    ↓
Sistema valida:
  - Email único
  - Subdominio disponible (si aplica)
  - Membresía válida
  - Formato correcto
    ↓
Se crea:
  - Tenant
  - Usuario
  - Suscripción (TODO: Integrar con Stripe)
    ↓
Redirige a /login con mensaje de éxito
    ↓
Vendedor inicia sesión
    ↓
Accede a su dashboard personal
```

### 6. Integración con Stripe (Pendiente)

**Nota:** La creación de suscripción en Stripe está marcada como TODO. Se debe implementar:

1. Crear customer en Stripe
2. Crear subscription con el `stripePriceId` de la membresía
3. Guardar información de suscripción en Firestore
4. Configurar webhook para eventos de Stripe

### 7. Página de Login

**Ubicación:** `/login`

**Características:**
- ✅ Login para vendedores independientes
- ✅ Mensaje de éxito si viene de registro
- ✅ Enlace a registro si no tiene cuenta
- ✅ Validación de credenciales

### 8. Archivos Creados

#### Frontend:
- `apps/public-web/src/app/register/page.tsx` - Página de registro
- `apps/public-web/src/app/login/page.tsx` - Página de login

#### Backend:
- `apps/public-web/src/app/api/public/memberships/route.ts` - API para obtener membresías públicas
- `apps/public-web/src/app/api/public/register/seller/route.ts` - API para registro de vendedores

#### Core:
- Actualizado `packages/core/src/tenants.ts` - Soporte para `membershipId` en `createTenant`

### 9. Ejemplo de Uso

```typescript
// El vendedor accede a /register
// Selecciona "Vendedor Pro" (que incluye subdominio)
// Completa:
{
  name: "Juan Vendedor",
  email: "juan@example.com",
  password: "password123",
  subdomain: "juan-autos",
  phone: "+1234567890",
  membershipId: "membership-id"
}

// Sistema crea:
// - Tenant con subdomain: "juan-autos"
// - Usuario con rol: "seller"
// - Página web: juan-autos.autodealers.com
// - Dashboard personal disponible
```

### 10. Diferencias con Vendedores Creados por Dealers

| Aspecto | Vendedor Independiente | Vendedor Creado por Dealer |
|---------|------------------------|---------------------------|
| **Registro** | Público (/register) | Creado por dealer |
| **Tenant** | Propio | Puede ser propio o compartido |
| **Subdominio** | Según membresía | Puede ser propio si dealer permite |
| **Membresía** | Selecciona durante registro | Hereda del dealer o puede tener propia |
| **Página Web** | Propia (si tiene subdominio) | Propia o compartida con dealer |
| **Autonomía** | Total | Depende del dealer |

### 11. Próximos Pasos (Opcional)

- [ ] Integrar Stripe para pagos automáticos
- [ ] Email de bienvenida al registrarse
- [ ] Verificación de email
- [ ] Onboarding guiado para nuevos vendedores
- [ ] Opción de periodo de prueba
- [ ] Página de precios mejorada





