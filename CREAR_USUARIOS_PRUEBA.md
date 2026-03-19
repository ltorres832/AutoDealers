# 👥 Crear Usuarios de Prueba para las 5 Apps

## Script para Crear Usuarios

Ejecuta este script en la consola de Firebase o en Cloud Functions para crear usuarios de prueba:

```javascript
// Script para crear usuarios de prueba en Firestore
const admin = require('firebase-admin');

// Inicializar Firebase Admin (si no está inicializado)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function createTestUsers() {
  const users = [
    // Admin User
    {
      email: 'admin@autodealers.test',
      password: 'Admin123!',
      role: 'admin',
      name: 'Admin Usuario',
      tenantId: null,
      membershipId: 'admin-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    // Dealer User
    {
      email: 'dealer@autodealers.test',
      password: 'Dealer123!',
      role: 'dealer',
      name: 'Dealer Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'dealer-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    // Seller User
    {
      email: 'seller@autodealers.test',
      password: 'Seller123!',
      role: 'seller',
      name: 'Seller Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'seller-membership',
      membershipType: 'seller',
      status: 'active',
    },
    // Advertiser User
    {
      email: 'advertiser@autodealers.test',
      password: 'Advertiser123!',
      role: 'advertiser',
      name: 'Advertiser Usuario',
      tenantId: null,
      membershipId: 'advertiser-membership',
      membershipType: 'dealer',
      status: 'active',
    },
  ];

  for (const userData of users) {
    try {
      // Crear usuario en Firebase Auth
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
      });

      // Crear documento en Firestore
      await db.collection('users').doc(userRecord.uid).set({
        id: userRecord.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenantId: userData.tenantId,
        membershipId: userData.membershipId,
        membershipType: userData.membershipType,
        status: userData.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Error al crear usuario ${userData.email}:`, error);
    }
  }

  console.log('\n✅ Todos los usuarios de prueba han sido creados');
}

// Ejecutar
createTestUsers();
```

## Usuarios Creados

### 1. Admin App
- **Email:** `admin@autodealers.test`
- **Password:** `Admin123!`
- **Rol:** `admin`
- **Acceso:** Panel de administración completo

### 2. Dealer App
- **Email:** `dealer@autodealers.test`
- **Password:** `Dealer123!`
- **Rol:** `dealer`
- **Tenant ID:** `test-tenant-1`
- **Acceso:** Panel de concesionario

### 3. Seller App
- **Email:** `seller@autodealers.test`
- **Password:** `Seller123!`
- **Rol:** `seller`
- **Tenant ID:** `test-tenant-1`
- **Acceso:** Panel de vendedor

### 4. Advertiser App
- **Email:** `advertiser@autodealers.test`
- **Password:** `Advertiser123!`
- **Rol:** `advertiser`
- **Acceso:** Panel de anunciante

### 5. Public-Web App
- **No requiere login** - Acceso público
- **Rutas:** `/public/*` o `/`

## Cómo Usar

1. Ejecuta el script en Firebase Console o Cloud Functions
2. Inicia sesión en la app Flutter con cada usuario
3. Cada usuario será redirigido automáticamente a su dashboard correspondiente

## Notas

- Los usuarios se crean en Firebase Auth y Firestore
- Asegúrate de que el tenant `test-tenant-1` exista en Firestore
- Puedes modificar los datos según tus necesidades


