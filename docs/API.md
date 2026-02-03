# API Documentation

## Autenticación

Todas las rutas API requieren autenticación mediante JWT token de Firebase.

### Headers requeridos
```
Authorization: Bearer <firebase-jwt-token>
Content-Type: application/json
```

## Endpoints

### Usuarios

#### GET /api/users
Obtiene lista de usuarios (solo admin)

**Query params:**
- `tenantId` (opcional): Filtrar por tenant

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "admin" | "dealer" | "seller",
      "tenantId": "string",
      "status": "active" | "suspended" | "cancelled"
    }
  ]
}
```

#### POST /api/users
Crea un nuevo usuario (solo admin)

**Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "role": "dealer" | "seller",
  "tenantId": "string",
  "dealerId": "string" // opcional, si es seller
}
```

### Leads

#### GET /api/leads
Obtiene leads del tenant

**Query params:**
- `status` (opcional): Filtrar por estado
- `assignedTo` (opcional): Filtrar por vendedor
- `source` (opcional): Filtrar por fuente

**Response:**
```json
{
  "leads": [
    {
      "id": "string",
      "tenantId": "string",
      "source": "whatsapp" | "facebook" | "instagram" | "web" | "email" | "sms" | "phone",
      "status": "new" | "contacted" | "qualified" | "appointment" | "test_drive" | "negotiation" | "closed" | "lost",
      "contact": {
        "name": "string",
        "email": "string",
        "phone": "string"
      },
      "createdAt": "ISO8601"
    }
  ]
}
```

#### POST /api/leads
Crea un nuevo lead

**Body:**
```json
{
  "source": "string",
  "contact": {
    "name": "string",
    "phone": "string",
    "email": "string" // opcional
  },
  "notes": "string" // opcional
}
```

#### PATCH /api/leads/:id
Actualiza un lead

**Body:**
```json
{
  "status": "string", // opcional
  "assignedTo": "string", // opcional
  "notes": "string" // opcional
}
```

### Mensajes

#### GET /api/messages
Obtiene mensajes

**Query params:**
- `leadId` (opcional): Filtrar por lead
- `channel` (opcional): Filtrar por canal

#### POST /api/messages
Envía un mensaje

**Body:**
```json
{
  "leadId": "string",
  "channel": "whatsapp" | "facebook" | "instagram" | "email" | "sms",
  "content": "string",
  "to": "string"
}
```

### Vehículos

#### GET /api/vehicles
Obtiene vehículos del inventario

**Query params:**
- `status` (opcional): available | reserved | sold
- `make` (opcional): Marca
- `minPrice` (opcional): Precio mínimo
- `maxPrice` (opcional): Precio máximo

#### POST /api/vehicles
Crea un nuevo vehículo

**Body:**
```json
{
  "make": "string",
  "model": "string",
  "year": "number",
  "price": "number",
  "currency": "string",
  "condition": "new" | "used" | "certified",
  "description": "string",
  "specifications": {}
}
```

### Citas

#### GET /api/appointments
Obtiene citas

**Query params:**
- `leadId` (opcional)
- `assignedTo` (opcional)
- `startDate` (opcional)
- `endDate` (opcional)

#### POST /api/appointments
Crea una nueva cita

**Body:**
```json
{
  "leadId": "string",
  "assignedTo": "string",
  "vehicleIds": ["string"],
  "type": "consultation" | "test_drive" | "delivery",
  "scheduledAt": "ISO8601",
  "duration": "number", // minutos
  "location": "string" // opcional
}
```

### Suscripciones

#### GET /api/subscriptions
Obtiene suscripciones (admin o propia)

#### POST /api/subscriptions
Crea una nueva suscripción

**Body:**
```json
{
  "membershipId": "string",
  "paymentMethodId": "string" // Stripe payment method
}
```

#### DELETE /api/subscriptions/:id
Cancela una suscripción

### Webhooks

#### POST /api/webhooks/stripe
Webhook de Stripe

#### POST /api/webhooks/whatsapp
Webhook de WhatsApp

#### POST /api/webhooks/facebook
Webhook de Facebook Messenger

## Códigos de Estado

- `200`: Éxito
- `201`: Creado
- `400`: Error de validación
- `401`: No autenticado
- `403`: Sin permisos
- `404`: No encontrado
- `500`: Error del servidor

## Errores

Formato de error:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {} // opcional
  }
}
```





