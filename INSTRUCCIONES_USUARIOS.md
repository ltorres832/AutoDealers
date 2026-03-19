# ✅ Instrucciones para Crear Usuarios de Prueba

## 🚀 Método Rápido: Firebase Console

### Paso 1: Crear Usuarios en Authentication

1. Ve a: https://console.firebase.google.com/project/autodealers-7f62e/authentication/users
2. Haz clic en **"Add user"**
3. Crea cada usuario con estos datos:

| Email | Password | Display Name |
|-------|----------|--------------|
| admin@autodealers.test | Admin123! | Admin Usuario |
| dealer@autodealers.test | Dealer123! | Dealer Usuario |
| seller@autodealers.test | Seller123! | Seller Usuario |
| advertiser@autodealers.test | Advertiser123! | Advertiser Usuario |

**⚠️ IMPORTANTE:** Copia el **UID** de cada usuario después de crearlo (lo necesitarás en el paso 2).

### Paso 2: Crear Documentos en Firestore

1. Ve a: https://console.firebase.google.com/project/autodealers-7f62e/firestore/data
2. Selecciona la colección **"users"** (o créala si no existe)
3. Para cada usuario, crea un documento con **ID = UID del usuario** y estos campos:

#### Usuario Admin (ID = UID del usuario de Auth)
```json
{
  "id": "<PEGAR_UID_AQUI>",
  "email": "admin@autodealers.test",
  "name": "Admin Usuario",
  "role": "admin",
  "tenantId": null,
  "membershipId": "admin-membership",
  "membershipType": "dealer",
  "status": "active",
  "createdAt": "<TIMESTAMP_ACTUAL>",
  "updatedAt": "<TIMESTAMP_ACTUAL>"
}
```

#### Usuario Dealer (ID = UID del usuario de Auth)
```json
{
  "id": "<PEGAR_UID_AQUI>",
  "email": "dealer@autodealers.test",
  "name": "Dealer Usuario",
  "role": "dealer",
  "tenantId": "test-tenant-1",
  "membershipId": "dealer-membership",
  "membershipType": "dealer",
  "status": "active",
  "createdAt": "<TIMESTAMP_ACTUAL>",
  "updatedAt": "<TIMESTAMP_ACTUAL>"
}
```

#### Usuario Seller (ID = UID del usuario de Auth)
```json
{
  "id": "<PEGAR_UID_AQUI>",
  "email": "seller@autodealers.test",
  "name": "Seller Usuario",
  "role": "seller",
  "tenantId": "test-tenant-1",
  "membershipId": "seller-membership",
  "membershipType": "seller",
  "status": "active",
  "createdAt": "<TIMESTAMP_ACTUAL>",
  "updatedAt": "<TIMESTAMP_ACTUAL>"
}
```

#### Usuario Advertiser (ID = UID del usuario de Auth)
```json
{
  "id": "<PEGAR_UID_AQUI>",
  "email": "advertiser@autodealers.test",
  "name": "Advertiser Usuario",
  "role": "advertiser",
  "tenantId": null,
  "membershipId": "advertiser-membership",
  "membershipType": "dealer",
  "status": "active",
  "createdAt": "<TIMESTAMP_ACTUAL>",
  "updatedAt": "<TIMESTAMP_ACTUAL>"
}
```

## 📝 Resumen de Credenciales

Una vez creados los usuarios, puedes iniciar sesión en la app Flutter con:

- **Admin:** `admin@autodealers.test` / `Admin123!`
- **Dealer:** `dealer@autodealers.test` / `Dealer123!`
- **Seller:** `seller@autodealers.test` / `Seller123!`
- **Advertiser:** `advertiser@autodealers.test` / `Advertiser123!`
- **Public-Web:** No requiere login

## 🎯 Siguiente Paso

Una vez creados los usuarios, ejecuta la app Flutter:

```powershell
cd autodealers_flutter
flutter run -d chrome
```

Luego inicia sesión con cualquiera de los usuarios creados.


