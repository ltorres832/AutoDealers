# Crear Usuarios de Prueba en Firebase

## Opción 1: Usar Firebase Console (Más Fácil)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto: **autodealers-7f62e**
3. Ve a **Authentication** > **Users**
4. Haz clic en **Add user** y crea cada usuario:

### Usuario Admin
- **Email:** `admin@autodealers.test`
- **Password:** `Admin123!`
- **Display Name:** `Admin Usuario`

Luego en **Firestore** > **Data** > **users**, crea un documento con ID = UID del usuario:
```json
{
  "id": "<UID_DEL_USUARIO>",
  "email": "admin@autodealers.test",
  "name": "Admin Usuario",
  "role": "admin",
  "tenantId": null,
  "membershipId": "admin-membership",
  "membershipType": "dealer",
  "status": "active",
  "createdAt": "<TIMESTAMP>",
  "updatedAt": "<TIMESTAMP>"
}
```

### Usuario Dealer
- **Email:** `dealer@autodealers.test`
- **Password:** `Dealer123!`
- **Display Name:** `Dealer Usuario`

Documento en Firestore:
```json
{
  "id": "<UID_DEL_USUARIO>",
  "email": "dealer@autodealers.test",
  "name": "Dealer Usuario",
  "role": "dealer",
  "tenantId": "test-tenant-1",
  "membershipId": "dealer-membership",
  "membershipType": "dealer",
  "status": "active",
  "createdAt": "<TIMESTAMP>",
  "updatedAt": "<TIMESTAMP>"
}
```

### Usuario Seller
- **Email:** `seller@autodealers.test`
- **Password:** `Seller123!`
- **Display Name:** `Seller Usuario`

Documento en Firestore:
```json
{
  "id": "<UID_DEL_USUARIO>",
  "email": "seller@autodealers.test",
  "name": "Seller Usuario",
  "role": "seller",
  "tenantId": "test-tenant-1",
  "membershipId": "seller-membership",
  "membershipType": "seller",
  "status": "active",
  "createdAt": "<TIMESTAMP>",
  "updatedAt": "<TIMESTAMP>"
}
```

### Usuario Advertiser
- **Email:** `advertiser@autodealers.test`
- **Password:** `Advertiser123!`
- **Display Name:** `Advertiser Usuario`

Documento en Firestore:
```json
{
  "id": "<UID_DEL_USUARIO>",
  "email": "advertiser@autodealers.test",
  "name": "Advertiser Usuario",
  "role": "advertiser",
  "tenantId": null,
  "membershipId": "advertiser-membership",
  "membershipType": "dealer",
  "status": "active",
  "createdAt": "<TIMESTAMP>",
  "updatedAt": "<TIMESTAMP>"
}
```

## Opción 2: Usar Firebase CLI con Script

Ejecuta desde la raíz del proyecto:

```powershell
cd functions
node crear-usuarios-directo.js
```

## Opción 3: Usar Cloud Function

Una vez desplegada la Cloud Function `createTestUsers`, ejecuta:

```powershell
firebase functions:call createTestUsers --data '{}'
```

**Nota:** Requiere que tengas permisos de admin en Firebase.

## Resumen de Usuarios

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@autodealers.test | Admin123! |
| Dealer | dealer@autodealers.test | Dealer123! |
| Seller | seller@autodealers.test | Seller123! |
| Advertiser | advertiser@autodealers.test | Advertiser123! |
| Public-Web | No requiere login | - |


