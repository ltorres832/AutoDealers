# Modelos de Datos

## Estructura Principal

### Users (Usuarios)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dealer' | 'seller';
  tenantId: string; // Para dealers y sellers
  dealerId?: string; // Si es seller, referencia al dealer
  membershipId: string;
  membershipType: 'dealer' | 'seller';
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  settings: UserSettings;
}
```

### Tenants (Dealers/Vendedores)

```typescript
interface Tenant {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  subdomain?: string;
  domain?: string;
  branding: {
    logo?: string;
    favicon?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  settings: TenantSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Memberships (Membresías)

```typescript
interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    maxSellers?: number;
    maxInventory?: number;
    customSubdomain: boolean;
    aiEnabled: boolean;
    socialMediaEnabled: boolean;
    marketplaceEnabled: boolean;
    advancedReports: boolean;
  };
  stripePriceId: string;
  isActive: boolean;
  createdAt: Timestamp;
}
```

### Inventory (Inventario)

```typescript
interface Vehicle {
  id: string;
  tenantId: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage?: number;
  condition: 'new' | 'used' | 'certified';
  status: 'available' | 'reserved' | 'sold';
  description: string;
  photos: string[]; // URLs de Firebase Storage
  specifications: VehicleSpecs;
  vin?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  soldAt?: Timestamp;
}
```

### CRM - Leads

```typescript
interface Lead {
  id: string;
  tenantId: string;
  assignedTo?: string; // userId
  source: 'whatsapp' | 'facebook' | 'instagram' | 'web' | 'email' | 'sms' | 'phone';
  status: 'new' | 'contacted' | 'qualified' | 'appointment' | 'test_drive' | 'negotiation' | 'closed' | 'lost';
  contact: {
    name: string;
    email?: string;
    phone: string;
    preferredChannel: string;
  };
  interestedVehicles?: string[]; // vehicleIds
  notes: string;
  aiClassification?: {
    priority: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: string;
  };
  interactions: Interaction[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### CRM - Messages

```typescript
interface Message {
  id: string;
  tenantId: string;
  leadId?: string;
  channel: 'whatsapp' | 'facebook' | 'instagram' | 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  content: string;
  attachments?: string[];
  status: 'sent' | 'delivered' | 'read' | 'failed';
  aiGenerated: boolean;
  metadata: Record<string, any>;
  createdAt: Timestamp;
}
```

### CRM - Appointments

```typescript
interface Appointment {
  id: string;
  tenantId: string;
  leadId: string;
  assignedTo: string; // userId
  vehicleIds: string[];
  type: 'consultation' | 'test_drive' | 'delivery';
  scheduledAt: Timestamp;
  duration: number; // minutos
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  notes?: string;
  reminders: Reminder[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### CRM - Sales

```typescript
interface Sale {
  id: string;
  tenantId: string;
  leadId: string;
  vehicleId: string;
  sellerId: string;
  price: number;
  currency: string;
  commission?: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  documents: string[]; // URLs
  notes: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

### Post-Venta - Reminders

```typescript
interface PostSaleReminder {
  id: string;
  tenantId: string;
  saleId: string;
  customerId: string; // leadId
  vehicleId: string;
  type: 'oil_change' | 'filter' | 'tire_rotation' | 'custom';
  customType?: string;
  frequency: 'monthly' | '3_months' | '6_months' | 'manual';
  nextReminder: Timestamp;
  channels: ('email' | 'sms' | 'whatsapp')[];
  status: 'active' | 'completed' | 'cancelled';
  sentAt?: Timestamp;
  createdAt: Timestamp;
}
```

### Social Media - Posts

```typescript
interface SocialPost {
  id: string;
  tenantId: string;
  content: string;
  media: string[]; // URLs
  platforms: ('facebook' | 'instagram' | 'tiktok')[];
  scheduledFor?: Timestamp;
  publishedAt?: Timestamp;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  aiGenerated: boolean;
  metadata: {
    hashtags?: string[];
    mentions?: string[];
  };
  createdAt: Timestamp;
}
```

### Integrations

```typescript
interface Integration {
  id: string;
  tenantId: string;
  type: 'whatsapp' | 'facebook' | 'instagram' | 'stripe';
  status: 'active' | 'inactive' | 'error';
  credentials: Record<string, any>; // Encriptado
  settings: Record<string, any>;
  lastSync?: Timestamp;
  error?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Templates

```typescript
interface Template {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'message';
  role: 'admin' | 'dealer' | 'seller' | 'all';
  category: string;
  subject?: string;
  content: string;
  variables: string[]; // Variables disponibles
  isDefault: boolean;
  isEditable: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Billing - Subscriptions

```typescript
interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Logs - Audit

```typescript
interface AuditLog {
  id: string;
  tenantId?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}
```

## Índices de Firestore

### Leads
- `tenantId` + `status`
- `tenantId` + `assignedTo`
- `tenantId` + `createdAt` (desc)
- `tenantId` + `source`

### Messages
- `tenantId` + `channel` + `createdAt` (desc)
- `tenantId` + `leadId` + `createdAt` (desc)

### Appointments
- `tenantId` + `scheduledAt`
- `tenantId` + `assignedTo` + `scheduledAt`
- `tenantId` + `status` + `scheduledAt`

### Vehicles
- `tenantId` + `status`
- `tenantId` + `make` + `model`
- `tenantId` + `price` (range)





