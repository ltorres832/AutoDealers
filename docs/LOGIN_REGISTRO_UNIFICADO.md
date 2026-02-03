# Login y Registro Unificado

## ✅ Implementación Completa

### Funcionalidad

Sistema unificado de login y registro que funciona para **todos los tipos de usuarios** (Admin, Dealer, Seller). El sistema detecta automáticamente el rol del usuario y redirige a la aplicación correspondiente.

## Características Implementadas

### 1. Registro Unificado (`/register`)

**Paso 1: Selección de Tipo de Cuenta**
- El usuario puede elegir entre:
  - **Dealer:** Para empresas o individuos con inventario propio
  - **Vendedor:** Para vendedores individuales
- Cada opción muestra las características principales

**Paso 2: Selección de Membresía**
- Se muestran solo las membresías disponibles para el tipo seleccionado
- Cada membresía muestra:
  - Precio y ciclo de facturación
  - Features incluidas (subdominio, IA, redes sociales, etc.)
  - Límites (inventario, vendedores)

**Paso 3: Formulario de Registro**
- Nombre completo
- Email
- Teléfono
- Contraseña y confirmación
- Subdominio (si la membresía lo permite)
  - Validación en tiempo real
  - Vista previa: `subdominio.autodealers.com`

### 2. Login Unificado (`/login`)

**Características:**
- ✅ **Una sola página** para todos los tipos de usuarios
- ✅ **Detección automática** del rol del usuario
- ✅ **Redirección inteligente** según el rol:
  - Admin → `/admin/dashboard` (o admin.autodealers.com)
  - Dealer → `/dealer/dashboard` (o app.autodealers.com)
  - Seller → `/seller/dashboard` (o seller.autodealers.com)
- ✅ Autenticación con Firebase Auth
- ✅ Manejo de tokens seguros
- ✅ Validación de estado de cuenta (activa/suspendida)

### 3. Flujo de Autenticación

```
Usuario ingresa credenciales
    ↓
Firebase Auth valida email/password
    ↓
Se obtiene token de autenticación
    ↓
Se consulta Firestore para obtener rol del usuario
    ↓
Se guarda token en cookie segura
    ↓
Sistema redirige según el rol:
  - admin → Panel Admin
  - dealer → Dashboard Dealer
  - seller → Dashboard Seller
```

### 4. APIs Implementadas

#### Registro
- `POST /api/public/register/dealer` - Registro de dealers
- `POST /api/public/register/seller` - Registro de vendedores
- `GET /api/public/memberships?type=dealer|seller` - Obtener membresías

#### Autenticación
- `POST /api/auth/login` - Login (usado internamente)
- `POST /api/auth/set-token` - Guardar token en cookie

### 5. Configuración de Redirección

El sistema usa variables de entorno para las URLs de redirección:

```env
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_DEALER_URL=http://localhost:3002
NEXT_PUBLIC_SELLER_URL=http://localhost:3003
```

Si no están definidas, usa los puertos por defecto:
- Admin: puerto 3001
- Dealer: puerto 3002
- Seller: puerto 3003

### 6. Seguridad

- ✅ **Tokens seguros:** Se guardan en cookies httpOnly
- ✅ **Validación de estado:** Solo usuarios activos pueden iniciar sesión
- ✅ **Firebase Auth:** Autenticación robusta y segura
- ✅ **HTTPS en producción:** Cookies seguras solo en producción

### 7. Archivos Creados/Modificados

#### Frontend:
- `apps/public-web/src/app/register/page.tsx` - Página de registro (3 pasos)
- `apps/public-web/src/app/login/page.tsx` - Página de login unificado
- `apps/public-web/src/lib/auth-client.ts` - Cliente de autenticación
- `apps/public-web/src/lib/firebase-config.ts` - Configuración de Firebase

#### Backend:
- `apps/public-web/src/app/api/public/register/dealer/route.ts` - API registro dealers
- `apps/public-web/src/app/api/public/register/seller/route.ts` - API registro sellers (ya existía)
- `apps/public-web/src/app/api/public/memberships/route.ts` - API membresías (actualizada)
- `apps/public-web/src/app/api/auth/login/route.ts` - API login
- `apps/public-web/src/app/api/auth/set-token/route.ts` - API para guardar token

### 8. Ejemplo de Uso

#### Registro de Dealer:
```
1. Usuario va a /register
2. Selecciona "Dealer"
3. Selecciona membresía "Dealer Pro"
4. Completa formulario con subdominio "mi-concesionario"
5. Sistema crea:
   - Tenant tipo 'dealer'
   - Usuario con rol 'dealer'
   - Subdominio: mi-concesionario.autodealers.com
6. Redirige a /login
```

#### Login:
```
1. Usuario ingresa email y password
2. Sistema autentica con Firebase
3. Obtiene rol del usuario de Firestore
4. Redirige:
   - Si es admin → http://localhost:3001/admin/dashboard
   - Si es dealer → http://localhost:3002/dashboard
   - Si es seller → http://localhost:3003/dashboard
```

### 9. Variables de Entorno Requeridas

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# URLs de redirección (opcionales)
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_DEALER_URL=http://localhost:3002
NEXT_PUBLIC_SELLER_URL=http://localhost:3003
```

### 10. Próximos Pasos (Opcional)

- [ ] Implementar "Olvidé mi contraseña"
- [ ] Verificación de email
- [ ] Autenticación de dos factores
- [ ] Recordar sesión
- [ ] Logout desde todas las aplicaciones
- [ ] Integración completa con Stripe durante el registro





